-- Support client structuré (entreprise/bénéficiaire/commerçant), remplace la
-- simple adresse email support@tikexo.kete.fr par un vrai fil de discussion
-- tracé et assignable côté admin.
CREATE TYPE "CategorieSupport" AS ENUM ('WALLET', 'DOTATION', 'KYB', 'PAIEMENT', 'RETRAIT', 'COMPTE', 'AUTRE');
CREATE TYPE "StatutTicketSupport" AS ENUM ('OUVERT', 'EN_COURS', 'RESOLU', 'FERME');
ALTER TYPE "TypeNotification" ADD VALUE 'SUPPORT';

CREATE TABLE "TicketSupport" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "categorie" "CategorieSupport" NOT NULL DEFAULT 'AUTRE',
    "sujet" TEXT NOT NULL,
    "statut" "StatutTicketSupport" NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSupport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketSupportMessage" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "auteur_id" TEXT NOT NULL,
    "auteur_role" "Role" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketSupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketSupport_user_id_statut_idx" ON "TicketSupport"("user_id", "statut");
CREATE INDEX "TicketSupport_statut_idx" ON "TicketSupport"("statut");
CREATE INDEX "TicketSupportMessage_ticket_id_createdAt_idx" ON "TicketSupportMessage"("ticket_id", "createdAt");

ALTER TABLE "TicketSupport" ADD CONSTRAINT "TicketSupport_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketSupportMessage" ADD CONSTRAINT "TicketSupportMessage_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "TicketSupport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketSupportMessage" ADD CONSTRAINT "TicketSupportMessage_auteur_id_fkey"
    FOREIGN KEY ("auteur_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
