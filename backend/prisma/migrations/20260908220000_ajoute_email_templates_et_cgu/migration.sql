-- Personnalisation admin des emails transactionnels (sans déploiement) et
-- versionnement des CGU publiées depuis /admin/cgu. Tant qu'aucune ligne
-- n'existe, le code utilise son contenu par défaut codé en dur — aucune
-- perte de contenu existant.
CREATE TABLE "EmailTemplate" (
    "cle" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "corps_html" TEXT NOT NULL,
    "corps_texte" TEXT NOT NULL,
    "variables" TEXT[],
    "modifie_par" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("cle")
);

CREATE TABLE "CGUVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "publie_par" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CGUVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CGUVersion_createdAt_idx" ON "CGUVersion"("createdAt");

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_modifie_par_fkey"
    FOREIGN KEY ("modifie_par") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CGUVersion" ADD CONSTRAINT "CGUVersion_publie_par_fkey"
    FOREIGN KEY ("publie_par") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
