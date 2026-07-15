const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { archiverExpirees } = require('../../modules/mutation/mutation.service');
const { jobBatchingPayouts } = require('../../modules/fedapay/fedapay.service');
const prisma = require('../../config/database');
const { logger } = require('../../middlewares/errorHandler');

const worker = new Worker('cron', async (job) => {
  switch (job.name) {

    case 'archiver-mutations-expirees': {
      const result = await archiverExpirees();
      logger.info('[QUEUE:CRON] Mutations expirées archivées', result);
      return result;
    }

    case 'payout-batch-commercants': {
      const result = await jobBatchingPayouts(prisma);
      logger.info('[QUEUE:CRON] Batch payouts terminé', result);
      return result;
    }

    case 'kyb-deadline-check': {
      const demain = new Date();
      demain.setDate(demain.getDate() + 1);

      const dossiersCritiques = await prisma.kybDossier.findMany({
        where: {
          statut: { in: ['NON_SOUMIS', 'EN_COURS'] },
          kyb_deadline: { lte: demain },
        },
        include: { entreprise: { select: { id: true, nom: true, email_rh: true } } },
      });

      for (const dossier of dossiersCritiques) {
        logger.warn('[QUEUE:CRON] KYB deadline imminente', {
          entreprise: dossier.entreprise.nom,
          deadline: dossier.kyb_deadline,
        });
        // TODO: envoyer email de rappel via emailQueue
      }

      return { alertes: dossiersCritiques.length };
    }

    default:
      logger.warn('[QUEUE:CRON] Job inconnu', { name: job.name });
  }
}, {
  connection: redisConnection,
  concurrency: 1, // les crons s'exécutent un par un
});

worker.on('failed', (job, err) => {
  logger.error('[QUEUE:CRON] Échec', { job: job?.name, err: err.message });
});

module.exports = worker;
