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
        _count: { select: { liensBeneficiaires: { where: { statut: 'ACTIF' } } } },
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
      taux_commission_defaut: data.taux_commission_defaut || 5.00,
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
      _count: { select: { liensBeneficiaires: { where: { statut: 'ACTIF' } } } },
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

// Tous statuts (actif, inactif, bloqué) — pour le comptage complet
async function getBeneficiairesComplet(entrepriseId) {
  return prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, telephone: true,
          email_perso: true, statut: true,
          wallet: { select: { id: true, solde: true, currency: true } },
        },
      },
    },
  });
}

async function getStats(entrepriseId) {
  const anneeCourante = new Date().getFullYear();
  const debutAnnee = new Date(anneeCourante, 0, 1);

  // Comptes bénéficiaires par statut user
  const [total, actifs, enAttente] = await Promise.all([
    prisma.lienEntrepriseBeneficiaire.count({ where: { entreprise_id: entrepriseId } }),
    prisma.lienEntrepriseBeneficiaire.count({
      where: { entreprise_id: entrepriseId, user: { statut: 'ACTIF' } },
    }),
    prisma.lienEntrepriseBeneficiaire.count({
      where: { entreprise_id: entrepriseId, user: { statut: 'INACTIF' } },
    }),
  ]);

  // Dotations distribuées cette année — YTD
  const dotationsAnnee = await prisma.dotation.findMany({
    where: {
      entreprise_id: entrepriseId,
      statut: 'DISTRIBUE',
      distribue_at: { gte: debutAnnee },
    },
    select: { montant_total: true, part_employeur: true, part_salarie: true, distribue_at: true },
  });

  const consommationYTD = dotationsAnnee.reduce((s, d) => s + parseFloat(d.montant_total), 0);

  // Agrégation par mois de l'année courante (indices 0-11)
  const parMois = Array.from({ length: 12 }, (_, i) => ({ mois: i, emp: 0, sal: 0, total: 0 }));
  for (const d of dotationsAnnee) {
    const m = new Date(d.distribue_at).getMonth();
    parMois[m].emp += parseFloat(d.part_employeur);
    parMois[m].sal += parseFloat(d.part_salarie);
    parMois[m].total += parseFloat(d.montant_total);
  }

  // Top 5 consommateurs — transactions par bénéficiaire de cette entreprise YTD
  const liens = await prisma.lienEntrepriseBeneficiaire.findMany({
    where: { entreprise_id: entrepriseId, statut: 'ACTIF' },
    select: {
      user: { select: { id: true, nom: true, prenom: true, wallet: { select: { id: true } } } },
    },
  });

  const beneficiaireIds = liens.map((l) => l.user.id);
  const walletToUser = new Map(
    liens
      .filter((l) => l.user.wallet?.id)
      .map((l) => [l.user.id, l.user])
  );

  const topTx = await prisma.transaction.groupBy({
    by: ['beneficiaire_id'],
    where: {
      beneficiaire_id: { in: beneficiaireIds },
      statut: { not: 'ANNULEE' },
      createdAt: { gte: debutAnnee },
    },
    _sum: { montant_total: true },
    _count: { id: true },
    orderBy: { _sum: { montant_total: 'desc' } },
    take: 5,
  });

  const topConsommateurs = topTx
    .map((t) => ({
      user: walletToUser.get(t.beneficiaire_id),
      total: parseFloat(t._sum.montant_total || 0),
      nb_transactions: t._count.id,
    }))
    .filter((t) => t.user);

  return { beneficiaires: { total, actifs, enAttente }, consommationYTD, parMois, topConsommateurs };
}

async function getFacturation(entrepriseId) {
  const wallet = await prisma.wallet.findUnique({
    where: { entreprise_id: entrepriseId },
    select: { id: true },
  });
  if (!wallet) return { items: [], total: 0 };

  const items = await prisma.ledgerEntry.findMany({
    where: { wallet_source_id: wallet.id, type: 'FRAIS_GESTION' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, montant: true, createdAt: true, metadata: true },
  });

  return { items, total: items.length };
}

module.exports = { lister, creer, getById, modifier, validerKYB, suspendre, getBeneficiaires, getBeneficiairesComplet, getWallet, getEquipeRH, toggleStatutUser, getStats, getFacturation };
