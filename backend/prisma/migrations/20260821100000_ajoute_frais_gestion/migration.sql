-- Nouveau type d'écriture ledger pour les frais de gestion mensuels
-- prélevés par le cron "facturation-mensuelle" (debiterWallet) sur le
-- wallet des entreprises actives — manquait à l'enum alors que le code
-- l'utilisait déjà en lecture (getFacturation) et en écriture, causant
-- une erreur Prisma "Invalid value for argument type. Expected TypeLedger."
ALTER TYPE "TypeLedger" ADD VALUE 'FRAIS_GESTION';
