-- Migration: allocation_mensuelle_fixe
-- Passage d'un modèle valeur_journalière × jours_ouvrés à une allocation mensuelle fixe.
-- L'employeur fixe un montant mensuel par bénéficiaire ; l'employeur finance 100 %.

-- LienEntrepriseBeneficiaire : renommer valeur_titre → allocation_mensuelle, supprimer taux_participation
ALTER TABLE "LienEntrepriseBeneficiaire" RENAME COLUMN "valeur_titre" TO "allocation_mensuelle";
ALTER TABLE "LienEntrepriseBeneficiaire" DROP COLUMN IF EXISTS "taux_participation";

-- Dotation : supprimer les champs liés au calcul par jour (nb_titres, part_employeur, part_salarie)
-- montant_total reste et reflète désormais l'allocation mensuelle complète
ALTER TABLE "Dotation" DROP COLUMN IF EXISTS "nb_titres";
ALTER TABLE "Dotation" DROP COLUMN IF EXISTS "part_employeur";
ALTER TABLE "Dotation" DROP COLUMN IF EXISTS "part_salarie";
