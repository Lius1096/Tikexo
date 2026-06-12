Tu es un architecte fullstack senior. Tu vas scaffolder de A à Z le projet TIKEXO — une plateforme SaaS de titre-restaurant digitalisé pour le Bénin (Afrique de l'Ouest). Le domaine de production est tikexo.bj

## Stack technique imposée
- Backend : Node.js + Express.js
- Base de données : PostgreSQL
- ORM : Prisma
- Frontend web (portail Admin TIKEXO + portail Employeur) : React 18 + Vite + TypeScript
- App mobile bénéficiaire + commerçant : React Native + Expo
- CSS : Tailwind CSS v3
- Paiement : FedaPay (SDK Node.js)
- Stockage médias (photos commerçants, KYC commerçants, QR codes) : Cloudinary
- Conteneurisation : Docker + Docker Compose
- Reverse proxy / SSL : Traefik v3
- Versioning : Git (structure prête pour GitHub)
- Notifications push : Firebase Cloud Messaging (FCM)
- Temps réel (solde live) : Socket.io

## Identité visuelle TIKEXO
Nom commercial : TIKEXO
Domaine : tikexo.bj
Slogan : "Ton repas, ton droit"

Couleurs :
  - Primary (bleu marine) : #1A3C5E
  - Accent (bleu ciel) : #0EA5E9
  - Gold : #B45309
  - Success (vert) : #166534
  - Danger (rouge) : #991B1B
  - Light Blue (fond) : #DBEAFE
  - Light Gray (fond) : #F1F5F9
  - White : #FFFFFF
  - Dark Text : #1E293B

Typographie :
  - Titres : Inter Bold
  - Corps : Inter Regular
  - Chiffres/montants : JetBrains Mono (monospace)

Partout dans le code, les commentaires, les emails, les notifications
et les interfaces : utiliser "TIKEXO" (jamais DIGI, jamais Pluxee).

## Principes métier fondamentaux (à respecter dans tout le code)

### Principe 1 — Le wallet bénéficiaire est strictement passif
Le salarié ne peut JAMAIS alimenter son propre wallet TIKEXO.
Sources de crédit autorisées : uniquement les dotations employeur.
Le salarié dépense uniquement ce que son employeur lui a versé.
Aucun plafond KYC sur les montants de dotation : peu importe
ce que l'employeur verse, le risque est couvert par le KYB entreprise.

### Principe 2 — KYC uniquement pour ceux qui reçoivent de l'argent réel
Bénéficiaire rattaché à une entreprise KYB validée → KYC ZÉRO.
  Justification : l'entreprise répond de lui contractuellement.
  Son email personnel est l'identifiant pivot permanent.
  Son email pro est temporaire (disparaît au départ de l'entreprise).
Bénéficiaire wallet autonome (après départ) → KYC ZÉRO.
  Il dépense uniquement son solde résiduel déjà tracé.
Commerçant → KYB obligatoire (IFU + pièce d'identité gérant).
  Justification : il reçoit de l'argent réel via FedaPay Payout.

### Principe 3 — Email personnel = identité pivot permanente
L'email personnel du salarié survit à tous les changements d'employeur.
L'email pro est utilisé uniquement pour envoyer les accès initiaux.
Au départ de l'entreprise : email pro supprimé du compte, email
perso reste. L'entreprise B retrouve le compte existant via
email perso OU numéro de téléphone. Jamais de doublon.

### Principe 4 — Le wallet interne TIKEXO évite les frais FedaPay
FedaPay n'est appelé QUE pour :
  - Entrée : rechargement wallet entreprise (collecte FedaPay)
  - Sortie : reversement commerçant (payout FedaPay)
  - Sortie : remboursement part salarié au départ (payout FedaPay)
Tout le reste (dotations, paiements, commissions) = écritures
internes dans le ledger TIKEXO. Zéro frais FedaPay sur ces flux.
Exemple : 10 salariés, 5 restaurants, 200 transactions/mois
  → Approche naïve : 211 appels FedaPay
  → Architecture TIKEXO : 6 appels seulement (1 collecte + 5 payouts)
  → Frais divisés par 35

### Principe 5 — Le LedgerEntry est immuable et append-only
Jamais de UPDATE ni DELETE sur LedgerEntry et AuditLog.
Tout mouvement de fonds crée une nouvelle entrée.
Prisma middleware bloque toute tentative de modification.

## Architecture des dossiers à créer

tikexo/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── traefik/
│   ├── traefik.yml
│   └── dynamic/
│       └── middlewares.yml
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── jest.config.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── index.js
│       ├── config/
│       │   ├── database.js
│       │   ├── fedapay.js
│       │   ├── cloudinary.js
│       │   └── firebase.js
│       ├── middlewares/
│       │   ├── auth.js
│       │   ├── rateLimiter.js
│       │   └── errorHandler.js
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.routes.js
│       │   │   ├── auth.controller.js
│       │   │   └── auth.service.js
│       │   ├── entreprise/
│       │   │   ├── entreprise.routes.js
│       │   │   ├── entreprise.controller.js
│       │   │   └── entreprise.service.js
│       │   ├── beneficiaire/
│       │   │   ├── beneficiaire.routes.js
│       │   │   ├── beneficiaire.controller.js
│       │   │   └── beneficiaire.service.js
│       │   ├── commercant/
│       │   │   ├── commercant.routes.js
│       │   │   ├── commercant.controller.js
│       │   │   └── commercant.service.js
│       │   ├── wallet/
│       │   │   ├── wallet.routes.js
│       │   │   ├── wallet.controller.js
│       │   │   └── wallet.service.js
│       │   ├── transaction/
│       │   │   ├── transaction.routes.js
│       │   │   ├── transaction.controller.js
│       │   │   └── transaction.service.js
│       │   ├── dotation/
│       │   │   ├── dotation.routes.js
│       │   │   ├── dotation.controller.js
│       │   │   └── dotation.service.js
│       │   ├── fedapay/
│       │   │   ├── fedapay.routes.js
│       │   │   ├── fedapay.controller.js
│       │   │   └── fedapay.service.js
│       │   ├── mutation/
│       │   │   ├── mutation.routes.js
│       │   │   ├── mutation.controller.js
│       │   │   └── mutation.service.js
│       │   └── admin/
│       │       ├── admin.routes.js
│       │       ├── admin.controller.js
│       │       └── admin.service.js
│       ├── utils/
│       │   ├── otp.js
│       │   ├── qrcode.js
│       │   ├── ledger.js
│       │   ├── kyc.js
│       │   ├── antiFraude.js
│       │   └── jours-feries-benin.js
│       └── __tests__/
│           ├── setup.js
│           ├── unit/
│           │   ├── ledger.test.js
│           │   ├── antiFraude.test.js
│           │   ├── otp.test.js
│           │   ├── kyc.test.js
│           │   ├── jours-feries-benin.test.js
│           │   └── fedapay.service.test.js
│           ├── integration/
│           │   ├── auth.integration.test.js
│           │   ├── transaction.integration.test.js
│           │   ├── wallet.integration.test.js
│           │   ├── dotation.integration.test.js
│           │   └── mutation.integration.test.js
│           ├── load/
│           │   ├── transaction-load.test.js
│           │   └── rechargement-load.test.js
│           └── security/
│               ├── auth.security.test.js
│               ├── rate-limit.security.test.js
│               └── ledger.security.test.js
├── web/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── playwright.config.ts
│   ├── e2e/
│   │   ├── admin-entreprise.e2e.ts
│   │   ├── employeur-dotation.e2e.ts
│   │   └── login-otp.e2e.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── design-system/
│       │   ├── tokens.ts
│       │   └── components/
│       │       ├── Button.tsx
│       │       ├── Badge.tsx
│       │       ├── Card.tsx
│       │       ├── Table.tsx
│       │       └── Modal.tsx
│       ├── layouts/
│       │   ├── AdminLayout.tsx
│       │   └── EmployeurLayout.tsx
│       └── pages/
│           ├── admin/
│           │   ├── Dashboard.tsx
│           │   ├── Entreprises.tsx
│           │   ├── Commercants.tsx
│           │   ├── Mutations.tsx
│           │   └── AuditLog.tsx
│           └── employeur/
│               ├── Dashboard.tsx
│               ├── Beneficiaires.tsx
│               ├── Dotations.tsx
│               ├── Wallet.tsx
│               └── Rapports.tsx
└── mobile/
    ├── package.json
    ├── app.json
    └── src/
        ├── design-system/
        │   └── tokens.ts
        ├── navigation/
        │   ├── BeneficiaireNav.tsx
        │   └── CommercantNav.tsx
        └── screens/
            ├── beneficiaire/
            │   ├── Accueil.tsx
            │   ├── Paiement.tsx
            │   ├── Historique.tsx
            │   ├── CarteVirtuelle.tsx
            │   └── Carte.tsx
            └── commercant/
                ├── Dashboard.tsx
                ├── QrCode.tsx
                ├── Historique.tsx
                └── Reversements.tsx

## Schéma Prisma complet (prisma/schema.prisma)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                    String     @id @default(cuid())
  telephone             String     @unique
  nom                   String
  prenom                String
  email_perso           String?    @unique  // pivot permanent, survit au changement d'employeur
  email_pro             String?             // temporaire, supprimé au départ de l'entreprise
  pin_hash              String?
  biometrie_activee     Boolean    @default(false)
  role                  Role
  statut                StatutUser @default(INACTIF)

  // KYC simplifié : ZERO pour bénéficiaires, KYB pour commerçants
  kyc_niveau            NiveauKYC  @default(ZERO)
  kyc_via_entreprise    Boolean    @default(false)
  // si true = KYC couvert par le KYB de l'entreprise rattachée
  // si false = commerçant avec KYB propre ou wallet autonome

  fcm_token             String?
  langue                String     @default("fr")
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  wallet                Wallet?
  otpCodes              OtpCode[]
  notifications         Notification[]
  auditLogs             AuditLog[]
  cartesVirtuelles      CarteDigi[]
  liensBeneficiaire     LienEntrepriseBeneficiaire[] @relation("UserLiens")
  commercant            Commercant?
  mutationsInitiees     Mutation[] @relation("MutationInitiateur")
  mutationsBenef        Mutation[] @relation("MutationBeneficiaire")

  @@index([telephone])
  @@index([email_perso])
  @@index([role, statut])
}

model Entreprise {
  id                      String           @id @default(cuid())
  nom                     String
  rccm                    String?
  nif                     String           @unique
  secteur                 String?
  adresse                 String?
  ville                   String           @default("Cotonou")
  telephone_rh            String?
  email_rh                String?
  statut                  StatutEntreprise @default(EN_ATTENTE)
  kyb_valide              Boolean          @default(false)
  // kyb_valide = true → tous les salariés rattachés ont kyc_niveau = ZERO
  taux_commission_defaut  Decimal          @db.Decimal(5,2) @default(2.00)
  createdAt               DateTime         @default(now())
  updatedAt               DateTime         @updatedAt

  wallet                  Wallet?
  liensBeneficiaires      LienEntrepriseBeneficiaire[]
  dotations               Dotation[]
  mutationsSortie         Mutation[]  @relation("MutationEntrepriseA")
  mutationsEntree         Mutation[]  @relation("MutationEntrepriseB")
  fedapayOperations       FedapayOperation[]

  @@index([statut])
  @@index([kyb_valide])
}

model LienEntrepriseBeneficiaire {
  id                  String        @id @default(cuid())
  entreprise_id       String
  user_id             String
  niveau              NiveauSalarie
  valeur_titre        Decimal       @db.Decimal(10,2)
  taux_participation  Decimal       @db.Decimal(5,2)
  date_debut          DateTime      @default(now())
  date_fin            DateTime?
  statut              StatutLien    @default(ACTIF)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  entreprise          Entreprise    @relation(fields: [entreprise_id], references: [id])
  user                User          @relation("UserLiens", fields: [user_id], references: [id])
  dotations           Dotation[]

  @@unique([entreprise_id, user_id, statut])
  @@index([entreprise_id, statut])
  @@index([user_id, statut])
}

model Wallet {
  id             String       @id @default(cuid())
  user_id        String?      @unique
  entreprise_id  String?      @unique
  type           TypeWallet
  solde          Decimal      @db.Decimal(12,2) @default(0)
  solde_reserve  Decimal      @db.Decimal(12,2) @default(0)
  currency       String       @default("XOF")
  statut         StatutWallet @default(ACTIF)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  user           User?        @relation(fields: [user_id], references: [id])
  entreprise     Entreprise?  @relation(fields: [entreprise_id], references: [id])
  ledgerEntrees  LedgerEntry[] @relation("WalletSource")
  ledgerSorties  LedgerEntry[] @relation("WalletDestination")

  @@index([type, statut])
}

// CŒUR DU SYSTÈME — IMMUABLE — JAMAIS DE UPDATE NI DELETE
model LedgerEntry {
  id                    String     @id @default(cuid())
  wallet_source_id      String?    // null = entrée externe (rechargement FedaPay)
  wallet_destination_id String?    // null = sortie externe (payout FedaPay)
  montant               Decimal    @db.Decimal(12,2)
  type                  TypeLedger
  reference_fedapay     String?
  transaction_id        String?
  source_entreprise_id  String?    // traçabilité pour remboursement au départ
  metadata              Json?
  createdAt             DateTime   @default(now())

  walletSource          Wallet?    @relation("WalletSource", fields: [wallet_source_id], references: [id])
  walletDestination     Wallet?    @relation("WalletDestination", fields: [wallet_destination_id], references: [id])
  transaction           Transaction? @relation(fields: [transaction_id], references: [id])

  @@index([wallet_source_id, createdAt])
  @@index([wallet_destination_id, createdAt])
  @@index([type, createdAt])
  @@index([reference_fedapay])
}

model Transaction {
  id                    String            @id @default(cuid())
  beneficiaire_id       String
  commercant_id         String
  montant_total         Decimal           @db.Decimal(10,2)
  montant_tikexo        Decimal           @db.Decimal(10,2)
  montant_complement    Decimal           @db.Decimal(10,2) @default(0)
  commission_tikexo     Decimal           @db.Decimal(10,2)
  statut                StatutTransaction @default(EN_COURS)
  fedapay_complement_id String?
  source_entreprise_id  String?           // pour ordre FIFO au remboursement
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  beneficiaire          User              @relation(fields: [beneficiaire_id], references: [id])
  commercant            Commercant        @relation(fields: [commercant_id], references: [id])
  ledgerEntries         LedgerEntry[]

  @@index([beneficiaire_id, createdAt])
  @@index([commercant_id, createdAt])
  @@index([statut])
}

model Commercant {
  id                      String           @id @default(cuid())
  user_id                 String           @unique
  nom                     String
  type                    TypeCommercant
  ifu                     String?          // nullable = commerçant SIMPLIFIE sans IFU autorisé
  niveau                  NiveauCommercant @default(SIMPLIFIE)
  mobile_money_numero     String
  mobile_money_operateur  OperateurMobile
  latitude                Decimal?         @db.Decimal(10,8)
  longitude               Decimal?         @db.Decimal(11,8)
  adresse                 String?
  ville                   String           @default("Cotonou")
  horaires                Json?
  statut                  StatutCommercant @default(SOUMIS)
  photo_url               String?
  qr_code_url             String?
  taux_commission         Decimal          @db.Decimal(5,2) @default(2.00)
  mode_reversement        ModeReversement  @default(AUTO_72H)
  plafond_mensuel         Decimal          @db.Decimal(12,2) @default(500000)
  volume_mensuel_cumule   Decimal          @db.Decimal(12,2) @default(0)
  note_moyenne            Decimal          @db.Decimal(3,2)  @default(0)
  createdAt               DateTime         @default(now())
  updatedAt               DateTime         @updatedAt

  user                    User             @relation(fields: [user_id], references: [id])
  transactions            Transaction[]
  fedapayPayouts          FedapayOperation[]

  @@index([statut])
  @@index([ville, statut])
  @@index([latitude, longitude])
}

model FedapayOperation {
  id                     String        @id @default(cuid())
  type                   TypeFedapay
  fedapay_transaction_id String        @unique  // idempotence absolue
  montant                Decimal       @db.Decimal(12,2)
  statut                 StatutFedapay @default(EN_ATTENTE)
  wallet_id              String?
  entreprise_id          String?
  commercant_id          String?
  tentatives             Int           @default(0)
  prochaine_tentative    DateTime?
  webhook_payload        Json?
  erreur_message         String?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  entreprise             Entreprise?   @relation(fields: [entreprise_id], references: [id])
  commercant             Commercant?   @relation(fields: [commercant_id], references: [id])

  @@index([statut, prochaine_tentative])
  @@index([type, statut])
}

model Dotation {
  id               String         @id @default(cuid())
  entreprise_id    String
  beneficiaire_id  String
  lien_id          String
  nb_titres        Int
  montant_total    Decimal        @db.Decimal(10,2)
  part_employeur   Decimal        @db.Decimal(10,2)
  part_salarie     Decimal        @db.Decimal(10,2)
  mois_concerne    DateTime
  statut           StatutDotation @default(CALCULE)
  valide_par       String?
  valide_at        DateTime?
  distribue_at     DateTime?
  createdAt        DateTime       @default(now())

  entreprise       Entreprise     @relation(fields: [entreprise_id], references: [id])
  lien             LienEntrepriseBeneficiaire @relation(fields: [lien_id], references: [id])

  @@unique([lien_id, mois_concerne])
  @@index([entreprise_id, mois_concerne])
  @@index([statut])
}

model Mutation {
  id                       String         @id @default(cuid())
  initiateur_id            String
  beneficiaire_id          String
  entreprise_a_id          String
  entreprise_b_id          String
  statut                   StatutMutation @default(EN_ATTENTE_A)
  option_solde             OptionSolde?
  montant_rembourse        Decimal?       @db.Decimal(10,2)
  date_depart_a            DateTime?
  date_entree_b            DateTime?
  fedapay_remboursement_id String?
  motif                    String?
  valide_a_at              DateTime?
  valide_b_at              DateTime?
  createdAt                DateTime       @default(now())
  updatedAt                DateTime       @updatedAt

  initiateur               User           @relation("MutationInitiateur", fields: [initiateur_id], references: [id])
  beneficiaire             User           @relation("MutationBeneficiaire", fields: [beneficiaire_id], references: [id])
  entrepriseA              Entreprise     @relation("MutationEntrepriseA", fields: [entreprise_a_id], references: [id])
  entrepriseB              Entreprise     @relation("MutationEntrepriseB", fields: [entreprise_b_id], references: [id])

  @@index([beneficiaire_id])
  @@index([statut])
}

model CarteDigi {
  id                String      @id @default(cuid())
  user_id           String
  type              TypeCarte
  numero_masque     String      // 4 derniers chiffres uniquement — jamais le numéro complet
  statut            StatutCarte @default(ACTIVE)
  date_expiration   DateTime
  adresse_livraison String?
  createdAt         DateTime    @default(now())

  user              User        @relation(fields: [user_id], references: [id])

  @@index([user_id, statut])
}

// IMMUABLE — JAMAIS DE UPDATE NI DELETE
model AuditLog {
  id         String   @id @default(cuid())
  user_id    String?
  action     String
  entite     String
  entite_id  String?
  avant      Json?
  apres      Json?
  ip         String?
  user_agent String?
  createdAt  DateTime @default(now())

  user       User?    @relation(fields: [user_id], references: [id])

  @@index([user_id, createdAt])
  @@index([entite, entite_id])
  @@index([createdAt])
}

model OtpCode {
  id         String   @id @default(cuid())
  telephone  String
  code_hash  String
  expiration DateTime
  utilise    Boolean  @default(false)
  tentatives Int      @default(0)
  createdAt  DateTime @default(now())

  user       User?    @relation(fields: [telephone], references: [telephone])

  @@index([telephone, utilise, expiration])
}

model Notification {
  id        String           @id @default(cuid())
  user_id   String
  titre     String
  corps     String
  type      TypeNotification
  lu        Boolean          @default(false)
  fcm_token String?
  createdAt DateTime         @default(now())

  user      User             @relation(fields: [user_id], references: [id])

  @@index([user_id, lu])
}

// ── ENUMS ─────────────────────────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  ADMIN_OPS
  ADMIN_RH
  GESTIONNAIRE_RH
  MANAGER
  BENEFICIAIRE
  COMMERCANT
}

enum StatutUser {
  INACTIF
  EN_ATTENTE_KYC
  ACTIF
  SUSPENDU
  BLOQUE
  ARCHIVE
}

// KYC simplifié TIKEXO :
// ZERO  = bénéficiaire rattaché entreprise KYB validée (pas de vérif individuelle)
// KYB   = commerçant avec vérification IFU + pièce d'identité
enum NiveauKYC {
  ZERO
  KYB
}

enum StatutEntreprise {
  EN_ATTENTE
  ACTIF
  SUSPENDU
  ARCHIVE
}

enum StatutLien {
  ACTIF
  TERMINE
  EN_COURS_PREAVIS
}

enum NiveauSalarie {
  DIRECTEUR
  MANAGER
  CADRE
  AGENT_MAITRISE
  EMPLOYE
  STAGIAIRE
}

enum TypeWallet {
  ENTREPRISE
  BENEFICIAIRE
  COMMERCANT
  PLATEFORME
}

enum StatutWallet {
  ACTIF
  GELE
  FERME
}

enum TypeLedger {
  RECHARGEMENT
  DOTATION
  PAIEMENT
  COMMISSION
  PAYOUT
  REMBOURSEMENT
  COMPLEMENT
}

enum StatutTransaction {
  EN_COURS
  VALIDEE
  ECHEC
  REMBOURSEE
  ANNULEE
}

enum TypeCommercant {
  RESTAURANT
  BOULANGERIE
  EPICERIE
  TRAITEUR
  CAFETERIA
  LIVRAISON
  SUPERMARCHE
}

enum NiveauCommercant {
  VERIFIE    // avec IFU — plafond illimité
  SIMPLIFIE  // sans IFU — plafond 500 000 XOF/mois
}

enum StatutCommercant {
  SOUMIS
  EN_VERIFICATION
  VALIDE
  ACTIF
  SUSPENDU
  ARCHIVE
}

enum OperateurMobile {
  MTN
  MOOV
  CELTIS
}

enum ModeReversement {
  AUTO_72H   // commission 2%
  MENSUEL    // commission 1.5% (remise fidélité — batching maximal)
}

enum TypeFedapay {
  COLLECTE
  PAYOUT
}

enum StatutFedapay {
  EN_ATTENTE
  APPROUVE
  ECHOUE
}

enum StatutDotation {
  CALCULE
  VALIDE
  DISTRIBUE
}

enum StatutMutation {
  EN_ATTENTE_A
  VALIDE_A
  EN_ATTENTE_B
  COMPLETE
  ANNULE
}

enum OptionSolde {
  CONSERVATION
  REMBOURSEMENT
}

enum TypeCarte {
  VIRTUELLE
  PHYSIQUE
}

enum StatutCarte {
  ACTIVE
  BLOQUEE
  EXPIREE
  PERDUE
}

enum TypeNotification {
  RECHARGEMENT
  TRANSACTION
  SOLDE_FAIBLE
  SECURITE
  SYSTEME
  MARKETING
}

## Fichiers de configuration à générer

### docker-compose.yml (production)
- Service postgres : image postgres:16-alpine, volume tikexo_pgdata,
  healthcheck pg_isready, POSTGRES_DB=tikexo_prod
- Service backend : build ./backend, dépend postgres healthy,
  labels Traefik Host(tikexo.bj) port 3001 HTTPS
- Service web : build ./web,
  labels Traefik Host(tikexo.bj) paths /admin /employeur port 5173
- Service traefik : image traefik:v3.0, ports 80/443/8080,
  volume /var/run/docker.sock + ./traefik
- Réseau interne : tikexo-network
- Toutes les variables sensibles via fichier .env racine

### docker-compose.dev.yml (développement local)
- postgres exposé sur localhost:5432 (accès DBeaver/VS Code/TablePlus)
- backend : volume ./backend/src monté + nodemon hot-reload, port 3001
- web : volume ./web/src monté + Vite HMR, port 5173
- Sans Traefik en dev
- Base : tikexo_dev

### traefik/traefik.yml
- Entrypoint web (80) → redirect automatique vers websecure (443)
- Entrypoint websecure (443) avec TLS
- ACME Let's Encrypt, email via variable d'environnement
- Dashboard sur :8080 protégé par auth basique
- Logs format JSON

### backend/.env.example
DATABASE_URL="postgresql://tikexo:password@postgres:5432/tikexo_prod"
DATABASE_TEST_URL="postgresql://tikexo:password@localhost:5432/tikexo_test"
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
FEDAPAY_SECRET_KEY=
FEDAPAY_PUBLIC_KEY=
FEDAPAY_ENV="sandbox"
FEDAPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
PORT=3001
NODE_ENV="development"
TIKEXO_COMMISSION_DEFAULT=2.00
TIKEXO_COMMISSION_MENSUEL=1.50
TIKEXO_PAYOUT_SEUIL_MINIMUM=1000
TIKEXO_PAYOUT_CYCLE_HEURES=72
TIKEXO_PLAFOND_JOURNALIER_DEFAULT=10000
TIKEXO_PLAFOND_SIMPLIFIE_MENSUEL=500000
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
SMS_API_KEY=
FRONTEND_URL="https://tikexo.bj"
REDIS_URL=

### tailwind.config.ts
colors:
  tikexo:
    primary:    '#1A3C5E'
    accent:     '#0EA5E9'
    gold:       '#B45309'
    success:    '#166534'
    danger:     '#991B1B'
    light-blue: '#DBEAFE'
    light-gray: '#F1F5F9'
    dark:       '#1E293B'
fontFamily:
  sans: ['Inter', 'sans-serif']
  mono: ['JetBrains Mono', 'monospace']

### mobile/app.json
name: "Tikexo"
slug: "tikexo"
version: "1.0.0"
scheme: "tikexo"
icon: "./assets/icon.png"
splash.backgroundColor: "#1A3C5E"
ios.bundleIdentifier: "bj.tikexo.app"
android.package: "bj.tikexo.app"

## Logique critique à implémenter entièrement (zéro TODO)

### utils/ledger.js
// Moteur wallet interne TIKEXO
// Règle absolue : toute modification de solde passe par ce fichier uniquement

creerEcritureLedger(prisma, { walletSourceId, walletDestId, montant, type, metadata })
  → prisma.$transaction() atomique :
      1. Créer LedgerEntry
      2. Si walletSourceId : vérifier solde suffisant, décrémenter solde
      3. Si walletDestId : incrémenter solde
  → Lève SoldeInsuffisantError si solde source < montant
  → Jamais d'UPDATE direct sur wallet.solde en dehors de cette fonction

crediterWallet(prisma, walletId, montant, type, metadata)
  → walletSourceId = null (entrée externe FedaPay)

debiterWallet(prisma, walletId, montant, type, metadata)
  → walletDestId = null (sortie externe FedaPay)

transfererEntreWallets(prisma, sourceId, destId, montant, type, metadata)
  → mouvement interne : source → destination
  → atomique, rollback complet si échec

calculerSoldeSegmente(prisma, userId)
  → retourne {
      solde_total,
      sources: [{ entreprise_id, entreprise_nom, montant }]
    }
  → basé sur LedgerEntry.source_entreprise_id
  → utile pour calculer le remboursement exact au départ

verifierSolde(prisma, walletId, montantRequis)
  → retourne boolean

verifierPlafondJournalier(prisma, beneficiaireId, montantNouveau, plafond)
  → somme les transactions VALIDEES du jour calendaire en cours
  → retourne { autorise: boolean, cumul_jour, reste }

### utils/kyc.js
// Logique KYC simplifiée TIKEXO
// Règle : KYC uniquement pour ceux qui reçoivent de l'argent réel (commerçants)
// Les bénéficiaires salariés sont couverts par le KYB de leur entreprise

validerKYCViaBeneficiaire(prisma, userId, entrepriseId)
  → vérifie que entreprise.kyb_valide = true
  → met user.kyc_via_entreprise = true + user.kyc_niveau = ZERO
  → appelé automatiquement à la création d'un LienEntrepriseBeneficiaire

cascadeKYCApresDepart(prisma, userId)
  → appelé quand un lien entreprise passe à TERMINE
  → si l'utilisateur n'a plus aucun lien ACTIF :
      user.kyc_via_entreprise = false
      (kyc_niveau reste ZERO car solde résiduel = argent déjà tracé)
  → envoie notification : "Vous pouvez continuer à utiliser votre solde TIKEXO"

verifierAccesTransaction(prisma, userId)
  → retourne { autorise: boolean, motif? }
  → autorise = true si :
      kyc_niveau = ZERO ET (kyc_via_entreprise = true OU solde résiduel > 0)
  → autorise = false uniquement si compte BLOQUE ou ARCHIVE

### utils/antiFraude.js
// 8 règles, 4 niveaux : ALERTE | CONFIRMATION | BLOCAGE_TEMPORAIRE | BLOCAGE_DEFINITIF

Règle 1 — Vélocité : > 3 transactions même commerçant en < 10 min → NIVEAU 3
Règle 2 — Montant anormal : > 3× moyenne 30 jours → NIVEAU 2
Règle 3 — Hors zone habituelle (si géoloc activée) → NIVEAU 1
Règle 4 — PIN répété : 3 échecs en < 5 min → NIVEAU 3, 10 cumulés → NIVEAU 4
Règle 5 — Multi-comptes même téléphone → NIVEAU 4
Règle 6 — Volume commerçant anormal sur 24h → NIVEAU 2 côté commerçant
Règle 7 — Dotation > 5× dotation habituelle → règle des 4 yeux obligatoire
Règle 8 — > 3 rechargements échoués en 1h → blocage rechargement

evaluerTransaction(prisma, { beneficiaireId, commercantId, montant, localisation? })
  → évalue toutes les règles applicables
  → retourne { niveau: 0|1|2|3|4, regles_declenchees: [], action_requise }

### fedapay/fedapay.service.js
// Principe : FedaPay = frontière uniquement
// Dotations et paiements internes = 0 appel FedaPay

creerCollecte(prisma, { entrepriseId, montant, telephonePayeur })
  → crée FedapayOperation en base AVANT d'appeler FedaPay (idempotence)
  → retourne { fedapay_transaction_id, payment_url }

traiterWebhook(prisma, { payload, signature })
  → vérifie signature HMAC avec FEDAPAY_WEBHOOK_SECRET
  → vérifie idempotence : si fedapay_transaction_id déjà APPROUVE → ignorer
  → si APPROUVE : appelle ledger.crediterWallet(wallet entreprise)
  → si ECHOUE : met à jour FedapayOperation + notifie Admin RH

declencherPayout(prisma, commercantId)
  → vérifie solde wallet commerçant >= TIKEXO_PAYOUT_SEUIL_MINIMUM
  → crée FedapayOperation PAYOUT en base
  → appelle FedaPay Payout API
  → si échec : planifie retry (max 3, intervalles de 1h)

jobBatchingPayouts(prisma)
  → cron toutes les 72h ouvrées (lundi-vendredi, 8h-18h heure Bénin)
  → commerçants AUTO_72H avec solde >= seuil → payout immédiat
  → commerçants MENSUEL → payout uniquement le 1er du mois
  → 1 seul appel FedaPay par commerçant, peu importe le nombre
    de transactions accumulées depuis le dernier payout

## Stratégie de tests complète

### Tests unitaires (Jest) — couvertures minimales obligatoires
ledger.js : 100% lignes, 100% fonctions, 100% branches
antiFraude.js : 100% lignes, 100% fonctions, 100% branches
kyc.js : 100% lignes, 100% fonctions
wallet.service.js : 90%
transaction.service.js : 90%
fedapay.service.js : 85%
global : 80%

ledger.test.js :
  - creerEcritureLedger : crée LedgerEntry + met à jour les 2 soldes
  - creerEcritureLedger : lève SoldeInsuffisantError si solde < montant
  - transfererEntreWallets : rollback complet si crédit destination échoue
  - verifierPlafondJournalier : false si cumul_jour + nouveau > plafond
  - verifierPlafondJournalier : true si premier paiement du jour dans le plafond
  - calculerSoldeSegmente : retourne les bonnes sources avec les bons montants
  - LedgerEntry créée AVANT modification du solde (ordre vérifié avec spy)
  - Aucun UPDATE direct sur wallet.solde possible hors ledger.js

antiFraude.test.js :
  - Règle 1 : NIVEAU 3 si 4 transactions même commerçant en 8 min
  - Règle 1 : pas d'alerte si 3 transactions en 15 min (hors fenêtre)
  - Règle 2 : NIVEAU 2 si montant = 4× la moyenne 30 jours
  - Règle 2 : pas d'alerte si premier paiement (pas d'historique)
  - Règle 5 : NIVEAU 4 si téléphone déjà utilisé par un autre compte
  - evaluerTransaction : retourne le niveau le plus élevé si plusieurs règles

kyc.test.js :
  - validerKYCViaBeneficiaire : refuse si entreprise.kyb_valide = false
  - validerKYCViaBeneficiaire : accepte et met kyc_via_entreprise = true
  - cascadeKYCApresDepart : kyc_via_entreprise = false si plus de lien actif
  - cascadeKYCApresDepart : kyc_via_entreprise reste true si autre lien actif
  - verifierAccesTransaction : false si compte BLOQUE
  - verifierAccesTransaction : true si ZERO + solde résiduel > 0 (wallet autonome)
  - verifierAccesTransaction : JAMAIS de blocage basé sur le montant de dotation
    (le wallet est passif, pas de risque de blanchiment côté bénéficiaire)

otp.test.js :
  - genererOtp : retourne exactement 6 chiffres numériques
  - genererOtp : deux appels successifs = codes différents
  - verifierOtp : false si expiré (> 5 min)
  - verifierOtp : false si tentatives >= 3
  - verifierOtp : false si code incorrect
  - verifierOtp : true + marque utilise=true si valide
  - hasherOtp : hash différent à chaque appel (salt bcrypt)

jours-feries-benin.test.js :
  - estJourFerie('2026-01-01') → true (Nouvel An)
  - estJourFerie('2026-01-10') → true (Fête du Vodoun)
  - estJourFerie('2026-08-01') → true (Indépendance Bénin)
  - estJourFerie('2026-03-15') → false
  - estDimanche('2026-06-07') → true
  - estEligible('2026-06-08') → true (lundi ouvré)
  - estEligible('2026-06-07') → false (dimanche)
  - estEligible('2026-01-01') → false (jour férié)

fedapay.service.test.js (mock FedaPay SDK) :
  - creerCollecte : FedapayOperation créée en base AVANT appel FedaPay
  - traiterWebhook : rejette si signature HMAC invalide
  - traiterWebhook APPROUVE : crédite wallet une seule fois
  - traiterWebhook APPROUVE doublon : ignoré silencieusement (idempotence)
  - traiterWebhook ECHOUE : ne crédite pas, logge l'erreur
  - declencherPayout : ne déclenche pas si solde < seuil minimum
  - declencherPayout : planifie retry si FedaPay répond avec erreur réseau
  - jobBatchingPayouts : 1 seul appel FedaPay par commerçant (pas par transaction)

wallet.service.test.js (mock Prisma) :
  - crediterWallet : appelle creerEcritureLedger AVANT modification solde
  - debiterWallet : lève SoldeInsuffisantError si solde insuffisant
  - obtenirSoldeSegmente : retourne { sources, solde_total } correctement
  - bloquerWallet : met statut GELE + empêche toute transaction

### Tests d'intégration (Jest + Supertest + base tikexo_test)

auth.integration.test.js :
  - POST /api/v1/auth/otp/demander → 200 + OTP créé en base haché
  - POST /api/v1/auth/otp/verifier → 200 + JWT si OTP valide
  - POST /api/v1/auth/otp/verifier → 401 si OTP expiré
  - POST /api/v1/auth/otp/verifier → 429 si > 3 tentatives
  - Vérifier que l'email perso est stocké séparément de l'email pro
  - Mutation A→B : email perso reste le même identifiant pivot

transaction.integration.test.js — CRITIQUE :
  Seed : entreprise KYB validée + bénéficiaire solde 10 000 XOF + commerçant ACTIF
  - POST /api/v1/transactions → 200 : LedgerEntry créée, soldes corrects
  - POST /api/v1/transactions → 200 : commission TIKEXO déduite du montant commerçant
  - POST /api/v1/transactions → 400 si solde insuffisant (aucune LedgerEntry créée)
  - POST /api/v1/transactions → 400 si dimanche
  - POST /api/v1/transactions → 400 si plafond journalier atteint
  - POST /api/v1/transactions → 400 si commerçant SUSPENDU
  - Atomicité : si crédit commerçant échoue → débit bénéficiaire rollback
  - Vérifier que le montant de dotation n'a aucun impact sur l'autorisation
    (un salarié avec dotation de 5 000 XOF n'est pas plus bloqué qu'un à 500 000 XOF)

wallet.integration.test.js :
  - GET /api/v1/wallet/solde → solde segmenté correct par source entreprise
  - POST /api/v1/wallet/recharger → FedapayOperation créée, wallet NON crédité
  - Webhook APPROUVE → wallet crédité + LedgerEntry créée
  - Webhook APPROUVE doublon → pas de double crédit (idempotence)
  - Webhook ECHOUE → wallet non crédité + statut ECHOUE

dotation.integration.test.js :
  - Calcul nb_titres correct selon jours travaillés (hors fériés, hors dimanche)
  - Validation : solde_reserve wallet entreprise augmente
  - Distribution : wallets bénéficiaires crédités, 0 appel FedaPay vérifié
  - Rollback total si solde entreprise insuffisant au moment de distribuer
  - Impossible de créer 2 dotations pour le même salarié le même mois

mutation.integration.test.js :
  - Scénario complet : lien A fermé, lien B créé, solde résiduel A conservé
  - email_perso reste identique avant et après mutation (pivot stable)
  - email_pro mis à null au départ de A, mis à jour à l'arrivée dans B
  - B ne peut pas accéder à l'historique des transactions chez A → 403
  - Option remboursement : FedapayOperation PAYOUT créée vers Mobile Money
  - Double affiliation préavis : 2 liens coexistent avec plages de dates distinctes
  - kyc_via_entreprise reste true si le salarié rejoint B (KYB validée)

### Tests de charge (k6)

transaction-load.test.js :
  100 utilisateurs virtuels, 2 minutes en continu
  Seuils : p95 < 500ms, p99 < 1000ms, erreurs < 1%
  Vérification post-test : solde_final = solde_initial - somme_transactions

rechargement-load.test.js :
  20 employeurs rechargeant simultanément
  Seuils : p95 < 800ms, erreurs < 0.5%
  Vérification : aucun double crédit sur webhook FedaPay (idempotence)

### Tests E2E Playwright

admin-entreprise.e2e.ts :
  - Créer une entreprise → statut EN_ATTENTE visible
  - Activer → statut ACTIF + kyb_valide = true
  - Suspendre → bénéficiaires ne peuvent plus payer (403)

employeur-dotation.e2e.ts :
  - Connexion Admin RH → recharger wallet (mock webhook FedaPay)
  - Calculer dotations → valider → distribuer
  - Vérifier soldes bénéficiaires mis à jour

login-otp.e2e.ts :
  - Numéro téléphone → OTP intercepté via endpoint test
  - OTP correct → dashboard
  - OTP incorrect 3× → message de blocage

### Tests de sécurité

auth.security.test.js :
  - /api/v1/admin/** sans token → 401
  - /api/v1/admin/** avec token BENEFICIAIRE → 403
  - Injection SQL dans le champ téléphone → rejeté proprement
  - Token JWT expiré → 401
  - Token JWT falsifié → 401
  - Admin RH de A ne peut pas voir les bénéficiaires de B → 403

rate-limit.security.test.js :
  - > 10 tentatives OTP/heure même numéro → 429
  - > 100 requêtes/min même token → 429
  - Rate limit se réinitialise après la fenêtre

ledger.security.test.js :
  - UPDATE direct sur LedgerEntry → bloqué par Prisma middleware
  - DELETE sur LedgerEntry → bloqué par Prisma middleware
  - UPDATE sur AuditLog → bloqué par Prisma middleware
  - UPDATE direct sur wallet.solde hors ledger.js → bloqué

### jest.config.js
projects : unit | integration | security
timeout : 15 000ms
coverageThresholds :
  './src/utils/ledger.js'      : lines 100, functions 100, branches 100
  './src/utils/antiFraude.js'  : lines 100, functions 100, branches 100
  './src/utils/kyc.js'         : lines 100, functions 100
  './src/modules/wallet/...'   : lines 90, functions 90
  './src/modules/transaction/...': lines 90, functions 90
  './src/modules/fedapay/...'  : lines 85, functions 85
  global                       : lines 80, functions 80, branches 75

### .github/workflows/ci.yml
Jobs dans l'ordre :
  1. lint (ESLint)
  2. test-unitaire → upload coverage Codecov
  3. test-integration (service postgres:16 dans le pipeline)
  4. test-securite
  5. test-e2e (docker compose dev + Playwright)
  6. audit-dependances (npm audit --audit-level=critical)
  7. build-docker (needs: tous les jobs précédents verts)
  8. deploy-production
     → déclenché UNIQUEMENT sur push main
     → SSH tikexo.bj + docker compose pull + up --no-downtime
     → vérifier /health après déploiement
     → rollback automatique si /health ne répond pas en 60s

Règle absolue : deploy-production est bloqué si :
  - Un test échoue (unitaire, intégration, sécurité, e2e)
  - Coverage ledger.js < 100%
  - Coverage antiFraude.js < 100%
  - npm audit détecte une vulnérabilité critique
  - Build Docker échoue

## Règles de code obligatoires

1.  Toutes les routes API préfixées /api/v1/
2.  Réponses uniformes : { success, data?, error?, meta? }
3.  LedgerEntry TOUJOURS créée avant toute modification de solde
4.  Toute modification de solde passe UNIQUEMENT par utils/ledger.js
5.  Prisma middleware bloque tout UPDATE/DELETE sur LedgerEntry et AuditLog
6.  Toutes les transactions financières utilisent prisma.$transaction()
7.  Jamais de numéro de carte complet en base de données
8.  PIN et OTP hashés bcrypt rounds 12
9.  Controllers : zéro logique métier, uniquement appel service + réponse
10. Routes : uniquement définition des routes, zéro logique
11. Commentaires en français dans tout le code
12. "TIKEXO" en majuscules partout (code, logs, emails, notifications)
13. Le wallet bénéficiaire ne peut être crédité QUE par une dotation employeur
    (bloquer toute autre source de crédit sur TypeWallet.BENEFICIAIRE)
14. L'email_perso est immuable une fois défini (jamais modifiable par l'API)
15. L'email_pro est automatiquement mis à null lors de la clôture d'un lien

## Ce que tu dois produire

Génère TOUS les fichiers avec leur contenu réel et fonctionnel.
Zéro placeholder "// TODO". Zéro commentaire "à implémenter".
Les fichiers critiques (ledger.js, antiFraude.js, kyc.js,
fedapay.service.js, wallet.service.js, transaction.service.js,
tous les fichiers de tests) doivent être production-ready.

Ordre de génération :
1.  Structure complète (mkdir -p tikexo/...)
2.  package.json backend + web + mobile
3.  prisma/schema.prisma
4.  prisma/seed.js (super admin TIKEXO + wallet PLATEFORME + jours fériés Bénin)
5.  docker-compose.yml + docker-compose.dev.yml
6.  traefik/traefik.yml + dynamic/middlewares.yml
7.  .env.example racine + backend
8.  backend/src/config/ (database, fedapay, cloudinary, firebase)
9.  Prisma middleware (bloquer UPDATE/DELETE LedgerEntry + AuditLog)
10. utils/ledger.js
11. utils/antiFraude.js
12. utils/kyc.js
13. utils/jours-feries-benin.js
14. utils/otp.js
15. utils/qrcode.js
16. middlewares/ (auth, rateLimiter, errorHandler)
17. Module auth
18. Module entreprise
19. Module beneficiaire
20. Module commercant
21. Module wallet
22. Module transaction
23. Module dotation
24. Module fedapay
25. Module mutation
26. Module admin
27. web/tailwind.config.ts + design-system/tokens.ts + composants
28. mobile/app.json + design-system/tokens.ts
29. Tests unitaires (unit/)
30. Tests d'intégration (integration/)
31. Tests de sécurité (security/)
32. Tests E2E Playwright (web/e2e/)
33. Tests de charge k6 (load/)
34. .github/workflows/ci.yml
35. README.md (setup local en 5 commandes, variables d'env, architecture)

À chaque fichier, indiquer le chemin complet depuis tikexo/.