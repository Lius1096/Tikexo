const { logger } = require('../middlewares/errorHandler');

let workers = [];
let httpServer = null;

function registerWorkers(list) {
  workers = list;
}

function registerServer(server) {
  httpServer = server;
}

async function gracefulShutdown(signal) {
  logger.info(`[TIKEXO] Signal ${signal} reçu — arrêt propre en cours...`);

  // 1. Arrêter d'accepter de nouvelles connexions HTTP
  if (httpServer) {
    httpServer.close(() => {
      logger.info('[TIKEXO] Serveur HTTP fermé');
    });
  }

  // 2. Drainer tous les workers BullMQ (attendre les jobs en cours)
  await Promise.allSettled(
    workers.map((w) =>
      w.close().then(() => logger.info(`[TIKEXO] Worker "${w.name}" drainé`))
    )
  );

  logger.info('[TIKEXO] Tous les workers drainés — arrêt');
  process.exit(0);
}

function registerShutdownHooks() {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

module.exports = { registerWorkers, registerServer, registerShutdownHooks };
