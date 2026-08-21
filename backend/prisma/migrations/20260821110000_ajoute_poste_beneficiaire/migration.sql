-- Intitulé de poste du bénéficiaire au sein de l'entreprise (libre, optionnel) —
-- absent jusqu'ici alors que le formulaire "Ajouter un bénéficiaire" en a besoin
-- pour identifier la fonction du salarié, distincte du niveau de dotation (niveau).
ALTER TABLE "LienEntrepriseBeneficiaire" ADD COLUMN "poste" TEXT;
