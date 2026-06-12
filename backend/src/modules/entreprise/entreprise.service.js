// Service entreprise TIKEXO
const prisma = require('../../config/database');
const { validerKYCViaBeneficiaire } = require('../../utils/kyc');

async function lister(filtres = {}) {
  const { statut } = filtres;
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = statut ? { statut } : {};

  const [total, items] = await Promise.all([
    prisma.entreprise.count({ where }),
    prisma.entreprise.findMany({
      where,
      include: {
        wallet: { select: { solde: true, currency: true } },
        _count: { select: { liensBeneficiaires: { where: { statut: 'ACTIF', user: { role: 'BENEFICIAIRE' } } } } },
      },
      skip: (p - 1) * l,
      take: l,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function creer(data) {
  const entreprise = await prisma.entreprise.create({
    data: {
      nom: data.nom,
      nif: data.nif,
      rccm: data.rccm,
      secteur: data.secteur,
      adresse: data.adresse,
      ville: data.ville || 'Cotonou',
      telephone_rh: data.telephone_rh,
      email_rh: data.email_rh,
      taux_commission_defaut: data.taux_commission_defaut || 2.00,
    },
  });

  // Créer le wallet entreprise
  await prisma.wallet.create({
    data: {
      entreprise_id: entreprise.id,
      type: 'ENTREPRISE',
      currency: 'XOF',
    },
  });

  return entreprise;
}

async function getById(id) {
  return prisma.entreprise.findUniqueOrThrow({
    where: { id },
    include: {
      wallet: true,
      _count: { select: { liensBeneficiaires: { where: { statut: 'ACTIF', user: { role: 'BENEFICIAIRE' } } } } },
    },
  });
}

async function modifier(id, data) {
  // email_perso immuable — pas de modification possible via cette API
  const { nif, ...updateData } = data;
  return prisma.entreprise.update({
    where: { id },
    data: updateData,
  });
}

async function validerKYB(entrepriseId, adminId) {
  const entreprise = await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { kyb_valide: true, statut: 'ACTIF' },
  });

  // Cascader le KYC sur tous les bénéficiaires rattachés actifs
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId, statut: 'ACTIF' },
  });

  await Promise.all(
    liens.map((lien) => validerKYCViaBeneficiaire(prisma, lien.user_id, entrepriseId))
  );

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'KYB_VALIDE',
      entite: 'Entreprise',
      entite_id: entrepriseId,
    },
  });

  return entreprise;
}

async function suspendre(entrepriseId, adminId) {
  const entreprise = await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { statut: 'SUSPENDU' },
  });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'ENTREPRISE_SUSPENDUE',
      entite: 'Entreprise',
      entite_id: entrepriseId,
    },
  });

  return entreprise;
}

async function getBeneficiaires(entrepriseId) {
  return prisma.lienEntrepriseBeneficiaire.findMany({
    where: {
      entreprise_id: entrepriseId,
      statut: 'ACTIF',
      user: { role: 'BENEFICIAIRE' },
    },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          email_perso: true, statut: true,
          wallet: { select: { solde: true, currency: true } },
        },
      },
    },
  });
}

async function getWallet(entrepriseId) {
  return prisma.wallet.findUniqueOrThrow({
    where: { entreprise_id: entrepriseId },
    include: {
      ledgerSorties: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

async function getEquipeRH(entrepriseId) {
  return prisma.entrepriseAdmin.findMany({
    where: { entreprise_id: entrepriseId },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          role: true, statut: true, createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function toggleStatutUser(userId, adminId) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const nouveauStatut = user.statut === 'BLOQUE' ? 'ACTIF' : 'BLOQUE';

  await prisma.user.update({ where: { id: userId }, data: { statut: nouveauStatut } });

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: nouveauStatut === 'BLOQUE' ? 'USER_BLOQUE' : 'USER_REACTIVE',
      entite: 'User',
      entite_id: userId,
    },
  });

  return { id: userId, statut: nouveauStatut };
}

module.exports = { lister, creer, getById, modifier, validerKYB, suspendre, getBeneficiaires, getWallet, getEquipeRH, toggleStatutUser };
