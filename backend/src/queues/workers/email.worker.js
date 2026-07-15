const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { envoyerEmail } = require('../../utils/email');
const { logger } = require('../../middlewares/errorHandler');

const worker = new Worker('email', async (job) => {
  const { to, subject, html, text, expediteur, replyTo } = job.data;
  await envoyerEmail({ to, subject, html, text, expediteur, replyTo });
  logger.info('[QUEUE:EMAIL] Envoyé', { to, subject, jobId: job.id });
}, {
  connection: redisConnection,
  concurrency: 5,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

worker.on('failed', (job, err) => {
  logger.error('[QUEUE:EMAIL] Échec', { jobId: job?.id, err: err.message });
});

module.exports = worker;
