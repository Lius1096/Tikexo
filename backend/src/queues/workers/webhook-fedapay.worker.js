const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { traiterWebhook } = require('../../modules/fedapay/fedapay.service');
const prisma = require('../../config/database');
const { logger } = require('../../middlewares/errorHandler');

const worker = new Worker('webhook-fedapay', async (job) => {
  const { payload, rawBody, signature } = job.data;
  const result = await traiterWebhook(prisma, { payload, rawBody, signature });
  logger.info('[QUEUE:WEBHOOK] Traité', { jobId: job.id, result });
  return result;
}, {
  connection: redisConnection,
  concurrency: 10,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

worker.on('failed', (job, err) => {
  logger.error('[QUEUE:WEBHOOK] Échec définitif', { jobId: job?.id, err: err.message });
});

module.exports = worker;
