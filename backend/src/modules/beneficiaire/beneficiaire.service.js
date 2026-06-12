// Service bénéficiaire TIKEXO
const prisma = require('../../config/database');
const { validerKYCViaBeneficiaire, cascadeKYCApresDepart } = require('../../utils/kyc');
const { normaliserTelephone } = require('../../utils/telephone');
const { detecterRattachement, traiterSortie: sortieService } = require('../mutation/mutation.service');

function genererNumeroMasque() {
  const last4 = Math.floor(1000 + Math.random() * 9000);
  return `•••• •••• •••• ${last4}`;
}

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

async function rattacherEntreprise(userId, { entrepriseId, niveau, valeurTitre, tauxParticipation }) {
  const lien = await prisma.lienEntrepriseBeneficiaire.create({
    data: {
      entreprise_id: entrepriseId,
      user_id: userId,
      niveau,
      valeur_titre: valeurTitre,
      taux_participation: tauxParticipation,
      statut: 'ACTIF',
    },
  });

  await validerKYCViaBeneficiaire(prisma, userId, entrepriseId);

  // Émettre automatiquement une carte virtuelle si le bénéficiaire n'en a pas
  const carteExistante = await prisma.carteDigi.findFirst({
    where: { user_id: userId, statut: 'ACTIVE' },
  });

  if (!carteExistante) {
    const expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 3);
    await prisma.carteDigi.create({
      data: {
        user_id: userId,
        type: 'VIRTUELLE',
        numero_masque: genererNumeroMasque(),
        statut: 'ACTIVE',
        date_expiration: expiration,
      },
    });
  }

  // Détection silencieuse : si cet employé avait une mutation EN_ATTENTE, on la lie à ce nouveau lien
  await detecterRattachement(userId, lien.id, entrepriseId);

  return lien;
}

async function traiterSortie(userId, entrepriseId, adminId, options) {
  return sortieService(userId, entrepriseId, adminId, options);
}

module.exports = { lister, creer, getById, modifier, rattacherEntreprise, traiterSortie };
