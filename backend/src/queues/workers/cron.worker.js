const { Worker } = require('bullmq');
const { redisConnection } = require('../redis');
const { archiverExpirees } = require('../../modules/mutation/mutation.service');
const { jobBatchingPayouts } = require('../../modules/fedapay/fedapay.service');
const { debiterWallet } = require('../../utils/ledger');
const { envoyerEmailAsync } = require('../../utils/email');
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
        if (dossier.entreprise.email_rh) {
          const deadline = new Date(dossier.kyb_deadline).toLocaleDateString('fr-FR');
          envoyerEmailAsync({
            to: dossier.entreprise.email_rh,
            subject: `[TIKEXO] Deadline KYB — action requise avant le ${deadline}`,
            html: `<p>Bonjour,</p><p>Le dossier KYB de <strong>${dossier.entreprise.nom}</strong> doit être complété avant le <strong>${deadline}</strong>.</p><p>Rendez-vous dans votre espace employeur pour soumettre les documents manquants.</p><p>Support : <a href="mailto:kyb@tikexo.bj">kyb@tikexo.bj</a></p>`,
            text: `[TIKEXO] Le dossier KYB de ${dossier.entreprise.nom} doit être complété avant le ${deadline}.\n\nkyb@tikexo.bj`,
            expediteur: 'noreply',
          }).catch(() => {});
        }
      }

      return { alertes: dossiersCritiques.length };
    }

    case 'facturation-mensuelle': {
      const entreprises = await prisma.entreprise.findMany({
        where: { statut: 'ACTIF', frais_mensuel: { gt: 0 } },
        include: { wallet: true },
      });

      const mois = new Date().toISOString().slice(0, 7); // ex: "2026-07"
      let factures = 0;
      let soldeInsuffisant = 0;

      for (const e of entreprises) {
        if (!e.wallet) continue;
        const frais  = parseFloat(e.frais_mensuel.toString());
        const solde  = parseFloat(e.wallet.solde.toString());

        if (solde < frais) {
          soldeInsuffisant++;
          logger.warn('[QUEUE:CRON] Facturation — solde insuffisant', { entreprise_id: e.id, frais, solde });
          continue;
        }

        try {
          await debiterWallet(prisma, e.wallet.id, frais, 'FRAIS_GESTION', { mois, entreprise_id: e.id });
          factures++;
        } catch (err) {
          logger.error('[QUEUE:CRON] Facturation — débit échoué', { entreprise_id: e.id, err: err.message });
        }
      }

      logger.info('[QUEUE:CRON] Facturation mensuelle terminée', { factures, soldeInsuffisant, mois });
      return { factures, soldeInsuffisant };
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
