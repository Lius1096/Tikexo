// Service wallet TIKEXO
const prisma = require('../../config/database');
const { calculerSoldeSegmente, crediterWallet } = require('../../utils/ledger');

async function getSolde(userId) {
  const wallet = await prisma.wallet.findUniqueOrThrow({
    where: { user_id: userId },
    select: { id: true, solde: true, solde_reserve: true, currency: true, statut: true },
  });

  // Stats du mois courant calculées depuis le ledger
  const debut = new Date();
  debut.setDate(1);
  debut.setHours(0, 0, 0, 0);

  const entreesMois = await prisma.ledgerEntry.findMany({
    where: {
      OR: [{ wallet_source_id: wallet.id }, { wallet_destination_id: wallet.id }],
      createdAt: { gte: debut },
    },
    select: { montant: true, wallet_destination_id: true },
  });

  const recu_ce_mois = entreesMois
    .filter((e) => e.wallet_destination_id === wallet.id)
    .reduce((s, e) => s + parseFloat(e.montant.toString()), 0);

  const depense_ce_mois = entreesMois
    .filter((e) => e.wallet_destination_id !== wallet.id)
    .reduce((s, e) => s + parseFloat(e.montant.toString()), 0);

  return { ...wallet, recu_ce_mois, depense_ce_mois };
}

async function getSoldeSegmente(userId) {
  return calculerSoldeSegmente(prisma, userId);
}

async function getHistorique(userId, filtres = {}) {
  const page = parseInt(filtres.page, 10) || 1;
  const limit = parseInt(filtres.limit, 10) || 20;
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { user_id: userId } });

  // COMMISSION est un détail interne — jamais exposé au bénéficiaire.
  // Pour PAIEMENT, on remonte le montant_total de la Transaction (commission incluse).
  const where = {
    AND: [
      { OR: [{ wallet_source_id: wallet.id }, { wallet_destination_id: wallet.id }] },
      { type: { not: 'COMMISSION' } },
    ],
  };

  const [total, rawEntries] = await Promise.all([
    prisma.ledgerEntry.count({ where }),
    prisma.ledgerEntry.findMany({
      where,
      include: {
        transaction: {
          select: { montant_total: true, commercant: { select: { nom: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Pour les PAIEMENT sans relation directe (transaction_id était dans metadata),
  // récupérer le montant_total via une requête batch sur les IDs metadata
  const idsMetaMissing = rawEntries
    .filter((e) => e.type === 'PAIEMENT' && !e.transaction && e.metadata?.transaction_id)
    .map((e) => e.metadata.transaction_id);

  const txMap = new Map();
  if (idsMetaMissing.length > 0) {
    const txs = await prisma.transaction.findMany({
      where: { id: { in: idsMetaMissing } },
      select: { id: true, montant_total: true, commercant: { select: { nom: true } } },
    });
    txs.forEach((t) => txMap.set(t.id, t));
  }

  const entries = rawEntries.map((e) => {
    if (e.type === 'PAIEMENT') {
      const tx = e.transaction ?? txMap.get(e.metadata?.transaction_id);
      if (tx) {
        return {
          ...e,
          montant: tx.montant_total,
          commercant_nom: tx.commercant?.nom ?? null,
        };
      }
    }
    return e;
  });

  return { entries, total, page, totalPages: Math.ceil(total / limit), walletId: wallet.id };
}

async function recharger(entrepriseId, montant, telephonePayeur) {
  // La recharge est initiée via FedaPay — ce service crée l'opération
  const { creerCollecte } = require('../fedapay/fedapay.service');
  return creerCollecte(prisma, { entrepriseId, montant, telephonePayeur });
}

async function geler(walletId, adminId) {
  const wallet = await prisma.$executeRaw`
    UPDATE "Wallet" SET statut = 'GELE', "updatedAt" = NOW() WHERE id = ${walletId}
  `;

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'WALLET_GELE', entite: 'Wallet', entite_id: walletId },
  });

  return { walletId, statut: 'GELE' };
}

async function degeler(walletId, adminId) {
  await prisma.$executeRaw`
    UPDATE "Wallet" SET statut = 'ACTIF', "updatedAt" = NOW() WHERE id = ${walletId}
  `;

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'WALLET_DEGELE', entite: 'Wallet', entite_id: walletId },
  });

  return { walletId, statut: 'ACTIF' };
}

module.exports = { getSolde, getSoldeSegmente, getHistorique, recharger, geler, degeler };
