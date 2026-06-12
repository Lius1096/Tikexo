// Service cartes TIKEXO
const prisma = require('../../config/database');

function genererNumeroMasque() {
  const last4 = Math.floor(1000 + Math.random() * 9000);
  return `•••• •••• •••• ${last4}`;
}

async function lister(entrepriseId) {
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId, statut: 'ACTIF' },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          cartesVirtuelles: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return liens.map((lien) => ({
    lien_id: lien.id,
    niveau: lien.niveau,
    user: {
      id: lien.user.id,
      nom: lien.user.nom,
      prenom: lien.user.prenom,
      telephone: lien.user.telephone,
    },
    cartes: lien.user.cartesVirtuelles,
  }));
}

async function creer(userId, adminId) {
  const existing = await prisma.carteDigi.findFirst({
    where: { user_id: userId, statut: 'ACTIVE' },
  });

  if (existing) {
    const err = new Error('Ce bénéficiaire possède déjà une carte active');
    err.statusCode = 409;
    throw err;
  }

  const expiration = new Date();
  expiration.setFullYear(expiration.getFullYear() + 3);

  const carte = await prisma.carteDigi.create({
    data: {
      user_id: userId,
      type: 'VIRTUELLE',
      numero_masque: genererNumeroMasque(),
      statut: 'ACTIVE',
      date_expiration: expiration,
    },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'CARTE_CREEE', entite: 'CarteDigi', entite_id: carte.id },
  });

  return carte;
}

async function bloquer(carteId, adminId) {
  const carte = await prisma.carteDigi.findUniqueOrThrow({ where: { id: carteId } });

  if (carte.statut !== 'ACTIVE') {
    const err = new Error('Seule une carte active peut être bloquée');
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.carteDigi.update({
    where: { id: carteId },
    data: { statut: 'BLOQUEE' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'CARTE_BLOQUEE', entite: 'CarteDigi', entite_id: carteId },
  });

  return updated;
}

async function debloquer(carteId, adminId) {
  const carte = await prisma.carteDigi.findUniqueOrThrow({ where: { id: carteId } });

  if (carte.statut !== 'BLOQUEE') {
    const err = new Error('Seule une carte bloquée peut être débloquée');
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.carteDigi.update({
    where: { id: carteId },
    data: { statut: 'ACTIVE' },
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'CARTE_DEBLOQUEE', entite: 'CarteDigi', entite_id: carteId },
  });

  return updated;
}

async function listerTout(filtres = {}) {
  const { statut, page = 1, limit = 50 } = filtres;
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 50;
  const where = {};
  if (statut) where.statut = statut;

  const [total, items] = await Promise.all([
    prisma.carteDigi.count({ where }),
    prisma.carteDigi.findMany({
      where,
      include: {
        user: { select: { id: true, nom: true, prenom: true, telephone: true, statut: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function getMaCarte(userId) {
  const cartes = await prisma.carteDigi.findMany({
    where: { user_id: userId },
    orderBy: { createdAt: 'desc' },
  });
  return cartes;
}

module.exports = { lister, listerTout, creer, bloquer, debloquer, getMaCarte };
