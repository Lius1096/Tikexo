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

// Rechargement individuel — wallet entreprise → wallet bénéficiaire
async function crediterBenef(entrepriseId, beneficiaireId, montant, adminId) {
  const montantNum = parseFloat(montant);
  if (!montantNum || montantNum < 100) {
    const err = new Error('Montant minimum : 100 XOF');
    err.statusCode = 400; throw err;
  }

  const [walletEnt, walletBenef, ent] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { entreprise_id: entrepriseId } }),
    prisma.wallet.findUniqueOrThrow({ where: { user_id: beneficiaireId } }),
    prisma.entreprise.findUniqueOrThrow({ where: { id: entrepriseId }, select: { kyb_valide: true } }),
  ]);

  if (!ent.kyb_valide) {
    const err = new Error('KYB requis avant tout transfert'); err.statusCode = 403; err.code = 'KYB_REQUIS'; throw err;
  }
  const soldeDisponible = parseFloat(walletEnt.solde) - parseFloat(walletEnt.solde_reserve);
  if (soldeDisponible < montantNum) {
    const err = new Error('Solde disponible insuffisant dans le wallet entreprise'); err.statusCode = 400; err.code = 'SOLDE_INSUFFISANT'; throw err;
  }

  const { transfererEntreWallets } = require('../../utils/ledger');
  await transfererEntreWallets(prisma, walletEnt.id, walletBenef.id, montantNum, 'DOTATION', {
    source_entreprise_id: entrepriseId,
    description: 'Rechargement individuel RH',
  });

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'DOTATION_MANUELLE', entite: 'Wallet', entite_id: walletBenef.id, apres: { montant: montantNum, beneficiaireId, entrepriseId } },
  });

  return { montant: montantNum, beneficiaireId };
}

// Rechargement groupé — liste [{ beneficiaireId, montant }] ou upload CSV
async function crediterGroupe(entrepriseId, credits, adminId) {
  if (!Array.isArray(credits) || credits.length === 0) {
    const err = new Error('La liste de crédits est vide'); err.statusCode = 400; throw err;
  }
  if (credits.length > 500) {
    const err = new Error('Maximum 500 bénéficiaires par opération'); err.statusCode = 400; throw err;
  }

  const [walletEnt, ent] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { entreprise_id: entrepriseId } }),
    prisma.entreprise.findUniqueOrThrow({ where: { id: entrepriseId }, select: { kyb_valide: true } }),
  ]);

  if (!ent.kyb_valide) {
    const err = new Error('KYB requis'); err.statusCode = 403; err.code = 'KYB_REQUIS'; throw err;
  }

  const totalMontant = credits.reduce((s, c) => s + parseFloat(c.montant || 0), 0);
  const soldeDisponible = parseFloat(walletEnt.solde) - parseFloat(walletEnt.solde_reserve);
  if (soldeDisponible < totalMontant) {
    const err = new Error(`Solde insuffisant. Nécessaire : ${totalMontant.toLocaleString('fr-FR')} XOF, disponible : ${Math.floor(soldeDisponible).toLocaleString('fr-FR')} XOF`);
    err.statusCode = 400; err.code = 'SOLDE_INSUFFISANT'; throw err;
  }

  const benefIds = credits.map((c) => c.beneficiaireId).filter(Boolean);
  const walletsBenef = await prisma.wallet.findMany({
    where: { user_id: { in: benefIds } },
    select: { id: true, user_id: true },
  });
  const walletMap = new Map(walletsBenef.map((w) => [w.user_id, w.id]));

  const { transfererEntreWallets } = require('../../utils/ledger');
  const resultats = [];
  let totalTransfere = 0;

  for (const credit of credits) {
    const montantNum = parseFloat(credit.montant);
    const walletDestId = walletMap.get(credit.beneficiaireId);
    if (!walletDestId || !montantNum || montantNum < 100) {
      resultats.push({ beneficiaireId: credit.beneficiaireId, statut: 'IGNORE', raison: !walletDestId ? 'Wallet introuvable' : 'Montant < 100' });
      continue;
    }
    try {
      await transfererEntreWallets(prisma, walletEnt.id, walletDestId, montantNum, 'DOTATION', { source_entreprise_id: entrepriseId, description: 'Rechargement groupé RH' });
      resultats.push({ beneficiaireId: credit.beneficiaireId, montant: montantNum, statut: 'OK' });
      totalTransfere += montantNum;
    } catch {
      resultats.push({ beneficiaireId: credit.beneficiaireId, statut: 'ERREUR' });
    }
  }

  await prisma.auditLog.create({
    data: { user_id: adminId, action: 'DOTATION_GROUPEE', entite: 'Wallet', entite_id: walletEnt.id, apres: { total: totalTransfere, nb: credits.length, entrepriseId } },
  });

  return { total: totalTransfere, nb_ok: resultats.filter((r) => r.statut === 'OK').length, nb_ignore: resultats.filter((r) => r.statut !== 'OK').length, resultats };
}

module.exports = { getSolde, getSoldeSegmente, getHistorique, recharger, geler, degeler, crediterBenef, crediterGroupe };
