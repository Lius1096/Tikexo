-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH', 'MANAGER', 'BENEFICIAIRE', 'COMMERCANT');

-- CreateEnum
CREATE TYPE "StatutUser" AS ENUM ('INACTIF', 'EN_ATTENTE_KYC', 'ACTIF', 'SUSPENDU', 'BLOQUE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "NiveauKYC" AS ENUM ('ZERO', 'KYB');

-- CreateEnum
CREATE TYPE "StatutEntreprise" AS ENUM ('EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "StatutLien" AS ENUM ('ACTIF', 'TERMINE', 'EN_COURS_PREAVIS');

-- CreateEnum
CREATE TYPE "NiveauSalarie" AS ENUM ('DIRECTEUR', 'MANAGER', 'CADRE', 'AGENT_MAITRISE', 'EMPLOYE', 'STAGIAIRE');

-- CreateEnum
CREATE TYPE "TypeWallet" AS ENUM ('ENTREPRISE', 'BENEFICIAIRE', 'COMMERCANT', 'PLATEFORME');

-- CreateEnum
CREATE TYPE "StatutWallet" AS ENUM ('ACTIF', 'GELE', 'FERME');

-- CreateEnum
CREATE TYPE "TypeLedger" AS ENUM ('RECHARGEMENT', 'DOTATION', 'PAIEMENT', 'COMMISSION', 'PAYOUT', 'REMBOURSEMENT', 'COMPLEMENT');

-- CreateEnum
CREATE TYPE "StatutTransaction" AS ENUM ('EN_COURS', 'VALIDEE', 'ECHEC', 'REMBOURSEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeCommercant" AS ENUM ('RESTAURANT', 'BOULANGERIE', 'EPICERIE', 'TRAITEUR', 'CAFETERIA', 'LIVRAISON', 'SUPERMARCHE');

-- CreateEnum
CREATE TYPE "NiveauCommercant" AS ENUM ('VERIFIE', 'SIMPLIFIE');

-- CreateEnum
CREATE TYPE "StatutCommercant" AS ENUM ('SOUMIS', 'EN_VERIFICATION', 'VALIDE', 'ACTIF', 'SUSPENDU', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "OperateurMobile" AS ENUM ('MTN', 'MOOV', 'CELTIS');

-- CreateEnum
CREATE TYPE "ModeReversement" AS ENUM ('AUTO_72H', 'MENSUEL');

-- CreateEnum
CREATE TYPE "TypeFedapay" AS ENUM ('COLLECTE', 'PAYOUT');

-- CreateEnum
CREATE TYPE "StatutFedapay" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'ECHOUE');

-- CreateEnum
CREATE TYPE "StatutDotation" AS ENUM ('CALCULE', 'VALIDE', 'DISTRIBUE');

-- CreateEnum
CREATE TYPE "StatutMutation" AS ENUM ('EN_ATTENTE_A', 'VALIDE_A', 'EN_ATTENTE_B', 'COMPLETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "OptionSolde" AS ENUM ('CONSERVATION', 'REMBOURSEMENT');

-- CreateEnum
CREATE TYPE "TypeCarte" AS ENUM ('VIRTUELLE', 'PHYSIQUE');

-- CreateEnum
CREATE TYPE "StatutCarte" AS ENUM ('ACTIVE', 'BLOQUEE', 'EXPIREE', 'PERDUE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('RECHARGEMENT', 'TRANSACTION', 'SOLDE_FAIBLE', 'SECURITE', 'SYSTEME', 'MARKETING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email_perso" TEXT,
    "email_pro" TEXT,
    "pin_hash" TEXT,
    "biometrie_activee" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL,
    "statut" "StatutUser" NOT NULL DEFAULT 'INACTIF',
    "kyc_niveau" "NiveauKYC" NOT NULL DEFAULT 'ZERO',
    "kyc_via_entreprise" BOOLEAN NOT NULL DEFAULT false,
    "fcm_token" TEXT,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "rccm" TEXT,
    "nif" TEXT NOT NULL,
    "secteur" TEXT,
    "adresse" TEXT,
    "ville" TEXT NOT NULL DEFAULT 'Cotonou',
    "telephone_rh" TEXT,
    "email_rh" TEXT,
    "statut" "StatutEntreprise" NOT NULL DEFAULT 'EN_ATTENTE',
    "kyb_valide" BOOLEAN NOT NULL DEFAULT false,
    "taux_commission_defaut" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienEntrepriseBeneficiaire" (
    "id" TEXT NOT NULL,
    "entreprise_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "niveau" "NiveauSalarie" NOT NULL,
    "valeur_titre" DECIMAL(10,2) NOT NULL,
    "taux_participation" DECIMAL(5,2) NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" TIMESTAMP(3),
    "statut" "StatutLien" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LienEntrepriseBeneficiaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "entreprise_id" TEXT,
    "type" "TypeWallet" NOT NULL,
    "solde" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "solde_reserve" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "statut" "StatutWallet" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "wallet_source_id" TEXT,
    "wallet_destination_id" TEXT,
    "montant" DECIMAL(12,2) NOT NULL,
    "type" "TypeLedger" NOT NULL,
    "reference_fedapay" TEXT,
    "transaction_id" TEXT,
    "source_entreprise_id" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "commercant_id" TEXT NOT NULL,
    "montant_total" DECIMAL(10,2) NOT NULL,
    "montant_tikexo" DECIMAL(10,2) NOT NULL,
    "montant_complement" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "commission_tikexo" DECIMAL(10,2) NOT NULL,
    "statut" "StatutTransaction" NOT NULL DEFAULT 'EN_COURS',
    "fedapay_complement_id" TEXT,
    "source_entreprise_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commercant" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeCommercant" NOT NULL,
    "ifu" TEXT,
    "niveau" "NiveauCommercant" NOT NULL DEFAULT 'SIMPLIFIE',
    "mobile_money_numero" TEXT NOT NULL,
    "mobile_money_operateur" "OperateurMobile" NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "adresse" TEXT,
    "ville" TEXT NOT NULL DEFAULT 'Cotonou',
    "horaires" JSONB,
    "statut" "StatutCommercant" NOT NULL DEFAULT 'SOUMIS',
    "photo_url" TEXT,
    "qr_code_url" TEXT,
    "taux_commission" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "mode_reversement" "ModeReversement" NOT NULL DEFAULT 'AUTO_72H',
    "plafond_mensuel" DECIMAL(12,2) NOT NULL DEFAULT 500000,
    "volume_mensuel_cumule" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note_moyenne" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commercant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FedapayOperation" (
    "id" TEXT NOT NULL,
    "type" "TypeFedapay" NOT NULL,
    "fedapay_transaction_id" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "statut" "StatutFedapay" NOT NULL DEFAULT 'EN_ATTENTE',
    "wallet_id" TEXT,
    "entreprise_id" TEXT,
    "commercant_id" TEXT,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "prochaine_tentative" TIMESTAMP(3),
    "webhook_payload" JSONB,
    "erreur_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FedapayOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dotation" (
    "id" TEXT NOT NULL,
    "entreprise_id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "lien_id" TEXT NOT NULL,
    "nb_titres" INTEGER NOT NULL,
    "montant_total" DECIMAL(10,2) NOT NULL,
    "part_employeur" DECIMAL(10,2) NOT NULL,
    "part_salarie" DECIMAL(10,2) NOT NULL,
    "mois_concerne" TIMESTAMP(3) NOT NULL,
    "statut" "StatutDotation" NOT NULL DEFAULT 'CALCULE',
    "valide_par" TEXT,
    "valide_at" TIMESTAMP(3),
    "distribue_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mutation" (
    "id" TEXT NOT NULL,
    "initiateur_id" TEXT NOT NULL,
    "beneficiaire_id" TEXT NOT NULL,
    "entreprise_a_id" TEXT NOT NULL,
    "entreprise_b_id" TEXT NOT NULL,
    "statut" "StatutMutation" NOT NULL DEFAULT 'EN_ATTENTE_A',
    "option_solde" "OptionSolde",
    "montant_rembourse" DECIMAL(10,2),
    "date_depart_a" TIMESTAMP(3),
    "date_entree_b" TIMESTAMP(3),
    "fedapay_remboursement_id" TEXT,
    "motif" TEXT,
    "valide_a_at" TIMESTAMP(3),
    "valide_b_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarteDigi" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TypeCarte" NOT NULL,
    "numero_masque" TEXT NOT NULL,
    "statut" "StatutCarte" NOT NULL DEFAULT 'ACTIVE',
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "adresse_livraison" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarteDigi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entite_id" TEXT,
    "avant" JSONB,
    "apres" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "fcm_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_perso_key" ON "User"("email_perso");

-- CreateIndex
CREATE INDEX "User_telephone_idx" ON "User"("telephone");

-- CreateIndex
CREATE INDEX "User_email_perso_idx" ON "User"("email_perso");

-- CreateIndex
CREATE INDEX "User_role_statut_idx" ON "User"("role", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_nif_key" ON "Entreprise"("nif");

-- CreateIndex
CREATE INDEX "Entreprise_statut_idx" ON "Entreprise"("statut");

-- CreateIndex
CREATE INDEX "Entreprise_kyb_valide_idx" ON "Entreprise"("kyb_valide");

-- CreateIndex
CREATE INDEX "LienEntrepriseBeneficiaire_entreprise_id_statut_idx" ON "LienEntrepriseBeneficiaire"("entreprise_id", "statut");

-- CreateIndex
CREATE INDEX "LienEntrepriseBeneficiaire_user_id_statut_idx" ON "LienEntrepriseBeneficiaire"("user_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "LienEntrepriseBeneficiaire_entreprise_id_user_id_statut_key" ON "LienEntrepriseBeneficiaire"("entreprise_id", "user_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_user_id_key" ON "Wallet"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_entreprise_id_key" ON "Wallet"("entreprise_id");

-- CreateIndex
CREATE INDEX "Wallet_type_statut_idx" ON "Wallet"("type", "statut");

-- CreateIndex
CREATE INDEX "LedgerEntry_wallet_source_id_createdAt_idx" ON "LedgerEntry"("wallet_source_id", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_wallet_destination_id_createdAt_idx" ON "LedgerEntry"("wallet_destination_id", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_createdAt_idx" ON "LedgerEntry"("type", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_reference_fedapay_idx" ON "LedgerEntry"("reference_fedapay");

-- CreateIndex
CREATE INDEX "Transaction_beneficiaire_id_createdAt_idx" ON "Transaction"("beneficiaire_id", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_commercant_id_createdAt_idx" ON "Transaction"("commercant_id", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_statut_idx" ON "Transaction"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Commercant_user_id_key" ON "Commercant"("user_id");

-- CreateIndex
CREATE INDEX "Commercant_statut_idx" ON "Commercant"("statut");

-- CreateIndex
CREATE INDEX "Commercant_ville_statut_idx" ON "Commercant"("ville", "statut");

-- CreateIndex
CREATE INDEX "Commercant_latitude_longitude_idx" ON "Commercant"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "FedapayOperation_fedapay_transaction_id_key" ON "FedapayOperation"("fedapay_transaction_id");

-- CreateIndex
CREATE INDEX "FedapayOperation_statut_prochaine_tentative_idx" ON "FedapayOperation"("statut", "prochaine_tentative");

-- CreateIndex
CREATE INDEX "FedapayOperation_type_statut_idx" ON "FedapayOperation"("type", "statut");

-- CreateIndex
CREATE INDEX "Dotation_entreprise_id_mois_concerne_idx" ON "Dotation"("entreprise_id", "mois_concerne");

-- CreateIndex
CREATE INDEX "Dotation_statut_idx" ON "Dotation"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Dotation_lien_id_mois_concerne_key" ON "Dotation"("lien_id", "mois_concerne");

-- CreateIndex
CREATE INDEX "Mutation_beneficiaire_id_idx" ON "Mutation"("beneficiaire_id");

-- CreateIndex
CREATE INDEX "Mutation_statut_idx" ON "Mutation"("statut");

-- CreateIndex
CREATE INDEX "CarteDigi_user_id_statut_idx" ON "CarteDigi"("user_id", "statut");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_createdAt_idx" ON "AuditLog"("user_id", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entite_entite_id_idx" ON "AuditLog"("entite", "entite_id");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_telephone_utilise_expiration_idx" ON "OtpCode"("telephone", "utilise", "expiration");

-- CreateIndex
CREATE INDEX "Notification_user_id_lu_idx" ON "Notification"("user_id", "lu");

-- AddForeignKey
ALTER TABLE "LienEntrepriseBeneficiaire" ADD CONSTRAINT "LienEntrepriseBeneficiaire_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienEntrepriseBeneficiaire" ADD CONSTRAINT "LienEntrepriseBeneficiaire_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_wallet_source_id_fkey" FOREIGN KEY ("wallet_source_id") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_wallet_destination_id_fkey" FOREIGN KEY ("wallet_destination_id") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_commercant_id_fkey" FOREIGN KEY ("commercant_id") REFERENCES "Commercant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commercant" ADD CONSTRAINT "Commercant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FedapayOperation" ADD CONSTRAINT "FedapayOperation_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FedapayOperation" ADD CONSTRAINT "FedapayOperation_commercant_id_fkey" FOREIGN KEY ("commercant_id") REFERENCES "Commercant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dotation" ADD CONSTRAINT "Dotation_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dotation" ADD CONSTRAINT "Dotation_lien_id_fkey" FOREIGN KEY ("lien_id") REFERENCES "LienEntrepriseBeneficiaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_initiateur_id_fkey" FOREIGN KEY ("initiateur_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_beneficiaire_id_fkey" FOREIGN KEY ("beneficiaire_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_entreprise_a_id_fkey" FOREIGN KEY ("entreprise_a_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_entreprise_b_id_fkey" FOREIGN KEY ("entreprise_b_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarteDigi" ADD CONSTRAINT "CarteDigi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_telephone_fkey" FOREIGN KEY ("telephone") REFERENCES "User"("telephone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
