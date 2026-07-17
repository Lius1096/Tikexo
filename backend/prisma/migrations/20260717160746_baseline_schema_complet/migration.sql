-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH', 'MANAGER', 'BENEFICIAIRE', 'COMMERCANT');

-- CreateEnum
CREATE TYPE "StatutUser" AS ENUM ('INACTIF', 'EN_ATTENTE_KYC', 'ACTIF', 'SUSPENDU', 'BLOQUE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "NiveauKYC" AS ENUM ('ZERO', 'KYB');

-- CreateEnum
CREATE TYPE "StatutEntreprise" AS ENUM ('EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "StatutLien" AS ENUM ('ACTIF', 'TERMINE', 'EN_COURS_PREAVIS', 'EXCLU');

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
CREATE TYPE "StatutDotation" AS ENUM ('CALCULE', 'VALIDE', 'DISTRIBUE', 'IGNORE');

-- CreateEnum
CREATE TYPE "StatutMutation" AS ENUM ('EN_ATTENTE', 'DETECTE', 'REEMBAUCHE', 'TRAITE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "OptionSolde" AS ENUM ('CONSERVATION', 'REMBOURSEMENT');

-- CreateEnum
CREATE TYPE "TypeCarte" AS ENUM ('VIRTUELLE', 'PHYSIQUE');

-- CreateEnum
CREATE TYPE "StatutCarte" AS ENUM ('COMMANDE', 'EXPEDIE', 'ACTIVE', 'BLOQUEE', 'EXPIREE', 'PERDUE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('RECHARGEMENT', 'TRANSACTION', 'SOLDE_FAIBLE', 'SECURITE', 'SYSTEME', 'MARKETING');

-- CreateEnum
CREATE TYPE "StatutKyb" AS ENUM ('NON_SOUMIS', 'EN_COURS', 'EN_REVUE', 'VALIDE', 'REJETE');

-- CreateEnum
CREATE TYPE "TypeKybDocument" AS ENUM ('CARTE_NIF', 'EXTRAIT_RCCM', 'PIECE_IDENTITE_DIRIGEANT', 'STATUTS_SOCIETE');

-- CreateEnum
CREATE TYPE "StatutKybDocument" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REJETE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email_perso" TEXT,
    "email_pro" TEXT,
    "invitation_token" TEXT,
    "pin_hash" TEXT,
    "mot_de_passe_hash" TEXT,
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
    "plan" TEXT NOT NULL DEFAULT 'PME_S',
    "nb_employes" TEXT,
    "frais_mensuel" DECIMAL(10,2),
    "dotation_max" DECIMAL(10,2),
    "montant_max_wallet" DECIMAL(12,2),
    "kyb_valide" BOOLEAN NOT NULL DEFAULT false,
    "taux_commission_defaut" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KybDossier" (
    "id" TEXT NOT NULL,
    "entreprise_id" TEXT NOT NULL,
    "statut" "StatutKyb" NOT NULL DEFAULT 'NON_SOUMIS',
    "soumis_at" TIMESTAMP(3),
    "valide_at" TIMESTAMP(3),
    "valide_par" TEXT,
    "rejete_at" TIMESTAMP(3),
    "rejete_par" TEXT,
    "kyb_deadline" TIMESTAMP(3) NOT NULL,
    "kyb_deadline_extended_at" TIMESTAMP(3),
    "note_admin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KybDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KybDocument" (
    "id" TEXT NOT NULL,
    "dossier_id" TEXT NOT NULL,
    "type" "TypeKybDocument" NOT NULL,
    "statut" "StatutKybDocument" NOT NULL DEFAULT 'EN_ATTENTE',
    "fichier_url" TEXT NOT NULL,
    "fichier_nom" TEXT NOT NULL,
    "fichier_taille" INTEGER NOT NULL,
    "fichier_format" TEXT NOT NULL,
    "cloudinary_id" TEXT,
    "motif_rejet" TEXT,
    "rejete_par" TEXT,
    "rejete_at" TIMESTAMP(3),
    "valide_par" TEXT,
    "valide_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "remplace_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KybDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienEntrepriseBeneficiaire" (
    "id" TEXT NOT NULL,
    "entreprise_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "niveau" "NiveauSalarie" NOT NULL,
    "allocation_mensuelle" DECIMAL(10,2) NOT NULL DEFAULT 5000,
    "date_debut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_fin" TIMESTAMP(3),
    "statut" "StatutLien" NOT NULL DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LienEntrepriseBeneficiaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntrepriseAdmin" (
    "id" TEXT NOT NULL,
    "entreprise_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN_RH',
    "matricule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntrepriseAdmin_pkey" PRIMARY KEY ("id")
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
    "taux_commission" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
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
    "montant_total" DECIMAL(10,2) NOT NULL,
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
    "user_id" TEXT NOT NULL,
    "entreprise_a_id" TEXT NOT NULL,
    "entreprise_b_id" TEXT,
    "lien_a_id" TEXT NOT NULL,
    "lien_b_id" TEXT,
    "option_solde" "OptionSolde",
    "montant_rembourse" DECIMAL(10,2),
    "fedapay_remboursement_id" TEXT,
    "email_pro_avant" TEXT,
    "email_pro_apres" TEXT,
    "date_depart_a" TIMESTAMP(3),
    "archive_planifie_at" TIMESTAMP(3) NOT NULL,
    "traite_par" TEXT,
    "traite_at" TIMESTAMP(3),
    "statut" "StatutMutation" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarteDigi" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TypeCarte" NOT NULL,
    "numero_hash" TEXT NOT NULL,
    "numero_masque" TEXT NOT NULL,
    "prefixe" TEXT NOT NULL DEFAULT '4782',
    "suffixe" TEXT NOT NULL,
    "luhn_valide" BOOLEAN NOT NULL DEFAULT true,
    "date_expiration" TIMESTAMP(3) NOT NULL,
    "statut" "StatutCarte" NOT NULL DEFAULT 'ACTIVE',
    "nfc_active" BOOLEAN NOT NULL DEFAULT false,
    "nfc_derniere_utilisation" TIMESTAMP(3),
    "qr_code_url" TEXT,
    "qr_expires_at" TIMESTAMP(3),
    "qr_refresh_count" INTEGER NOT NULL DEFAULT 0,
    "adresse_livraison" TEXT,
    "code_activation_hash" TEXT,
    "activee_at" TIMESTAMP(3),
    "expedie_at" TIMESTAMP(3),
    "livree_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarteDigi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCodeTransaction" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "montant" DECIMAL(10,2),
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "utilise_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QRCodeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFCToken" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "token_unique" TEXT NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "transaction_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NFCToken_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "landing_config" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_perso_key" ON "User"("email_perso");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_pro_key" ON "User"("email_pro");

-- CreateIndex
CREATE UNIQUE INDEX "User_invitation_token_key" ON "User"("invitation_token");

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
CREATE UNIQUE INDEX "KybDossier_entreprise_id_key" ON "KybDossier"("entreprise_id");

-- CreateIndex
CREATE INDEX "KybDossier_statut_idx" ON "KybDossier"("statut");

-- CreateIndex
CREATE INDEX "KybDossier_kyb_deadline_idx" ON "KybDossier"("kyb_deadline");

-- CreateIndex
CREATE INDEX "KybDocument_dossier_id_type_idx" ON "KybDocument"("dossier_id", "type");

-- CreateIndex
CREATE INDEX "KybDocument_statut_idx" ON "KybDocument"("statut");

-- CreateIndex
CREATE INDEX "LienEntrepriseBeneficiaire_entreprise_id_statut_idx" ON "LienEntrepriseBeneficiaire"("entreprise_id", "statut");

-- CreateIndex
CREATE INDEX "LienEntrepriseBeneficiaire_user_id_statut_idx" ON "LienEntrepriseBeneficiaire"("user_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "LienEntrepriseBeneficiaire_entreprise_id_user_id_statut_key" ON "LienEntrepriseBeneficiaire"("entreprise_id", "user_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "EntrepriseAdmin_user_id_key" ON "EntrepriseAdmin"("user_id");

-- CreateIndex
CREATE INDEX "EntrepriseAdmin_entreprise_id_idx" ON "EntrepriseAdmin"("entreprise_id");

-- CreateIndex
CREATE UNIQUE INDEX "EntrepriseAdmin_entreprise_id_matricule_key" ON "EntrepriseAdmin"("entreprise_id", "matricule");

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
CREATE INDEX "Mutation_user_id_idx" ON "Mutation"("user_id");

-- CreateIndex
CREATE INDEX "Mutation_statut_idx" ON "Mutation"("statut");

-- CreateIndex
CREATE INDEX "Mutation_archive_planifie_at_idx" ON "Mutation"("archive_planifie_at");

-- CreateIndex
CREATE UNIQUE INDEX "CarteDigi_numero_hash_key" ON "CarteDigi"("numero_hash");

-- CreateIndex
CREATE INDEX "CarteDigi_user_id_statut_idx" ON "CarteDigi"("user_id", "statut");

-- CreateIndex
CREATE INDEX "CarteDigi_numero_hash_idx" ON "CarteDigi"("numero_hash");

-- CreateIndex
CREATE UNIQUE INDEX "QRCodeTransaction_nonce_key" ON "QRCodeTransaction"("nonce");

-- CreateIndex
CREATE INDEX "QRCodeTransaction_nonce_idx" ON "QRCodeTransaction"("nonce");

-- CreateIndex
CREATE INDEX "QRCodeTransaction_wallet_id_utilise_idx" ON "QRCodeTransaction"("wallet_id", "utilise");

-- CreateIndex
CREATE UNIQUE INDEX "NFCToken_token_unique_key" ON "NFCToken"("token_unique");

-- CreateIndex
CREATE INDEX "NFCToken_token_unique_idx" ON "NFCToken"("token_unique");

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

-- CreateIndex
CREATE UNIQUE INDEX "landing_config_section_key" ON "landing_config"("section");

-- AddForeignKey
ALTER TABLE "KybDossier" ADD CONSTRAINT "KybDossier_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KybDocument" ADD CONSTRAINT "KybDocument_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "KybDossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienEntrepriseBeneficiaire" ADD CONSTRAINT "LienEntrepriseBeneficiaire_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienEntrepriseBeneficiaire" ADD CONSTRAINT "LienEntrepriseBeneficiaire_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrepriseAdmin" ADD CONSTRAINT "EntrepriseAdmin_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrepriseAdmin" ADD CONSTRAINT "EntrepriseAdmin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_entreprise_a_id_fkey" FOREIGN KEY ("entreprise_a_id") REFERENCES "Entreprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mutation" ADD CONSTRAINT "Mutation_entreprise_b_id_fkey" FOREIGN KEY ("entreprise_b_id") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarteDigi" ADD CONSTRAINT "CarteDigi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_telephone_fkey" FOREIGN KEY ("telephone") REFERENCES "User"("telephone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
