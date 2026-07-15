const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { transfererEntreWallets } = require('../../utils/ledger');
const prisma = require('../../config/database');
const { notificationQueue } = require('../index');
const { logger } = require('../../middlewares/errorHandler');

// Traite UNE dotation à la fois — concurrency=10 garantit max 10 transferts DB simultanés
const worker = new Worker('dotation', async (job) => {
  const { dotationId, walletEntrepriseId, walletBenefId, montant, entrepriseId } = job.data;

  await transfererEntreWallets(
    prisma,
    walletEntrepriseId,
    walletBenefId,
    montant,
    'DOTATION',
    { dotation_id: dotationId, source_entreprise_id: entrepriseId }
  );

  await prisma.$executeRaw`
    UPDATE "Wallet"
    SET solde_reserve = GREATEST(0, solde_reserve - ${montant}::numeric), "updatedAt" = NOW()
    WHERE id = ${walletEntrepriseId}
  `;

  await prisma.$executeRaw`
    UPDATE "Dotation" SET statut = 'DISTRIBUE', distribue_at = NOW() WHERE id = ${dotationId}
  `;

  // Notifier le bénéficiaire via la queue dédiée
  const user = await prisma.user.findUnique({
    where: { id: job.data.beneficiaireId },
    select: { fcm_token: true },
  });

  if (user?.fcm_token) {
    await notificationQueue.add('dotation-recue', {
      fcmToken: user.fcm_token,
      titre: 'Dotation TIKEXO reçue',
      corps: `Votre dotation de ${montant} XOF a été créditée sur votre wallet TIKEXO`,
    });
  }

  logger.info('[QUEUE:DOTATION] Distribuée', { dotationId, montant });
  return { dotationId, statut: 'DISTRIBUE' };
}, {
  connection: redisConnection,
  concurrency: 10, // max 10 transferts wallet simultanés
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
});

worker.on('failed', (job, err) => {
  logger.error('[QUEUE:DOTATION] Échec', { jobId: job?.id, dotationId: job?.data?.dotationId, err: err.message });
});

module.exports = worker;
