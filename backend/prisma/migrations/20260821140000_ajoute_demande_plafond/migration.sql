-- Demandes employeur de révision de plafond (solde wallet / flux mensuel),
-- validées uniquement par un admin TIKEXO.
CREATE TYPE "TypePlafond" AS ENUM ('SOLDE_WALLET', 'RECHARGE_MENSUEL');
CREATE TYPE "StatutDemandePlafond" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REJETEE');

CREATE TABLE "DemandePlafond" (
    "id" TEXT NOT NULL,
    "entreprise_id" TEXT NOT NULL,
    "type" "TypePlafond" NOT NULL,
    "montant_actuel" DECIMAL(12,2),
    "montant_demande" DECIMAL(12,2) NOT NULL,
    "justification" TEXT,
    "statut" "StatutDemandePlafond" NOT NULL DEFAULT 'EN_ATTENTE',
    "demande_par" TEXT NOT NULL,
    "traite_par" TEXT,
    "note_admin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite_at" TIMESTAMP(3),

    CONSTRAINT "DemandePlafond_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemandePlafond_entreprise_id_statut_idx" ON "DemandePlafond"("entreprise_id", "statut");
CREATE INDEX "DemandePlafond_statut_idx" ON "DemandePlafond"("statut");

ALTER TABLE "DemandePlafond" ADD CONSTRAINT "DemandePlafond_entreprise_id_fkey"
    FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
