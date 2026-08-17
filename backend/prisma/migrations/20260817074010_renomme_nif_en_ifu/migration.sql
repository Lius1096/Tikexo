-- Au Bénin, l'identifiant fiscal officiel s'appelle IFU (Identifiant Fiscal
-- Unique), pas NIF. Renommage du champ Entreprise.nif -> Entreprise.ifu et
-- de l'enum TypeKybDocument.CARTE_NIF -> CARTE_IFU pour refléter la bonne
-- terminologie béninoise (déjà utilisée côté Commercant.ifu).

ALTER TABLE "Entreprise" RENAME COLUMN "nif" TO "ifu";
ALTER INDEX "Entreprise_nif_key" RENAME TO "Entreprise_ifu_key";

ALTER TYPE "TypeKybDocument" RENAME VALUE 'CARTE_NIF' TO 'CARTE_IFU';
