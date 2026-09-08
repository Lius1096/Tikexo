-- Historique des communications de masse envoyées depuis /admin/broadcast
-- (entreprises sélectionnées, tous les bénéficiaires, ou tous les
-- commerçants), en plus des notifications/emails effectivement envoyés.
CREATE TYPE "CibleBroadcast" AS ENUM ('BENEFICIAIRES', 'ENTREPRISES', 'COMMERCANTS');

CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "envoye_par" TEXT NOT NULL,
    "cible" "CibleBroadcast" NOT NULL,
    "entreprise_ids" TEXT[],
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "canaux" TEXT[],
    "nb_destinataires" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Broadcast_createdAt_idx" ON "Broadcast"("createdAt");

ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_envoye_par_fkey"
    FOREIGN KEY ("envoye_par") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
