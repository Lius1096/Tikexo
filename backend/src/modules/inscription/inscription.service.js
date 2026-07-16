// Service inscription TIKEXO — point d'entrée public
const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { logger } = require('../../middlewares/errorHandler');
const { envoyerEmail } = require('../../utils/email');
const { inscriptionEntrepriseConfirmee } = require('../../utils/emailTemplates');
const { normaliserTelephone, validerTelephone } = require('../../utils/telephone');

async function creerDossierKyb(prisma, entrepriseId) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  return prisma.kybDossier.create({
    data: { entreprise_id: entrepriseId, kyb_deadline: deadline },
  });
}

// Grille de frais de gestion mensuel selon le nombre de salariés couverts
// La commission sur transactions est fixe : 5 % côté bénéficiaire + 5 % côté commerçant
function calculerFraisGestion(nbEmployes) {
  const n = parseInt(nbEmployes, 10) || 0;
  if (n <= 50)  return { frais: 5000,      plan: 'PME_S', label: 'PME · S' };
  if (n <= 200) return { frais: 25000,     plan: 'PME_M', label: 'PME · M' };
  if (n <= 500) return { frais: 200 * n,   plan: 'ETI',   label: 'ETI' };
  return              { frais: 350 * n,   plan: 'GE',    label: 'Grandes Entreprises' };
}

const TAUX_COMMISSION_TRANSACTION = 5.00; // appliqué côté benef ET côté commercant

async function inscrire({ entreprise: e, admin: a }) {
  // Normaliser et valider le téléphone
  a.telephone = normaliserTelephone(a.telephone);
  if (!validerTelephone(a.telephone)) {
    const err = new Error('Numéro de téléphone invalide — format attendu : +229 01 XX XX XX XX');
    err.statusCode = 400;
    err.code = 'TELEPHONE_INVALIDE';
    throw err;
  }

  // Email requis (identifiant de connexion)
  const email = a.email_rh?.trim()?.toLowerCase();
  if (!email || !email.includes('@')) {
    const err = new Error('Adresse email invalide — elle servira d\'identifiant de connexion');
    err.statusCode = 400;
    err.code = 'EMAIL_INVALIDE';
    throw err;
  }

  // Mot de passe requis (min 8 caractères)
  if (!a.mot_de_passe || a.mot_de_passe.length < 8) {
    const err = new Error('Le mot de passe doit contenir au moins 8 caractères');
    err.statusCode = 400;
    err.code = 'MOT_DE_PASSE_TROP_COURT';
    throw err;
  }

  // Vérifier unicité NIF
  const nifExiste = await prisma.entreprise.findUnique({ where: { nif: e.nif } });
  if (nifExiste) {
    const err = new Error('Ce NIF est déjà enregistré sur TIKEXO');
    err.statusCode = 409;
    err.code = 'NIF_DEJA_EXISTANT';
    throw err;
  }

  // Vérifier unicité email
  const emailExiste = await prisma.user.findFirst({ where: { email_perso: email } });
  if (emailExiste) {
    const err = new Error('Cette adresse email est déjà associée à un compte TIKEXO');
    err.statusCode = 409;
    err.code = 'EMAIL_DEJA_EXISTANT';
    throw err;
  }

  // Vérifier unicité téléphone
  const telExiste = await prisma.user.findUnique({ where: { telephone: a.telephone } });
  if (telExiste) {
    const err = new Error('Ce numéro de téléphone est déjà associé à un compte TIKEXO');
    err.statusCode = 409;
    err.code = 'TELEPHONE_DEJA_EXISTANT';
    throw err;
  }

  const motDePasseHash = await bcrypt.hash(a.mot_de_passe, 12);

  const nbSalaries = parseInt(e.nb_salaries, 10) || 0;
  const { frais: fraisMensuel, plan: planLabel, label: planNom } = calculerFraisGestion(nbSalaries);

  const dotationMax = e.dotation_max ? parseFloat(e.dotation_max) : null;
  const montantMaxWallet = e.montant_max_wallet ? parseFloat(e.montant_max_wallet) : null;

  // Transaction : entreprise + wallet + user + lien
  const { entreprise: ent, user } = await prisma.$transaction(async (tx) => {
    const entreprise = await tx.entreprise.create({
      data: {
        nom: e.nom,
        nif: e.nif,
        rccm: e.rccm || null,
        secteur: e.secteur || null,
        adresse: e.adresse || null,
        ville: e.ville || 'Cotonou',
        telephone_rh: a.telephone,
        email_rh: a.email_rh || null,
        plan: planLabel,
        nb_employes: String(nbSalaries) || null,
        frais_mensuel: fraisMensuel,
        dotation_max: dotationMax,
        montant_max_wallet: montantMaxWallet,
        taux_commission_defaut: TAUX_COMMISSION_TRANSACTION,
        statut: 'EN_ATTENTE',
      },
    });

    await tx.wallet.create({
      data: {
        entreprise_id: entreprise.id,
        type: 'ENTREPRISE',
        currency: 'XOF',
      },
    });

    const newUser = await tx.user.create({
      data: {
        telephone: a.telephone,
        nom: a.nom,
        prenom: a.prenom,
        email_perso: email,
        email_pro: email,
        mot_de_passe_hash: motDePasseHash,
        role: 'ADMIN_RH',
        statut: 'INACTIF',
      },
    });

    await tx.entrepriseAdmin.create({
      data: {
        entreprise_id: entreprise.id,
        user_id: newUser.id,
        role: 'ADMIN_RH',
      },
    });

    // Wallet personnel (pour recevoir des dotations repas en tant que Directeur)
    await tx.wallet.create({
      data: {
        user_id: newUser.id,
        type: 'BENEFICIAIRE',
        currency: 'XOF',
      },
    });

    // Lien bénéficiaire : l'admin est aussi un employé Directeur
    await tx.lienEntrepriseBeneficiaire.create({
      data: {
        entreprise_id: entreprise.id,
        user_id: newUser.id,
        niveau: 'DIRECTEUR',
        allocation_mensuelle: dotationMax || 15000,
        statut: 'ACTIF',
      },
    });

    await tx.auditLog.create({
      data: {
        user_id: newUser.id,
        action: 'INSCRIPTION',
        entite: 'Entreprise',
        entite_id: entreprise.id,
        apres: { nom: entreprise.nom, nif: entreprise.nif, plan: planLabel },
      },
    });

    return { entreprise, user: newUser };
  });

  // Créer le dossier KYB (deadline J+7)
  await creerDossierKyb(prisma, ent.id);

  // Email de confirmation
  envoyerEmail({
    to: email,
    ...inscriptionEntrepriseConfirmee(ent.nom, `${a.prenom} ${a.nom}`),
  }).catch((err) => logger.warn('TIKEXO — Mail inscription échoué', { err: err.message, email }));

  return {
    entreprise_id: ent.id,
    user_id: user.id,
    plan: planLabel,
    plan_nom: planNom,
    frais_mensuel: fraisMensuel,
    message: 'Dossier soumis — en attente de validation KYB par l\'équipe TIKEXO',
  };
}

// Upload KYB sans authentification — autorisé uniquement tant que le dossier n'est pas validé
async function uploadDocumentInscription({ entreprise_id, type, fichier }) {
  const TYPES_VALIDES = ['CARTE_NIF', 'EXTRAIT_RCCM', 'PIECE_IDENTITE_DIRIGEANT', 'STATUTS_SOCIETE'];
  if (!TYPES_VALIDES.includes(type)) {
    const err = new Error('Type de document invalide'); err.statusCode = 400; throw err;
  }

  const dossier = await prisma.kybDossier.findUnique({ where: { entreprise_id } });
  if (!dossier) {
    const err = new Error('Dossier KYB introuvable'); err.statusCode = 404; throw err;
  }
  if (dossier.statut === 'VALIDE') {
    const err = new Error('Le dossier KYB est déjà validé'); err.statusCode = 409; throw err;
  }

  // Trouver la version la plus récente pour ce type
  const docExistant = await prisma.kybDocument.findFirst({
    where: { dossier_id: dossier.id, type, statut: 'EN_ATTENTE' },
    orderBy: { version: 'desc' },
  });
  const version = docExistant ? docExistant.version + 1 : 1;

  const doc = await prisma.kybDocument.create({
    data: {
      dossier_id: dossier.id,
      type,
      fichier_url: fichier.url,
      fichier_nom: fichier.originalname,
      fichier_taille: fichier.size,
      fichier_format: fichier.mimetype,
      version,
      remplace_id: docExistant?.id || null,
    },
  });

  // Recalculer statut du dossier
  const OBLIGATOIRES = ['CARTE_NIF', 'EXTRAIT_RCCM', 'PIECE_IDENTITE_DIRIGEANT'];
  const tousLesDocs = await prisma.kybDocument.findMany({ where: { dossier_id: dossier.id }, orderBy: { createdAt: 'desc' } });
  const docsActifs = {};
  for (const d of tousLesDocs) {
    if (!docsActifs[d.type] || d.createdAt > docsActifs[d.type].createdAt) docsActifs[d.type] = d;
  }
  const tousObligatoires = OBLIGATOIRES.every((t) => docsActifs[t]);
  const nouveauStatut = tousObligatoires ? 'EN_REVUE' : 'EN_COURS';

  if (dossier.statut !== nouveauStatut) {
    await prisma.$executeRaw`
      UPDATE "KybDossier"
      SET statut = ${nouveauStatut}::"StatutKyb",
          soumis_at = CASE WHEN ${nouveauStatut} = 'EN_REVUE' THEN NOW() ELSE soumis_at END,
          "updatedAt" = NOW()
      WHERE id = ${dossier.id}
    `;
    logger.info('TIKEXO — Dossier KYB statut mis à jour', { entreprise_id, nouveauStatut });
  }

  return { document_id: doc.id, type, version, statut_dossier: nouveauStatut };
}

async function inscrireCommercant({ nom, type, email: emailRaw, telephone: telRaw, mobile_money_operateur, adresse, ville, ifu, mot_de_passe }) {
  const email = emailRaw?.trim()?.toLowerCase();
  if (!email || !email.includes('@')) {
    const err = new Error("Adresse email invalide — elle servira d'identifiant de connexion");
    err.statusCode = 400; err.code = 'EMAIL_INVALIDE'; throw err;
  }
  if (!mot_de_passe || mot_de_passe.length < 8) {
    const err = new Error('Le mot de passe doit contenir au moins 8 caractères');
    err.statusCode = 400; err.code = 'MOT_DE_PASSE_TROP_COURT'; throw err;
  }

  const telephone = normaliserTelephone(telRaw);
  if (!validerTelephone(telephone)) {
    const err = new Error('Numéro de téléphone invalide — format attendu : +229 01 XX XX XX XX');
    err.statusCode = 400; err.code = 'TELEPHONE_INVALIDE'; throw err;
  }

  const TYPES_VALIDES = ['RESTAURANT', 'BOULANGERIE', 'EPICERIE', 'TRAITEUR', 'CAFETERIA', 'LIVRAISON', 'SUPERMARCHE'];
  if (!TYPES_VALIDES.includes(type)) {
    const err = new Error("Type d'établissement invalide");
    err.statusCode = 400; throw err;
  }

  const emailExiste = await prisma.user.findFirst({ where: { email_perso: email } });
  if (emailExiste) {
    const err = new Error('Cette adresse email est déjà associée à un compte TIKEXO');
    err.statusCode = 409; err.code = 'EMAIL_DEJA_EXISTANT'; throw err;
  }

  const telExiste = await prisma.user.findUnique({ where: { telephone } });
  if (telExiste) {
    const err = new Error('Ce numéro de téléphone est déjà associé à un compte TIKEXO');
    err.statusCode = 409; err.code = 'TELEPHONE_DEJA_EXISTANT'; throw err;
  }

  if (ifu) {
    const ifuExiste = await prisma.commercant.findFirst({ where: { ifu } });
    if (ifuExiste) {
      const err = new Error('Cet IFU est déjà enregistré sur TIKEXO');
      err.statusCode = 409; err.code = 'IFU_DEJA_EXISTANT'; throw err;
    }
  }

  const motDePasseHash = await bcrypt.hash(mot_de_passe, 12);

  const user = await prisma.user.create({
    data: {
      telephone,
      nom,
      prenom: 'Gérant',
      email_perso: email,
      mot_de_passe_hash: motDePasseHash,
      role: 'COMMERCANT',
      statut: 'INACTIF',
      kyc_niveau: 'KYB',
    },
  });

  const commercant = await prisma.commercant.create({
    data: {
      user_id: user.id,
      nom,
      type,
      ifu: ifu || null,
      niveau: ifu ? 'VERIFIE' : 'SIMPLIFIE',
      mobile_money_numero: telephone,
      mobile_money_operateur: mobile_money_operateur || 'MTN',
      adresse: adresse || null,
      ville: ville || 'Cotonou',
      statut: 'SOUMIS',
    },
  });

  await prisma.wallet.create({
    data: { user_id: user.id, type: 'COMMERCANT', currency: 'XOF' },
  });

  await prisma.auditLog.create({
    data: { user_id: user.id, action: 'INSCRIPTION_COMMERCANT', entite: 'Commercant', entite_id: commercant.id },
  });

  if (email) {
    envoyerEmail({
      to: email,
      subject: 'TIKEXO — Votre demande d\'inscription commerçant',
      html: `<p>Bonjour ${nom},</p><p>Votre demande d'inscription en tant que commerçant TIKEXO a bien été reçue. L'équipe TIKEXO va examiner votre dossier et vous contacter sous 48h ouvrées.</p><p>Cordialement,<br>L'équipe TIKEXO</p>`,
      text: `Bonjour ${nom},\n\nVotre demande d'inscription commerçant TIKEXO a bien été reçue. Nous vous contacterons sous 48h ouvrées.\n\nL'équipe TIKEXO`,
    }).catch((err) => logger.warn('TIKEXO — Mail inscription commerçant échoué', { err: err.message, email }));
  }

  return { commercant_id: commercant.id, user_id: user.id, message: "Demande soumise — en attente de validation par l'équipe TIKEXO" };
}

module.exports = { inscrire, uploadDocumentInscription, inscrireCommercant };
