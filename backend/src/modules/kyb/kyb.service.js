// Service KYB TIKEXO
const path = require('path');
const fs = require('fs');
const prisma = require('../../config/database');
const { logger } = require('../../middlewares/errorHandler');
const { envoyerEmail } = require('../../utils/email');
const { kybApprouve, kybRejete } = require('../../utils/emailTemplates');
const { creerOtp } = require('../../utils/otp');
const { envoyerOtpSms } = require('../../config/sms');

const DOCS_OBLIGATOIRES = ['CARTE_NIF', 'EXTRAIT_RCCM', 'PIECE_IDENTITE_DIRIGEANT'];
const TAILLE_MAX_DEFAUT = 10 * 1024 * 1024; // 10 Mo
const TAILLE_MAX_STATUTS = 20 * 1024 * 1024; // 20 Mo
const FORMATS_ACCEPTES = ['image/jpeg', 'image/png', 'application/pdf'];

async function obtenirOuCreerDossier(entrepriseId) {
  let dossier = await prisma.kybDossier.findUnique({
    where: { entreprise_id: entrepriseId },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
  });

  if (!dossier) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    dossier = await prisma.kybDossier.create({
      data: {
        entreprise_id: entrepriseId,
        kyb_deadline: deadline,
      },
      include: { documents: true },
    });
  }

  return dossier;
}

async function getDossier(entrepriseId) {
  const dossier = await obtenirOuCreerDossier(entrepriseId);
  const maintenant = new Date();
  const msRestants = new Date(dossier.kyb_deadline).getTime() - maintenant.getTime();
  const joursRestants = Math.max(0, Math.ceil(msRestants / (1000 * 60 * 60 * 24)));

  // Un seul doc actif par type (le plus récent non remplacé)
  const docsActifs = {};
  for (const doc of dossier.documents) {
    if (!docsActifs[doc.type] || doc.createdAt > docsActifs[doc.type].createdAt) {
      docsActifs[doc.type] = doc;
    }
  }

  const nbObligatoiresUpload = DOCS_OBLIGATOIRES.filter((t) => docsActifs[t]).length;
  const nbObligatoiresValides = DOCS_OBLIGATOIRES.filter(
    (t) => docsActifs[t]?.statut === 'VALIDE'
  ).length;

  const fonctionnalites = {
    rechargement_max: dossier.statut === 'VALIDE' ? null : 500000,
    exports_actifs: dossier.statut === 'VALIDE',
    mutations_actives: dossier.statut === 'VALIDE',
    factures_actives: dossier.statut === 'VALIDE',
    kyb_valide: dossier.statut === 'VALIDE',
  };

  return {
    ...dossier,
    docs_actifs: docsActifs,
    jours_restants: joursRestants,
    progression: `${nbObligatoiresUpload}/3`,
    nb_obligatoires_upload: nbObligatoiresUpload,
    nb_obligatoires_valides: nbObligatoiresValides,
    deadline_depassee: joursRestants === 0 && dossier.statut !== 'VALIDE',
    fonctionnalites,
  };
}

async function enregistrerDocument(entrepriseId, { type, fichier_url, fichier_nom, fichier_taille, fichier_format, cloudinary_id }) {
  const dossier = await obtenirOuCreerDossier(entrepriseId);

  // Vérifier si un doc du même type existe déjà EN_ATTENTE → incrémenter version
  const docExistant = await prisma.kybDocument.findFirst({
    where: { dossier_id: dossier.id, type, statut: 'EN_ATTENTE' },
    orderBy: { version: 'desc' },
  });

  const version = docExistant ? docExistant.version + 1 : 1;

  const doc = await prisma.kybDocument.create({
    data: {
      dossier_id: dossier.id,
      type,
      fichier_url,
      fichier_nom,
      fichier_taille,
      fichier_format,
      cloudinary_id: cloudinary_id || null,
      version,
      remplace_id: docExistant?.id || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'KYB_DOCUMENT_UPLOADE',
      entite: 'KybDocument',
      entite_id: doc.id,
      apres: { type, fichier_nom, version },
    },
  });

  // Recalculer le statut du dossier
  const tousLesDocs = await prisma.kybDocument.findMany({
    where: { dossier_id: dossier.id },
    orderBy: { createdAt: 'desc' },
  });

  // Docs actifs par type (le plus récent)
  const docsActifs = {};
  for (const d of tousLesDocs) {
    if (!docsActifs[d.type] || d.createdAt > docsActifs[d.type].createdAt) {
      docsActifs[d.type] = d;
    }
  }

  const tousObligatoiresUpload = DOCS_OBLIGATOIRES.every((t) => docsActifs[t]);

  let nouveauStatut = 'EN_COURS';
  if (tousObligatoiresUpload) {
    nouveauStatut = 'EN_REVUE';
    logger.info('TIKEXO — Dossier KYB EN_REVUE', { entrepriseId });
  }

  if (dossier.statut !== 'VALIDE' && dossier.statut !== nouveauStatut) {
    await prisma.$executeRaw`
      UPDATE "KybDossier"
      SET statut = ${nouveauStatut}::"StatutKyb",
          soumis_at = CASE WHEN ${nouveauStatut} = 'EN_REVUE' THEN NOW() ELSE soumis_at END,
          "updatedAt" = NOW()
      WHERE id = ${dossier.id}
    `;
  }

  return getDossier(entrepriseId);
}

async function validerDocument(adminId, documentId) {
  const doc = await prisma.kybDocument.findUniqueOrThrow({ where: { id: documentId } });

  await prisma.$executeRaw`
    UPDATE "KybDocument"
    SET statut = 'VALIDE'::"StatutKybDocument",
        valide_par = ${adminId},
        valide_at = NOW()
    WHERE id = ${documentId}
  `;

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'KYB_DOCUMENT_VALIDE',
      entite: 'KybDocument',
      entite_id: documentId,
    },
  });

  // Vérifier si tous les docs obligatoires sont validés
  const dossier = await prisma.kybDossier.findUniqueOrThrow({
    where: { id: doc.dossier_id },
    include: { documents: true },
  });

  const docsActifs = {};
  for (const d of dossier.documents) {
    if (!docsActifs[d.type] || d.createdAt > docsActifs[d.type].createdAt) {
      docsActifs[d.type] = d;
    }
  }

  // Inclure le doc qu'on vient de valider
  docsActifs[doc.type] = { ...doc, statut: 'VALIDE' };

  const tousValides = DOCS_OBLIGATOIRES.every((t) => docsActifs[t]?.statut === 'VALIDE');

  if (tousValides) {
    await validerDossierComplet(adminId, dossier);
  }

  return getDossier(dossier.entreprise_id);
}

async function validerDossierComplet(adminId, dossier) {
  await prisma.$executeRaw`
    UPDATE "KybDossier"
    SET statut = 'VALIDE'::"StatutKyb",
        valide_at = NOW(),
        valide_par = ${adminId},
        "updatedAt" = NOW()
    WHERE id = ${dossier.id}
  `;

  await prisma.$executeRaw`
    UPDATE "Entreprise"
    SET kyb_valide = true, "updatedAt" = NOW()
    WHERE id = ${dossier.entreprise_id}
  `;

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'KYB_DOSSIER_VALIDE',
      entite: 'KybDossier',
      entite_id: dossier.id,
      apres: { entreprise_id: dossier.entreprise_id },
    },
  });

  // Activer tous les admins RH de l'entreprise (statut INACTIF → ACTIF)
  const ent = await prisma.entreprise.findUnique({
    where: { id: dossier.entreprise_id },
    select: {
      nom: true,
      email_rh: true,
      telephone_rh: true,
      admins: {
        select: { user: { select: { id: true, prenom: true, nom: true, telephone: true, statut: true } } },
      },
    },
  });

  if (ent?.admins?.length > 0) {
    const adminIds = ent.admins.map((a) => a.user.id);
    await prisma.user.updateMany({
      where: { id: { in: adminIds }, statut: 'INACTIF' },
      data: { statut: 'ACTIF' },
    });

    // Envoyer un OTP par SMS à chaque admin pour qu'il puisse se connecter
    for (const { user: u } of ent.admins) {
      try {
        const otpCode = await creerOtp(prisma, u.telephone);
        await envoyerOtpSms(u.telephone, otpCode);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`TIKEXO KYB VALIDE OTP [DEV] ${u.telephone}: ${otpCode}`);
        }
      } catch (err) {
        logger.warn('TIKEXO — SMS credentials KYB échoué', { err: err.message, tel: u.telephone });
      }
    }
  }

  // Email de confirmation avec instructions de connexion
  if (ent?.email_rh) {
    const contact = ent.admins[0]?.user;
    const nomContact = contact ? `${contact.prenom} ${contact.nom}` : ent.nom;
    const telephone = contact?.telephone || ent.telephone_rh;
    envoyerEmail({ to: ent.email_rh, subject: 'Votre KYB est approuvé — Activez votre accès RH', ...kybApprouve(ent.nom, nomContact, telephone) })
      .catch((err) => logger.warn('TIKEXO — Mail KYB approuvé échoué', { err: err.message }));
  }

  logger.info('TIKEXO — KYB validé, compte activé', { entrepriseId: dossier.entreprise_id, adminId });
}

async function rejeterDocument(adminId, documentId, motif) {
  if (!motif || motif.trim().length < 20) {
    const err = new Error('Le motif de rejet doit contenir au moins 20 caractères');
    err.statusCode = 400;
    err.code = 'MOTIF_TROP_COURT';
    throw err;
  }

  const doc = await prisma.kybDocument.findUniqueOrThrow({ where: { id: documentId } });

  await prisma.$executeRaw`
    UPDATE "KybDocument"
    SET statut = 'REJETE'::"StatutKybDocument",
        motif_rejet = ${motif.trim()},
        rejete_par = ${adminId},
        rejete_at = NOW()
    WHERE id = ${documentId}
  `;

  const dossier = await prisma.kybDossier.findUniqueOrThrow({ where: { id: doc.dossier_id } });

  await prisma.$executeRaw`
    UPDATE "KybDossier"
    SET statut = 'REJETE'::"StatutKyb",
        rejete_at = NOW(),
        rejete_par = ${adminId},
        "updatedAt" = NOW()
    WHERE id = ${dossier.id}
  `;

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'KYB_DOCUMENT_REJETE',
      entite: 'KybDocument',
      entite_id: documentId,
      apres: { motif, type: doc.type },
    },
  });

  // Notifier l'employeur par email (non bloquant)
  const ent = await prisma.entreprise.findUnique({
    where: { id: dossier.entreprise_id },
    select: { nom: true, email_rh: true, admins: { select: { user: { select: { prenom: true, nom: true } } }, take: 1 } },
  });
  if (ent?.email_rh) {
    const contact = ent.admins[0]?.user;
    const nomContact = contact ? `${contact.prenom} ${contact.nom}` : ent.nom;
    envoyerEmail({ to: ent.email_rh, subject: 'TIKEXO — Documents KYB à compléter', ...kybRejete(ent.nom, nomContact, motif) })
      .catch((err) => logger.warn('TIKEXO — Mail KYB rejeté échoué', { err: err.message }));
  }

  logger.warn('TIKEXO — Document KYB rejeté', { documentId, motif, adminId });

  return getDossier(dossier.entreprise_id);
}

async function listerDossiers(filtres = {}) {
  const { statut, page = 1, limit = 20 } = filtres;
  const where = {};
  if (statut) where.statut = statut;

  const [total, items] = await Promise.all([
    prisma.kybDossier.count({ where }),
    prisma.kybDossier.findMany({
      where,
      include: {
        entreprise: { select: { id: true, nom: true, nif: true, rccm: true } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [
        // EN_REVUE en premier
        { statut: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: parseInt(limit),
    }),
  ]);

  return { items, total, page: parseInt(page), totalPages: Math.ceil(total / limit) };
}

async function validerGlobal(adminId, dossierId) {
  const dossier = await prisma.kybDossier.findUniqueOrThrow({
    where: { id: dossierId },
    include: { documents: { orderBy: { createdAt: 'desc' } } },
  });

  // Valider tous les docs obligatoires EN_ATTENTE
  const docsActifs = {};
  for (const d of dossier.documents) {
    if (!docsActifs[d.type] || d.createdAt > docsActifs[d.type].createdAt) {
      docsActifs[d.type] = d;
    }
  }

  for (const type of DOCS_OBLIGATOIRES) {
    const doc = docsActifs[type];
    if (doc && doc.statut === 'EN_ATTENTE') {
      await prisma.$executeRaw`
        UPDATE "KybDocument"
        SET statut = 'VALIDE'::"StatutKybDocument",
            valide_par = ${adminId},
            valide_at = NOW()
        WHERE id = ${doc.id}
      `;
    }
  }

  await validerDossierComplet(adminId, dossier);

  return getDossier(dossier.entreprise_id);
}

module.exports = {
  getDossier,
  enregistrerDocument,
  validerDocument,
  rejeterDocument,
  listerDossiers,
  validerGlobal,
  DOCS_OBLIGATOIRES,
  TAILLE_MAX_DEFAUT,
  TAILLE_MAX_STATUTS,
  FORMATS_ACCEPTES,
};
