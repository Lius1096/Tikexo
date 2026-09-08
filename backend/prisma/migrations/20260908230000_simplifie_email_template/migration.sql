-- Simplifie EmailTemplate : un admin ne doit jamais écrire de HTML. Une
-- seule colonne "corps" (texte brut avec {{variables}}) remplace
-- corps_html/corps_texte — la mise en forme HTML est désormais générée
-- automatiquement à l'envoi (voir utils/emailTemplateOverride.js). Le
-- TRUNCATE est sûr : cette table vient d'être créée, aucune personnalisation
-- réelle n'existe encore.
TRUNCATE TABLE "EmailTemplate";

ALTER TABLE "EmailTemplate" DROP COLUMN "corps_html";
ALTER TABLE "EmailTemplate" DROP COLUMN "corps_texte";
ALTER TABLE "EmailTemplate" ADD COLUMN "corps" TEXT NOT NULL;
