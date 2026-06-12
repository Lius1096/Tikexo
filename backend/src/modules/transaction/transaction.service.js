// Service transaction TIKEXO — CRITIQUE
// Toutes les transactions passent par ce service
const prisma = require('../../config/database');
const { transfererEntreWallets, verifierPlafondJournalier } = require('../../utils/ledger');
const { evaluerTransaction } = require('../../utils/antiFraude');
const { verifierAccesTransaction } = require('../../utils/kyc');
const { estEligible } = require('../../utils/jours-feries-benin');
const { envoyerNotificationPush } = require('../../config/firebase');

const COMMISSION_DEFAULT = parseFloat(process.env.TIKEXO_COMMISSION_DEFAULT || '2.00');
const PLAFOND_JOURNALIER = parseFloat(process.env.TIKEXO_PLAFOND_JOURNALIER_DEFAULT || '10000');

async function creer(beneficiaireId, { commercantId, montantTotal, localisation }) {
  // 1. Vérifier accès transaction
  const acces = await verifierAccesTransaction(prisma, beneficiaireId);
  if (!acces.autorise) {
    const err = new Error(acces.motif);
    err.statusCode = 403;
    throw err;
  }

  // 2. Vérifier que le commerçant est ACTIF
  const commercant = await prisma.commercant.findUniqueOrThrow({
    where: { id: commercantId },
    include: { user: { select: { wallet: true } } },
  });

  if (commercant.statut !== 'ACTIF') {
    const err = new Error('Ce commerçant TIKEXO n\'est pas actif');
    err.statusCode = 400;
    throw err;
  }

  // 3. Vérifier que le jour est éligible (ni dimanche ni férié)
  if (!estEligible(new Date())) {
    const err = new Error('Les transactions TIKEXO ne sont pas autorisées ce jour');
    err.statusCode = 400;
    throw err;
  }

  // 4. Vérifier le plafond journalier
  const plafond = await verifierPlafondJournalier(prisma, beneficiaireId, montantTotal, PLAFOND_JOURNALIER);
  if (!plafond.autorise) {
    const err = new Error(`Plafond journalier TIKEXO atteint — reste : ${plafond.reste} XOF`);
    err.statusCode = 400;
    err.code = 'PLAFOND_ATTEINT';
    throw err;
  }

  // 5. Évaluer le risque anti-fraude
  const risque = await evaluerTransaction(prisma, { beneficiaireId, commercantId, montant: montantTotal, localisation });
  if (risque.niveau >= 3) {
    const err = new Error('Transaction bloquée par le système anti-fraude TIKEXO');
    err.statusCode = 422;
    err.code = 'ANTI_FRAUDE';
    throw err;
  }

  // 6. Récupérer les wallets
  const walletBenef = await prisma.wallet.findUniqueOrThrow({ where: { user_id: beneficiaireId } });
  const walletCommercant = await prisma.wallet.findUniqueOrThrow({ where: { user_id: commercant.user_id } });
  const walletPlateforme = await prisma.wallet.findUnique({ where: { id: 'wallet-plateforme-tikexo' } });

  // 7. Calculer la commission
  const tauxCommission = parseFloat(commercant.taux_commission.toString()) / 100;
  const commissionTikexo = Math.round(montantTotal * tauxCommission * 100) / 100;
  const montantCommercant = montantTotal - commissionTikexo;

  // 8. Exécuter la transaction de manière atomique
  const transaction = await prisma.$transaction(async (tx) => {
    // Créer la transaction
    const txn = await tx.transaction.create({
      data: {
        beneficiaire_id: beneficiaireId,
        commercant_id: commercantId,
        montant_total: montantTotal,
        montant_tikexo: montantTotal,
        montant_complement: 0,
        commission_tikexo: commissionTikexo,
        statut: 'EN_COURS',
      },
    });

    // Débit bénéficiaire → commerçant (montant net)
    await transfererEntreWallets(
      tx,
      walletBenef.id,
      walletCommercant.id,
      montantCommercant,
      'PAIEMENT',
      { transaction_id: txn.id }
    );

    // Débit bénéficiaire → plateforme (commission)
    if (commissionTikexo > 0 && walletPlateforme) {
      await transfererEntreWallets(
        tx,
        walletBenef.id,
        walletPlateforme.id,
        commissionTikexo,
        'COMMISSION',
        { transaction_id: txn.id }
      );
    }

    // Mettre à jour le statut de la transaction
    await tx.$executeRaw`
      UPDATE "Transaction" SET statut = 'VALIDEE', "updatedAt" = NOW() WHERE id = ${txn.id}
    `;

    // Mettre à jour le volume mensuel commerçant
    await tx.$executeRaw`
      UPDATE "Commercant"
      SET volume_mensuel_cumule = volume_mensuel_cumule + ${montantTotal}::numeric, "updatedAt" = NOW()
      WHERE id = ${commercantId}
    `;

    return { ...txn, statut: 'VALIDEE' };
  });

  // 9. Notifications push (non bloquantes)
  const benef = await prisma.user.findUnique({
    where: { id: beneficiaireId },
    select: { fcm_token: true, nom: true },
  });

  if (benef?.fcm_token) {
    envoyerNotificationPush(
      benef.fcm_token,
      'Paiement TIKEXO',
      `Paiement de ${montantTotal} XOF chez ${commercant.nom} effectué`
    ).catch(() => {});
  }

  // 10. Émettre solde live via Socket.io
  const io = prisma._engineConfig?.adapter?.io;

  return { transaction, risqueNiveau: risque.niveau };
}

async function lister(userId, role, filtres = {}) {
  const p = parseInt(filtres.page, 10) || 1;
  const l = parseInt(filtres.limit, 10) || 20;
  const where = {};

  if (role === 'BENEFICIAIRE') where.beneficiaire_id = userId;
  else if (role === 'COMMERCANT') {
    const commercant = await prisma.commercant.findUnique({ where: { user_id: userId } });
    if (commercant) where.commercant_id = commercant.id;
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        commercant: { select: { nom: true, type: true } },
        beneficiaire: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { items, total, page: p, totalPages: Math.ceil(total / l) };
}

async function getById(id) {
  return prisma.transaction.findUniqueOrThrow({
    where: { id },
    include: {
      commercant: { select: { nom: true, type: true, adresse: true } },
      beneficiaire: { select: { nom: true, prenom: true } },
      ledgerEntries: true,
    },
  });
}

async function annuler(id, adminId) {
  const txn = await prisma.transaction.findUniqueOrThrow({ where: { id } });

  if (txn.statut !== 'EN_COURS') {
    const err = new Error('Seules les transactions EN_COURS peuvent être annulées');
    err.statusCode = 400;
    throw err;
  }

  await prisma.$executeRaw`
    UPDATE "Transaction" SET statut = 'ANNULEE', "updatedAt" = NOW() WHERE id = ${id}
  `;

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: 'TRANSACTION_ANNULEE',
      entite: 'Transaction',
      entite_id: id,
    },
  });

  return { annulee: true };
}

module.exports = { creer, lister, getById, annuler };
