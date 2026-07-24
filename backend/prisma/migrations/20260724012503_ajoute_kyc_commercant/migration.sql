-- CreateEnum
CREATE TYPE "TypeCommercantDocument" AS ENUM ('PIECE_IDENTITE_GERANT', 'JUSTIFICATIF_IFU');

-- CreateTable
CREATE TABLE "CommercantDocument" (
    "id" TEXT NOT NULL,
    "commercant_id" TEXT NOT NULL,
    "type" "TypeCommercantDocument" NOT NULL,
    "statut" "StatutKybDocument" NOT NULL DEFAULT 'EN_ATTENTE',
    "fichier_url" TEXT NOT NULL,
    "fichier_nom" TEXT NOT NULL,
    "fichier_taille" INTEGER NOT NULL,
    "motif_rejet" TEXT,
    "rejete_par" TEXT,
    "rejete_at" TIMESTAMP(3),
    "valide_par" TEXT,
    "valide_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercantDocument_commercant_id_idx" ON "CommercantDocument"("commercant_id");

-- CreateIndex
CREATE INDEX "CommercantDocument_statut_idx" ON "CommercantDocument"("statut");

-- AddForeignKey
ALTER TABLE "CommercantDocument" ADD CONSTRAINT "CommercantDocument_commercant_id_fkey" FOREIGN KEY ("commercant_id") REFERENCES "Commercant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
