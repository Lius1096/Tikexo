-- Plafond de flux cumulé mensuel sur les recharges wallet entreprise — distinct
-- de montant_max_wallet (plafond de solde instantané, contournable en dépensant
-- puis rechargeant en boucle dans le même mois).
ALTER TABLE "Entreprise" ADD COLUMN "plafond_recharge_mensuel" DECIMAL(12,2);
