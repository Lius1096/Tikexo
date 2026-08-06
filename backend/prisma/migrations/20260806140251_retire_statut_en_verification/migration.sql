-- AlterEnum
BEGIN;
CREATE TYPE "StatutCommercant_new" AS ENUM ('SOUMIS', 'VALIDE', 'ACTIF', 'SUSPENDU', 'ARCHIVE');
ALTER TABLE "Commercant" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "Commercant" ALTER COLUMN "statut" TYPE "StatutCommercant_new" USING ("statut"::text::"StatutCommercant_new");
ALTER TYPE "StatutCommercant" RENAME TO "StatutCommercant_old";
ALTER TYPE "StatutCommercant_new" RENAME TO "StatutCommercant";
DROP TYPE "StatutCommercant_old";
ALTER TABLE "Commercant" ALTER COLUMN "statut" SET DEFAULT 'SOUMIS';
COMMIT;
