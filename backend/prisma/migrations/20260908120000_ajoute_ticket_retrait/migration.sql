-- Demandes de retrait manuelles côté commerçant — remplace le déclenchement
-- direct d'un payout FedaPay par le commerçant, en attendant l'intégration
-- "checkout envoi multiple" (cf. NOTES-FEDAPAY.md). Traitement manuel par un
-- admin TIKEXO avec preuve de paiement jointe.
CREATE TYPE "StatutTicketRetrait" AS ENUM ('EN_ATTENTE', 'TRAITE', 'REJETE');

CREATE TABLE "TicketRetrait" (
    "id" TEXT NOT NULL,
    "commercant_id" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "statut" "StatutTicketRetrait" NOT NULL DEFAULT 'EN_ATTENTE',
    "preuve_url" TEXT,
    "motif_rejet" TEXT,
    "traite_par" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite_at" TIMESTAMP(3),

    CONSTRAINT "TicketRetrait_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketRetrait_commercant_id_statut_idx" ON "TicketRetrait"("commercant_id", "statut");
CREATE INDEX "TicketRetrait_statut_idx" ON "TicketRetrait"("statut");

ALTER TABLE "TicketRetrait" ADD CONSTRAINT "TicketRetrait_commercant_id_fkey"
    FOREIGN KEY ("commercant_id") REFERENCES "Commercant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
