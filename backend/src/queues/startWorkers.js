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

  // Désactivé — remplacé par le flux de ticket de retrait manuel (voir
  // commercant.service.js#creerTicketRetrait) en attendant l'intégration
  // FedaPay "checkout envoi multiple" (cf. NOTES-FEDAPAY.md). Le job
  // jobBatchingPayouts et fedapay.service.js#declencherPayout restent en
  // place pour une réactivation future, mais ne sont plus planifiés.
  // cronQueue.add('payout-batch-commercants', {}, {
  //   repeat: { pattern: '0 8 * * 1-5' },
  //   jobId: 'cron-payout-batch',
  // });
  // Retire la planification déjà enregistrée dans Redis par un démarrage
  // précédent — sans ça, commenter le .add() ci-dessus ne suffit pas à
  // arrêter un job répétitif déjà connu de BullMQ.
  cronQueue.removeRepeatable('payout-batch-commercants', { pattern: '0 8 * * 1-5' }, 'cron-payout-batch')
    .catch((err) => logger.warn('[TIKEXO QUEUES] Nettoyage cron-payout-batch échoué', { err: err.message }));

  cronQueue.add('kyb-deadline-check', {}, {
    repeat: { pattern: '0 8 * * *' },
    jobId: 'cron-kyb-deadline',
  });

  cronQueue.add('kyb-documents-rejetes-relance', {}, {
    repeat: { pattern: '30 8 * * *' },
    jobId: 'cron-kyb-documents-rejetes-relance',
  });

  cronQueue.add('facturation-mensuelle', {}, {
    repeat: { pattern: '0 9 1 * *' }, // 1er de chaque mois à 9h
    jobId: 'cron-facturation-mensuelle',
  });

  cronQueue.add('reset-volume-mensuel-commercants', {}, {
    repeat: { pattern: '0 0 1 * *' }, // 1er de chaque mois à minuit, avant la facturation de 9h
    jobId: 'cron-reset-volume-mensuel-commercants',
  });

  logger.info('[TIKEXO QUEUES] Jobs cron enregistrés');
}

module.exports = { startWorkers };
