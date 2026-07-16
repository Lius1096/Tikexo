-- Ajout du statut IGNORE à l'enum StatutDotation
-- Permet à l'employeur de passer une dotation calculée sans la valider ni la distribuer
ALTER TYPE "StatutDotation" ADD VALUE IF NOT EXISTS 'IGNORE';
