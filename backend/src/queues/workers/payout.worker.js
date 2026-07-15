const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { declencherPayout, declencherPayoutUser } = require('../../modules/fedapay/fedapay.service');
const prisma = require('../../config/database');
const { logger } = require('../../middlewares/errorHandler');

const worker = new Worker('payout', async (job) => {
  const { type, commercantId, userId, montant, motif } = job.data;

  // Remboursement mutation → payout vers le téléphone du user
  if (type === 'user_refund') {
    const result = await declencherPayoutUser(prisma, { userId, montant, motif });
    logger.info('[QUEUE:PAYOUT] Remboursement user déclenché', { userId, montant });
    return result;
  }

  // Payout commerçant (manuel ou batch)
  const result = await declencherPayout(prisma, commercantId);
  logger.info('[QUEUE:PAYOUT] Payout commerçant déclenché', { commercantId });
  return result;
}, {
  connection: redisConnection,
  concurrency: 3,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
});

worker.on('failed', (job, err) => {
  logger.error('[QUEUE:PAYOUT] Échec définitif', { jobId: job?.id, data: job?.data, err: err.message });
});

module.exports = worker;
