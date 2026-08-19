// Service FedaPay TIKEXO
// Principe : FedaPay = frontière uniquement
// Collecte wallet entreprise, payout commerçant, remboursement salarié
const prisma = require('../../config/database');
const { crediterWallet, debiterWallet, verrouillerWallet } = require('../../utils/ledger');
const { logger } = require('../../middlewares/errorHandler');
const { envoyerEmailAsync } = require('../../utils/email');
const { rechargeConfirmee } = require('../../utils/emailTemplates');

const MAX_TENTATIVES = 3;
const INTERVALLE_RETRY_HEURES = 1;
const SEUIL_MINIMUM = parseFloat(process.env.TIKEXO_PAYOUT_SEUIL_MINIMUM || '1000');
// Frais TIKEXO sur reversement anticipé (déclenché manuellement par le
// commerçant) — le batch automatique quotidien reste gratuit. FedaPay ne
// facture rien sur un virement mobile money vers le même réseau (0 XOF),
// des frais s'appliquent seulement en cross-opérateur (montant non publié) ;
// ce taux couvre ce risque et finance le service "reversement à la demande"
// façon "instant payout" Stripe/PayPal. Valeur provisoire, ajustable ici
// sans redéploiement du code.
const TAUX_FRAIS_PAYOUT_MANUEL = parseFloat(process.env.TIKEXO_PAYOUT_FRAIS_MANUEL_TAUX || '1.5');

const DEV_MOCK = process.env.FEDAPAY_SECRET_KEY === 'sk_sandbox_REMPLACER' || !process.env.FEDAPAY_SECRET_KEY;

// FedaPay exige un champ "mode" (méthode de transfert) sur tout Payout —
// absent, l'API sandbox répond 500 avec un corps vide au lieu d'une erreur
// de validation exploitable. Bénin uniquement ; CELTIS non confirmé côté
// documentation FedaPay (aucun mode "celtis_*" listé), à vérifier auprès
// du support si un commerçant CELTIS a besoin d'un reversement.
const MODE_PAYOUT_PAR_OPERATEUR = {
  MTN: 'mtn_open',
  MOOV: 'moov',
};

/**
 * Crée une collecte FedaPay pour recharger le wallet d'une entreprise.
 * La FedapayOperation est créée en base AVANT d'appeler FedaPay (idempotence).
 * En dev (clé placeholder), simule la réponse et crédite directement le wallet.
 */
async function creerCollecte(prisma, { entrepriseId, montant }) {
  const montantNum = parseFloat(montant.toString());

  if (!montantNum || montantNum <= 0) {
    const err = new Error('TIKEXO — Montant de rechargement invalide');
    err.statusCode = 400;
    err.code = 'MONTANT_INVALIDE';
    throw err;
  }

  // Vérifier le plafond wallet avant tout appel FedaPay
  const [walletEntreprise, entreprise] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { entreprise_id: entrepriseId } }),
    prisma.entreprise.findUniqueOrThrow({ where: { id: entrepriseId }, select: { montant_max_wallet: true, kyb_valide: true, email_rh: true } }),
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
    // Client identifié par email plutôt que par téléphone+pays : en imposant
    // nous-mêmes le country "bj", FedaPay concatène l'indicatif (+229) au
    // numéro saisi sur SA page de paiement — ce qui casse les numéros de
    // test sandbox momo_test (64000001/66000001), reçus comme
    // "22964000001" au lieu de "64000001" et donc jamais reconnus comme les
    // valeurs magiques garantissant un succès. Passer par l'email laisse la
    // page FedaPay collecter le téléphone du payeur telle quelle, sans
    // interférence de notre côté — comportement documenté et tout aussi
    // valide en production (le payeur saisit son vrai numéro sur leur page).
    const transaction = await FedaPay.Transaction.create({
      description: `TIKEXO — Rechargement wallet entreprise`,
      amount: montant,
      currency: { iso: 'XOF' },
      customer: { email: entreprise.email_rh || undefined },
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
    // Le header X-FEDAPAY-SIGNATURE n'est PAS un hash hexadécimal brut : son
    // format réel est "t=<timestamp>,s=<signature>", et le texte signé est
    // "<timestamp>.<payload>" (pas le payload seul) — cf. Webhook.ts du SDK
    // officiel fedapay-node. On délègue donc à leur vérification plutôt que
    // de la refaire à la main (source du bug précédent : toute signature
    // était rejetée, le header n'étant jamais un hex valide à lui seul).
    const { Webhook } = require('fedapay');
    try {
      Webhook.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      const err = new Error('TIKEXO — Signature webhook FedaPay invalide');
      err.statusCode = 401;
      throw err;
    }
  }

  // Le payload réel envoyé par FedaPay place la transaction sous "entity"
  // (avec le nom de l'événement dans "name", ex. "transaction.approved"),
  // pas sous "transaction" comme le suggérait leur doc — vérifié via le
  // payload brut logué en production (voir "object": "transaction").
  const transaction = payload.entity;
  if (!transaction || payload.object !== 'transaction') return { ignore: true };

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

  // "transferred" doit être traité AVANT le garde-fou anti-doublon ci-dessous :
  // declencherPayout marque déjà l'opération APPROUVE de façon synchrone dès
  // que sendNow() réussit, bien avant qu'un éventuel webhook "transferred"
  // n'arrive. Si on laissait le garde-fou "déjà APPROUVE" s'appliquer en
  // premier, cette confirmation de livraison finale serait systématiquement
  // ignorée pour tout payout/remboursement — jamais atteignable. Cette
  // écriture est sans effet de bord sur les soldes (déjà débités), donc sûre
  // à traiter même si l'opération est déjà APPROUVE.
  if (statut === 'transferred') {
    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET statut = 'APPROUVE', webhook_payload = ${JSON.stringify(payload)}::jsonb, "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    // Reversement commerçant confirmé livré — notifier (in-app + push),
    // non bloquant : la livraison FedaPay est déjà actée ci-dessus.
    if (operation.type === 'PAYOUT' && operation.commercant_id) {
      const notificationService = require('../notification/notification.service');
      prisma.commercant.findUnique({
        where: { id: operation.commercant_id },
        select: { user_id: true },
      }).then((commercant) => {
        if (!commercant) return;
        return notificationService.creerEtNotifier(commercant.user_id, {
          titre: 'Reversement TIKEXO effectué',
          corps: `Votre reversement de ${Math.floor(parseFloat(operation.montant.toString()))} XOF a été transféré sur votre Mobile Money`,
          type: 'REVERSEMENT',
        });
      }).catch(() => {});
    }

    logger.info('TIKEXO — Virement FedaPay confirmé livré', { fedapayId, type: operation.type });
    return { transfere: true, operation_id: operation.id };
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

  // warn (pas info, filtré en prod) — un statut non géré ne doit jamais
  // passer inaperçu : c'est exactement ce qui laissait les paiements en
  // EN_ATTENTE sans qu'on le sache.
  logger.warn('TIKEXO — Webhook FedaPay statut non géré', { fedapayId, statut, type: operation.type, payload });
  return { statut_inconnu: statut };
}

/**
 * Déclenche un payout FedaPay vers le Mobile Money d'un commerçant.
 * Planifie un retry en cas d'échec (max 3 tentatives).
 */
async function declencherPayout(prisma, commercantId, { manuel = false } = {}) {
  const { FedaPay } = require('../../config/fedapay');

  // Étape verrouillée : lit le solde, vérifie qu'aucun payout n'est déjà en
  // cours et que le compte est actif, puis crée la FedapayOperation EN_ATTENTE
  // — tout ça avant d'appeler FedaPay (argent réel). Le verrou pessimiste sur
  // le wallet + la vérification "déjà en attente" empêchent un double-clic ou
  // un recoupement avec le cron de batching de déclencher deux virements
  // réels pour le même solde.
  const { commercant, wallet, operation, solde, frais, montantAPayer } = await prisma.$transaction(async (tx) => {
    const commercant = await tx.commercant.findUniqueOrThrow({
      where: { id: commercantId },
      include: { user: { select: { wallet: true } } },
    });

    if (commercant.statut !== 'ACTIF') {
      const err = new Error('Compte marchand suspendu — reversement indisponible');
      err.statusCode = 422;
      err.code = 'COMMERCANT_NON_ACTIF';
      throw err;
    }

    const wallet = commercant.user.wallet;
    // Le verrou bloque jusqu'à ce qu'une éventuelle autre opération en cours sur
    // ce wallet libère la ligne — on relit donc le solde depuis la ligne
    // verrouillée (walletVerrouille), pas depuis `wallet` capturé juste avant,
    // qui peut être périmé si on vient d'attendre la fin d'une autre opération.
    const walletVerrouille = await verrouillerWallet(tx, wallet.id);

    const payoutEnAttente = await tx.fedapayOperation.findFirst({
      where: { commercant_id: commercantId, type: 'PAYOUT', statut: 'EN_ATTENTE' },
    });
    if (payoutEnAttente) {
      const err = new Error('Un reversement est déjà en cours de traitement pour ce compte');
      err.statusCode = 409;
      err.code = 'PAYOUT_DEJA_EN_COURS';
      throw err;
    }

    // FedaPay/mobile money ne transfèrent que des francs entiers — arrondir vers le
    // bas et ne débiter que ce montant entier. Un éventuel reliquat fractionnaire
    // (résidu d'anciens calculs, ou impossible à transférer) reste dans le wallet
    // au lieu d'être silencieusement perdu ou sur-payé à la prochaine tentative.
    const soldeBrut = parseFloat(walletVerrouille.solde.toString());
    const solde = Math.floor(soldeBrut);

    if (solde < SEUIL_MINIMUM) {
      const err = new Error(`Solde commerçant insuffisant pour payout — minimum ${SEUIL_MINIMUM} XOF`);
      err.statusCode = 422;
      err.code = 'SOLDE_INSUFFISANT_PAYOUT';
      throw err;
    }

    // Frais uniquement sur un reversement déclenché manuellement — le batch
    // automatique quotidien (jobBatchingPayouts) reste gratuit.
    const frais = manuel ? Math.round(solde * (TAUX_FRAIS_PAYOUT_MANUEL / 100)) : 0;
    const montantAPayer = solde - frais;

    const idempotenceKey = `payout_${commercantId}_${Date.now()}`;

    const operation = await tx.fedapayOperation.create({
      data: {
        type: 'PAYOUT',
        fedapay_transaction_id: idempotenceKey,
        montant: montantAPayer,
        statut: 'EN_ATTENTE',
        commercant_id: commercantId,
      },
    });

    return { commercant, wallet, operation, solde, frais, montantAPayer };
  });

  try {
    let payoutId;
    if (DEV_MOCK) {
      payoutId = `mock_${operation.id}`;
      logger.info('TIKEXO DEV — Mock payout commerçant', { commercantId, montantAPayer, frais, manuel });
    } else {
      const payout = await FedaPay.Payout.create({
        description: `TIKEXO — Reversement commerçant ${commercant.nom}`,
        amount: montantAPayer,
        currency: { iso: 'XOF' },
        mode: MODE_PAYOUT_PAR_OPERATEUR[commercant.mobile_money_operateur] || 'mtn_open',
        customer: {
          phone_number: {
            number: commercant.mobile_money_numero,
            country: 'bj',
          },
        },
      });

      await payout.sendNow();
      payoutId = payout.id.toString();
    }

    // Débiter le wallet commerçant — exactement le montant réellement envoyé
    // à FedaPay (solde arrondi moins frais éventuels), jamais le solde brut.
    await debiterWallet(
      prisma,
      wallet.id,
      montantAPayer,
      'PAYOUT',
      { fedapay_transaction_id: payoutId, operation_id: operation.id }
    );

    // Frais TIKEXO sur reversement anticipé — écriture séparée et distincte
    // du PAYOUT lui-même (même principe que prelevierCommissionDotation côté
    // bénéficiaire), pour que le commerçant retrouve précisément ce qui lui a
    // été prélevé et pourquoi dans son historique.
    if (frais > 0) {
      const walletPlateforme = await prisma.wallet.findUnique({ where: { id: 'wallet-plateforme-tikexo' } });
      if (walletPlateforme) {
        const { transfererEntreWallets } = require('../../utils/ledger');
        await transfererEntreWallets(prisma, wallet.id, walletPlateforme.id, frais, 'FRAIS_PAYOUT_MANUEL', {
          operation_id: operation.id,
          taux: TAUX_FRAIS_PAYOUT_MANUEL,
          description: 'Frais TIKEXO — reversement anticipé',
        });
      }
    }

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET fedapay_transaction_id = ${payoutId}, statut = 'APPROUVE', "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    return { payout_id: payoutId, montant: montantAPayer, frais, solde_brut: solde };
  } catch (err) {
    const tentatives = operation.tentatives + 1;
    const prochaineTentative = tentatives < MAX_TENTATIVES
      ? new Date(Date.now() + INTERVALLE_RETRY_HEURES * 60 * 60 * 1000)
      : null;
    // Le SDK FedaPay expose le vrai message d'erreur de l'API sur err.errorMessage/
    // err.errors (extraits du corps de la réponse HTTP) — err.message n'est que le
    // code HTTP générique ("Request failed with status code 500").
    const erreurDetail = err.errorMessage || (err.errors ? JSON.stringify(err.errors) : null) || err.message;

    await prisma.$executeRaw`
      UPDATE "FedapayOperation"
      SET tentatives = ${tentatives},
          prochaine_tentative = ${prochaineTentative},
          erreur_message = ${erreurDetail},
          "updatedAt" = NOW()
      WHERE id = ${operation.id}
    `;

    logger.error('TIKEXO — Payout FedaPay échoué', {
      commercantId, erreur: err.message, erreurDetail, errors: err.errors, tentatives,
      httpStatus: err.httpStatus,
      rawBody: err.httpResponse?.data ? JSON.stringify(err.httpResponse.data) : null,
      errorType: err.constructor?.name,
    });

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
    // User ne stocke pas d'opérateur mobile money (contrairement à Commercant) —
    // mtn_open par défaut en attendant un vrai champ ; à corriger si ce flux de
    // remboursement est utilisé en dehors du MTN.
    const payout = await FedaPay.Payout.create({
      description: motif || `TIKEXO — Remboursement utilisateur`,
      amount: montant,
      currency: { iso: 'XOF' },
      mode: 'mtn_open',
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
