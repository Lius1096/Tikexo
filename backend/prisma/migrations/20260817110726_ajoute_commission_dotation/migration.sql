-- Nouveau type d'écriture ledger distinct pour la commission bénéficiaire
-- prélevée à la dotation (par opposition à COMMISSION, la part commerçant
-- prélevée au paiement) — permet de l'afficher sélectivement au bénéficiaire
-- sans exposer la commission commerçant.
ALTER TYPE "TypeLedger" ADD VALUE 'COMMISSION_DOTATION';
