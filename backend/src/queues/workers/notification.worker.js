const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { envoyerNotificationPush } = require('../../config/firebase');
const { logger } = require('../../middlewares/errorHandler');

const worker = new Worker('notification', async (job) => {
  const { fcmToken, titre, corps, data } = job.data;
  await envoyerNotificationPush(fcmToken, titre, corps, data || {});
  logger.info('[QUEUE:NOTIFICATION] Envoyée', { titre, jobId: job.id });
}, {
  connection: redisConnection,
  concurrency: 20,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 200,
  },
});

worker.on('failed', (job, err) => {
  logger.error('[QUEUE:NOTIFICATION] Échec', { jobId: job?.id, err: err.message });
});

module.exports = worker;
