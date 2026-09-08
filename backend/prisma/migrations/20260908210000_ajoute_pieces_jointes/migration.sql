-- Pièce jointe optionnelle sur un message de ticket support (capture
-- d'écran d'un problème) et sur une communication de masse (image/PDF joint
-- à l'annonce).
ALTER TABLE "TicketSupportMessage" ADD COLUMN "piece_jointe_url" TEXT;
ALTER TABLE "Broadcast" ADD COLUMN "piece_jointe_url" TEXT;
