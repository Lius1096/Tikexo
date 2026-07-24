// Service FedaPay TIKEXO
// Principe : FedaPay = frontière uniquement
// Collecte wallet entreprise, payout commerçant, remboursement salarié
const crypto = require('crypto');
const prisma = require('../../config/database');
const { crediterWallet, debiterWallet } = require('../../utils/ledger');
const { logger } = require('../../middlewares/errorHandler');
const { envoyerEmailAsync } = require('../../utils/email');
const { rechargeConfirmee } = require('../../utils/emailTemplates');

const MAX_TENTATIVES = 3;
const INTERVALLE_RETRY_HEURES = 1;
const SEUIL_MINIMUM = parseFloat(process.env.TIKEXO_PAYOUT_SEUIL_MINIMUM || '1000');

const DEV_MOCK = process.env.FEDAPAY_SECRET_KEY === 'sk_sandbox_REMPLACER' || !process.env.FEDAPAY_SECRET_KEY;

/**
 * Crée une collecte FedaPay pour recharger le wallet d'une entreprise.
 * La FedapayOperation est créée en base AVANT d'appeler FedaPay (idempotence).
 * En dev (clé placeholder), simule la réponse et crédite directement le wallet.
 */
async function creerCollecte(prisma, { entrepriseId, montant, telephonePayeur }) {
  const montantNum = parseFloat(montant.toString());

  // Vérifier le plafond wallet avant tout appel FedaPay
  const [walletEntreprise, entreprise] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { entreprise_id: entrepriseId } }),
    prisma.entreprise.findUniqueOrThrow({ where: { id: entrepriseId }, select: { montant_max_wallet: true, kyb_valide: true } }),
  ]);

  if (entreprise.montant_max_wallet) {
    const soldeActuel = parseFloat(walletEntreprise.solde.toString());
    const plafond = parseFloat(entreprise.montant_max_wallet.toString());
    if (soldeActuel + montantNum > plafond) {
      const err = new Error(
        `Plafond wallet dépassé — max ${Math.floor(plafond).toLocaleString('fr-FR')} XOF, solde actuel ${Math.floor(soldeActuel).toLocaleString('fr-FR')} XOF`
      );
      err.statusCode = 400;
      err.code = 'PLAFOND_WALLET_ATTEINT';
      throw err;
    }
  }

  const idempotenceKey = `collecte_${entrepriseId}_${montant}_${Date.now()}`;

  const operation = await prisma.fedapayOperation.create({
    data: {
      type: 'COLLECTE',
      fedapay_transaction_id: idempotenceKey,
      montant,
      statut: 'EN_ATTENTE',
      entreprise_id: entrepriseId,
    },
  });

  // Mode mock dev — clé FedaPay non configurée
  if (DEV_MOCK) {

    await crediterWallet(
      prisma,
      walletEntreprise.id,
      parseFloat(montant.toString()),
      'RECHARGEMENT',
      { fedapay_transaction_id: idempotenceKey, operation_id: operation.id, mode: 'DEV_MOCK' }
    );

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET statut = 'APPROUVE', "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    const mockUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/paiement/mock-succes?op=${operation.id}&montant=${montant}`;
    logger.info('TIKEXO DEV — Mock FedaPay collecte : wallet crédité directement', { entrepriseId, montant });

    return {
      fedapay_transaction_id: idempotenceKey,
      payment_url: mockUrl,
      operation_id: operation.id,
      mock: true,
    };
  }

  // Mode production — appel FedaPay réel
  const { FedaPay } = require('../../config/fedapay');

  try {
    const transaction = await FedaPay.Transaction.create({
      description: `TIKEXO — Rechargement wallet entreprise`,
      amount: montant,
      currency: { iso: 'XOF' },
      customer: { phone_number: { number: telephonePayeur, country: 'bj' } },
      callback_url: `${process.env.FRONTEND_URL}/paiement/callback`,
    });

    const token = await transaction.generateToken();

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET fedapay_transaction_id = ${transaction.id.toString()}, "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    return {
      fedapay_transaction_id: transaction.id,
      payment_url: token.url,
      operation_id: operation.id,
    };
  } catch (err) {
    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET statut = 'ECHOUE', erreur_message = ${err.message}, "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;
    throw err;
  }
}

/**
 * Traite un webhook FedaPay.
 * Vérifie la signature HMAC, puis crédite ou met en échec.
 */
async function traiterWebhook(prisma, { payload, rawBody, signature }) {
  const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET;

  if (webhookSecret) {
    const hmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)  // raw bytes — pas JSON.stringify() qui change l'ordre des clés
      .digest('hex');

    // timingSafeEqual pour éviter les timing attacks
    let signaturesEgales = false;
    try {
      const hmacBuf = Buffer.from(hmac,      'hex');
      const sigBuf  = Buffer.from(signature, 'hex');
      signaturesEgales = hmacBuf.length === sigBuf.length && crypto.timingSafeEqual(hmacBuf, sigBuf);
    } catch { signaturesEgales = false; }

    if (!signaturesEgales) {
      const err = new Error('TIKEXO — Signature webhook FedaPay invalide');
      err.statusCode = 401;
      throw err;
    }
  }

  const { transaction } = payload;
  if (!transaction) return { ignore: true };

  const fedapayId = transaction.id?.toString();
  const statut = transaction.status;

  // Idempotence : si déjà APPROUVE, ignorer silencieusement
  const operation = await prisma.fedapayOperation.findUnique({
    where: { fedapay_transaction_id: fedapayId },
  });

  if (!operation) {
    logger.warn('TIKEXO — Operation FedaPay introuvable', { fedapayId });
    return { ignore: true };
  }

  if (operation.statut === 'APPROUVE') {
    logger.info('TIKEXO — Webhook doublon ignoré', { fedapayId });
    return { doublon: true };
  }

  if (statut === 'approved') {
    // Créditer le wallet de l'entreprise
    if (operation.entreprise_id) {
      const walletEntreprise = await prisma.wallet.findUniqueOrThrow({
        where: { entreprise_id: operation.entreprise_id },
      });

      await crediterWallet(
        prisma,
        walletEntreprise.id,
        parseFloat(operation.montant.toString()),
        'RECHARGEMENT',
        { fedapay_transaction_id: fedapayId, operation_id: operation.id }
      );

      // Email confirmation rechargement à l'email RH de l'entreprise
      const entreprise = await prisma.entreprise.findUnique({
        where: { id: operation.entreprise_id },
        select: { nom: true, email_rh: true },
      });
      if (entreprise?.email_rh) {
        const { html, text } = rechargeConfirmee(
          entreprise.nom,
          parseFloat(operation.montant.toString()),
          fedapayId
        );
        envoyerEmailAsync({
          to: entreprise.email_rh,
          subject: 'Rechargement wallet TIKEXO confirmé',
          html,
          text,
          expediteur: 'facturation',
        }).catch(() => {});
      }
    }

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET statut = 'APPROUVE', webhook_payload = ${JSON.stringify(payload)}::jsonb, "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    return { creditee: true, operation_id: operation.id };
  }

  if (statut === 'declined' || statut === 'canceled') {
    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET statut = 'ECHOUE', erreur_message = ${statut}, webhook_payload = ${JSON.stringify(payload)}::jsonb, "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    logger.warn('TIKEXO — Paiement FedaPay échoué', { fedapayId, statut });
    return { echoue: true };
  }

  return { statut_inconnu: statut };
}

/**
 * Déclenche un payout FedaPay vers le Mobile Money d'un commerçant.
 * Planifie un retry en cas d'échec (max 3 tentatives).
 */
async function declencherPayout(prisma, commercantId) {
  const { FedaPay } = require('../../config/fedapay');

  const commercant = await prisma.commercant.findUniqueOrThrow({
    where: { id: commercantId },
    include: { user: { select: { wallet: true } } },
  });

  const wallet = commercant.user.wallet;
  // FedaPay/mobile money ne transfèrent que des francs entiers — arrondir vers le
  // bas et ne débiter que ce montant entier. Un éventuel reliquat fractionnaire
  // (résidu d'anciens calculs, ou impossible à transférer) reste dans le wallet
  // au lieu d'être silencieusement perdu ou sur-payé à la prochaine tentative.
  const soldeBrut = parseFloat(wallet.solde.toString());
  const solde = Math.floor(soldeBrut);

  if (solde < SEUIL_MINIMUM) {
    const err = new Error(`Solde commerçant insuffisant pour payout — minimum ${SEUIL_MINIMUM} XOF`);
    err.statusCode = 422;
    err.code = 'SOLDE_INSUFFISANT_PAYOUT';
    throw err;
  }

  const idempotenceKey = `payout_${commercantId}_${Date.now()}`;

  const operation = await prisma.fedapayOperation.create({
    data: {
      type: 'PAYOUT',
      fedapay_transaction_id: idempotenceKey,
      montant: solde,
      statut: 'EN_ATTENTE',
      commercant_id: commercantId,
    },
  });

  try {
    const payout = await FedaPay.Payout.create({
      description: `TIKEXO — Reversement commerçant ${commercant.nom}`,
      amount: solde,
      currency: { iso: 'XOF' },
      customer: {
        phone_number: {
          number: commercant.mobile_money_numero,
          country: 'bj',
        },
      },
    });

    await payout.sendNow();

    // Débiter le wallet commerçant — exactement le montant réellement envoyé
    // à FedaPay (solde arrondi), jamais le solde brut fractionnaire.
    await debiterWallet(
      prisma,
      wallet.id,
      solde,
      'PAYOUT',
      { fedapay_transaction_id: payout.id.toString(), operation_id: operation.id }
    );

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET fedapay_transaction_id = ${payout.id.toString()}, statut = 'APPROUVE', "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    return { payout_id: payout.id, montant: solde };
  } catch (err) {
    const tentatives = operation.tentatives + 1;
    const prochaineTentative = tentatives < MAX_TENTATIVES
      ? new Date(Date.now() + INTERVALLE_RETRY_HEURES * 60 * 60 * 1000)
      : null;

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET tentatives = ${tentatives},
          prochaine_tentative = ${prochaineTentative},
          erreur_message = ${err.message},
          "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    logger.error('TIKEXO — Payout FedaPay échoué', { commercantId, erreur: err.message, tentatives });

    if (tentatives >= MAX_TENTATIVES) {
      await prisma.$executeRaw`
        UPDATE "FedapayOperation" SET statut = 'ECHOUE', "updatedAt" = NOW() WHERE id = ${operation.id}
      `;
    }

    throw err;
  }
}

/**
 * Cron job de batching des payouts — toutes les 72h ouvrées.
 * 1 seul appel FedaPay par commerçant, peu importe le nombre de transactions.
 */
async function jobBatchingPayouts(prismaInstance) {
  const p = prismaInstance || prisma;
  const { estEligible } = require('../../utils/jours-feries-benin');

  if (!estEligible(new Date())) {
    logger.info('TIKEXO — Batching payouts reporté (jour non ouvré)');
    return { reporté: true };
  }

  const heureActuelle = new Date().getHours();
  if (heureActuelle < 8 || heureActuelle >= 18) {
    logger.info('TIKEXO — Batching payouts reporté (hors heures 8h-18h)');
    return { reporté: true };
  }

  const commercantsAuto = await p.commercant.findMany({
    where: {
      statut: 'ACTIF',
      mode_reversement: 'AUTO_72H',
    },
    include: { user: { select: { wallet: true } } },
  });

  let traites = 0;
  let erreurs = 0;

  for (const commercant of commercantsAuto) {
    const solde = parseFloat(commercant.user.wallet?.solde?.toString() || '0');
    if (solde >= SEUIL_MINIMUM) {
      try {
        await declencherPayout(p, commercant.id);
        traites++;
      } catch {
        erreurs++;
      }
    }
  }

  // Commerçants MENSUEL — uniquement le 1er du mois
  const today = new Date();
  if (today.getDate() === 1) {
    const commercantsMensuel = await p.commercant.findMany({
      where: { statut: 'ACTIF', mode_reversement: 'MENSUEL' },
      include: { user: { select: { wallet: true } } },
    });

    for (const commercant of commercantsMensuel) {
      const solde = parseFloat(commercant.user.wallet?.solde?.toString() || '0');
      if (solde >= SEUIL_MINIMUM) {
        try {
          await declencherPayout(p, commercant.id);
          traites++;
        } catch {
          erreurs++;
        }
      }
    }
  }

  logger.info(`TIKEXO — Batching payouts terminé : ${traites} traités, ${erreurs} erreurs`);
  return { traites, erreurs };
}

/**
 * Payout vers le mobile money d'un utilisateur (remboursement mutation).
 * Différent du payout commerçant : le numéro est le téléphone du user.
 */
async function declencherPayoutUser(prisma, { userId, montant: montantBrut, motif }) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { wallet: true },
  });

  // Le XOF n'a pas de centime — FedaPay/mobile money n'acceptent que des francs entiers
  const montant = Math.round(montantBrut);
  const solde = parseFloat(user.wallet.solde.toString());
  if (solde < montant) {
    const err = new Error(`Solde insuffisant pour remboursement — ${solde} XOF disponible, ${montant} XOF requis`);
    err.statusCode = 422;
    err.code = 'SOLDE_INSUFFISANT_PAYOUT';
    throw err;
  }

  const idempotenceKey = `payout_user_${userId}_${Date.now()}`;

  const operation = await prisma.fedapayOperation.create({
    data: {
      type: 'PAYOUT',
      fedapay_transaction_id: idempotenceKey,
      montant,
      statut: 'EN_ATTENTE',
    },
  });

  if (DEV_MOCK) {
    await debiterWallet(prisma, user.wallet.id, montant, 'REMBOURSEMENT', {
      fedapay_transaction_id: idempotenceKey,
      motif,
    });
    await prisma.$executeRaw`
      UPDATE "FedapayOperation" SET statut = 'APPROUVE', "updatedAt" = NOW() WHERE id = ${operation.id}
    `;
    logger.info('TIKEXO DEV — Mock payout user', { userId, montant });
    return { payout_id: idempotenceKey, montant };
  }

  const { FedaPay } = require('../../config/fedapay');

  try {
    const payout = await FedaPay.Payout.create({
      description: motif || `TIKEXO — Remboursement utilisateur`,
      amount: montant,
      currency: { iso: 'XOF' },
      customer: { phone_number: { number: user.telephone, country: 'bj' } },
    });

    await payout.sendNow();

    await debiterWallet(prisma, user.wallet.id, montant, 'REMBOURSEMENT', {
      fedapay_transaction_id: payout.id.toString(),
      motif,
    });

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET fedapay_transaction_id = ${payout.id.toString()}, statut = 'APPROUVE', "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    return { payout_id: payout.id, montant };
  } catch (err) {
    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET statut = 'ECHOUE', erreur_message = ${err.message}, "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;
    throw err;
  }
}

module.exports = { creerCollecte, traiterWebhook, declencherPayout, declencherPayoutUser, jobBatchingPayouts };
