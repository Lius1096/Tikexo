const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { traiterDistributionDotation } = require('../../modules/dotation/dotation.service');
const { logger } = require('../../middlewares/errorHandler');

// Traite UNE dotation à la fois — concurrency=10 garantit max 10 transferts DB simultanés
const worker = new Worker('dotation', traiterDistributionDotation, {
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
