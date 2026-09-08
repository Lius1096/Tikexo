const { Redis } = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connexion partagée pour les Queues BullMQ. lazyConnect évite qu'un simple
// `require` (ex: un test unitaire qui importe transitivement fedapay.service
// ou utils/email) déclenche une vraie tentative de connexion réseau — la
// connexion ne s'ouvre qu'au premier usage réel d'une queue.
const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // obligatoire pour BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

redisConnection.on('error', (err) => {
  console.error('[TIKEXO REDIS] Erreur connexion :', err.message);
});

redisConnection.on('connect', () => {
  console.log('[TIKEXO REDIS] Connecté :', REDIS_URL);
});

module.exports = { redisConnection };
