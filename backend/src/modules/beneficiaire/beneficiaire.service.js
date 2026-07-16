// Service bénéficiaire TIKEXO
const prisma = require('../../config/database');
const { validerKYCViaBeneficiaire, cascadeKYCApresDepart } = require('../../utils/kyc');
const { normaliserTelephone } = require('../../utils/telephone');
const { detecterRattachement, traiterSortie: sortieService } = require('../mutation/mutation.service');
const carteUtils = require('../../utils/carte');
const { envoyerEmailAsync } = require('../../utils/email');
const { bienvenueBeneficiaire } = require('../../utils/emailTemplates');

async function lister(filtres = {}) {
  const { entrepriseId, statut } = filtres;
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = {};
  if (statut) where.statut = statut;
  if (entrepriseId) {
    where.liensBeneficiaire = { some: { entreprise_id: entrepriseId, statut: 'ACTIF' } };
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where: { ...where, role: 'BENEFICIAIRE' } }),
    prisma.user.findMany({
      where: { ...where, role: 'BENEFICIAIRE' },
      select: {
        id: true, nom: true, prenom: true, telephone: true,
        email_perso: true, statut: true, kyc_via_entreprise: true,
        wallet: { select: { solde: true, currency: true } },
        liensBeneficiaire: {
          where: { statut: 'ACTIF' },
          include: { entreprise: { select: { id: true, nom: true } } },
        },
      },
      skip: (p - 1) * l,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function creer(data) {
  const telephone = normaliserTelephone(data.telephone);

  // Chercher d'abord par téléphone — transparent pour B (il ne sait pas si l'employé existe déjà)
  const existantTel = await prisma.user.findUnique({ where: { telephone } });
  if (existantTel) return existantTel;

  // Puis par email_perso si fourni
  if (data.email_perso) {
    const existantEmail = await prisma.user.findUnique({ where: { email_perso: data.email_perso } });
    if (existantEmail) return existantEmail;
  }

  const user = await prisma.user.create({
    data: {
      telephone,
      nom: data.nom,
      prenom: data.prenom,
      email_perso: data.email_perso || null,
      email_pro: data.email_pro || null,
      role: 'BENEFICIAIRE',
      statut: 'INACTIF',
    },
  });

  // Créer le wallet bénéficiaire
  await prisma.wallet.create({
    data: {
      user_id: user.id,
      type: 'BENEFICIAIRE',
      currency: 'XOF',
    },
  });

  return user;
}

async function getById(id) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, nom: true, prenom: true, telephone: true,
      email_perso: true, statut: true, kyc_niveau: true, kyc_via_entreprise: true,
      wallet: true,
      liensBeneficiaire: {
        include: { entreprise: { select: { id: true, nom: true, kyb_valide: true } } },
      },
    },
  });
}

async function modifier(id, data) {
  // email_perso est immuable — on l'exclut de la mise à jour
  const { email_perso, role, ...updateData } = data;
  return prisma.user.update({ where: { id }, data: updateData });
}

async function rattacherEntreprise(userId, { entrepriseId, niveau, valeurTitre, tauxParticipation }, adminId) {
  // Vérifier qu'il n'y a pas déjà un lien ACTIF
  const lienActif = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });
  if (lienActif) {
    const err = new Error('Ce bénéficiaire est déjà actif dans cette entreprise');
    err.statusCode = 409;
    throw err;
  }

  // Fetch entreprise pour validation dotation_max + nom (email bienvenue)
  const entreprise = await prisma.entreprise.findUniqueOrThrow({
    where: { id: entrepriseId },
    select: { nom: true, dotation_max: true },
  });

  if (entreprise.dotation_max) {
    const plafond = parseFloat(entreprise.dotation_max.toString());
    const valeur  = parseFloat(valeurTitre.toString());
    if (valeur > plafond) {
      const err = new Error(
        `Valeur du titre (${valeur.toLocaleString('fr-FR')} XOF) dépasse le plafond de dotation de l'entreprise (${Math.floor(plafond).toLocaleString('fr-FR')} XOF)`
      );
      err.statusCode = 400;
      err.code = 'DOTATION_MAX_DEPASSEE';
      throw err;
    }
  }

  // Cas ré-embauche : lien TERMINE existant → réactiver
  const lienTermine = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'TERMINE' },
  });

  let lien;
  const estPremierRattachement = !lienTermine;
  if (lienTermine) {
    lien = await prisma.$transaction(async (tx) => {
      const updated = await tx.lienEntrepriseBeneficiaire.update({
        where: { id: lienTermine.id },
        data: {
          niveau,
          valeur_titre: valeurTitre,
          taux_participation: tauxParticipation,
          statut: 'ACTIF',
          date_debut: new Date(),
          date_fin: null,
        },
      });
      if (adminId) {
        await tx.auditLog.create({
          data: {
            user_id: adminId,
            action: 'REEMBAUCHE_EMPLOYE',
            entite: 'LienEntrepriseBeneficiaire',
            entite_id: updated.id,
            apres: { entreprise_id: entrepriseId, niveau, valeur_titre: valeurTitre },
          },
        });
      }
      return updated;
    });
  } else {
    lien = await prisma.lienEntrepriseBeneficiaire.create({
      data: {
        entreprise_id: entrepriseId,
        user_id: userId,
        niveau,
        valeur_titre: valeurTitre,
        taux_participation: tauxParticipation,
        statut: 'ACTIF',
      },
    });
  }

  await validerKYCViaBeneficiaire(prisma, userId, entrepriseId);

  // Émettre automatiquement une carte virtuelle si le bénéficiaire n'en a pas
  const carteExistante = await prisma.carteDigi.findFirst({
    where: { user_id: userId, statut: 'ACTIVE' },
  });

  if (!carteExistante) {
    const { hash, suffixe, numeroMasque } = await carteUtils.genererNumeroCarte(prisma);
    await prisma.carteDigi.create({
      data: {
        user_id       : userId,
        type          : 'VIRTUELLE',
        numero_hash   : hash,
        numero_masque : numeroMasque,
        prefixe       : process.env.CARTE_PREFIXE || '4782',
        suffixe,
        date_expiration: carteUtils.genererDateExpiration(),
        statut        : 'ACTIVE',
      },
    });
  }

  // Détection silencieuse : si cet employé avait une mutation EN_ATTENTE, on la lie à ce nouveau lien
  await detecterRattachement(userId, lien.id, entrepriseId);

  // Email bienvenue — uniquement au premier rattachement (pas ré-embauche)
  if (estPremierRattachement) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { prenom: true, email_perso: true },
    });
    if (user?.email_perso) {
      const { html, text } = bienvenueBeneficiaire(user.prenom, entreprise.nom);
      envoyerEmailAsync({
        to: user.email_perso,
        subject: `Bienvenue sur TIKEXO — ${entreprise.nom}`,
        html,
        text,
        expediteur: 'hello',
      }).catch(() => {}); // fire-and-forget — l'échec email ne bloque pas le rattachement
    }
  }

  return lien;
}

async function traiterSortie(userId, entrepriseId, adminId, options) {
  return sortieService(userId, entrepriseId, adminId, options);
}

async function suspendre(userId, entrepriseId, adminId) {
  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });
  if (!lien) {
    const err = new Error('Bénéficiaire non rattaché à cette entreprise');
    err.statusCode = 404;
    throw err;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { statut: 'BLOQUE' },
    select: { id: true, nom: true, prenom: true, statut: true },
  });
  if (adminId) {
    await prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: 'SUSPENSION_BENEFICIAIRE',
        entite: 'User',
        entite_id: userId,
        apres: { statut: 'BLOQUE', entreprise_id: entrepriseId },
      },
    });
  }
  return user;
}

async function reactiver(userId, entrepriseId, adminId) {
  const lien = await prisma.lienEntrepriseBeneficiaire.findFirst({
    where: { user_id: userId, entreprise_id: entrepriseId, statut: 'ACTIF' },
  });
  if (!lien) {
    const err = new Error('Bénéficiaire non rattaché à cette entreprise');
    err.statusCode = 404;
    throw err;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { statut: 'ACTIF' },
    select: { id: true, nom: true, prenom: true, statut: true },
  });
  if (adminId) {
    await prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: 'REACTIVATION_BENEFICIAIRE',
        entite: 'User',
        entite_id: userId,
        apres: { statut: 'ACTIF', entreprise_id: entrepriseId },
      },
    });
  }
  return user;
}

module.exports = { lister, creer, getById, modifier, rattacherEntreprise, traiterSortie, suspendre, reactiver };
