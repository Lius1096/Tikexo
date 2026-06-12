// Configuration Prisma avec middleware d'immutabilité
const { PrismaClient } = require('@prisma/client');

const MODELES_IMMUABLES = ['LedgerEntry', 'AuditLog'];

function creerClientPrisma() {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

  // Middleware TIKEXO : bloque tout UPDATE et DELETE sur les modèles immuables
  prisma.$use(async (params, next) => {
    if (MODELES_IMMUABLES.includes(params.model)) {
      if (params.action === 'update' || params.action === 'updateMany' ||
          params.action === 'delete' || params.action === 'deleteMany' ||
          params.action === 'upsert') {
        const err = new Error(
          `TIKEXO — Opération interdite : ${params.action} sur ${params.model} est immuable`
        );
        err.code = 'IMMUTABLE_RECORD';
        throw err;
      }
    }

    // Bloque aussi toute tentative de modifier wallet.solde directement hors ledger
    if (params.model === 'Wallet' &&
        (params.action === 'update' || params.action === 'updateMany')) {
      const data = params.args?.data;
      if (data && (data.solde !== undefined || data.solde_reserve !== undefined)) {
        const stack = new Error().stack || '';
        if (!stack.includes('ledger.js')) {
          const err = new Error(
            'TIKEXO — Modification directe de wallet.solde interdite hors ledger.js'
          );
          err.code = 'DIRECT_SOLDE_UPDATE_FORBIDDEN';
          throw err;
        }
      }
    }

    return next(params);
  });

  return prisma;
}

const prisma = creerClientPrisma();

module.exports = prisma;
