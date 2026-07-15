const { Redis } = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connexion partagée pour les Queues BullMQ
const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // obligatoire pour BullMQ
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  console.error('[TIKEXO REDIS] Erreur connexion :', err.message);
});

redisConnection.on('connect', () => {
  console.log('[TIKEXO REDIS] Connecté :', REDIS_URL);
});

module.exports = { redisConnection };
