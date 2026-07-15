const { cronQueue } = require('./index');
const { registerWorkers, registerShutdownHooks } = require('./shutdown');
const { logger } = require('../middlewares/errorHandler');

function startWorkers() {
  const emailWorker        = require('./workers/email.worker');
  const payoutWorker       = require('./workers/payout.worker');
  const webhookWorker      = require('./workers/webhook-fedapay.worker');
  const dotationWorker     = require('./workers/dotation.worker');
  const notificationWorker = require('./workers/notification.worker');
  const cronWorker         = require('./workers/cron.worker');

  // Enregistrer pour graceful shutdown
  registerWorkers([emailWorker, payoutWorker, webhookWorker, dotationWorker, notificationWorker, cronWorker]);
  registerShutdownHooks();

  logger.info('[TIKEXO QUEUES] Tous les workers démarrés');

  // Jobs récurrents — jobId idempotent : BullMQ ne duplique pas si déjà présent
  cronQueue.add('archiver-mutations-expirees', {}, {
    repeat: { pattern: '0 0 * * *' },
    jobId: 'cron-archiver-mutations',
  });

  cronQueue.add('payout-batch-commercants', {}, {
    repeat: { pattern: '0 8 * * 1-5' },
    jobId: 'cron-payout-batch',
  });

  cronQueue.add('kyb-deadline-check', {}, {
    repeat: { pattern: '0 8 * * *' },
    jobId: 'cron-kyb-deadline',
  });

  logger.info('[TIKEXO QUEUES] Jobs cron enregistrés');
}

module.exports = { startWorkers };
