-- Réglages globaux persistés en base (remplace platform-config.json, un
-- fichier du système de fichiers éphémère du conteneur, jamais réellement lu
-- par le reste du backend). Une seule ligne, id fixe "singleton".
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "taux_frais_benef_defaut" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "taux_frais_commercant_defaut" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "plafond_journalier" DECIMAL(12,2) NOT NULL DEFAULT 10000,
    "seuil_ticket_retrait" DECIMAL(12,2) NOT NULL DEFAULT 50000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformConfig" ("id", "updatedAt") VALUES ('singleton', CURRENT_TIMESTAMP);
