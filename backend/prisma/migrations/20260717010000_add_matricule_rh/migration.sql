-- AlterTable
ALTER TABLE "EntrepriseAdmin" ADD COLUMN "matricule" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EntrepriseAdmin_entreprise_id_matricule_key" ON "EntrepriseAdmin"("entreprise_id", "matricule");
