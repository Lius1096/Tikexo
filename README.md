# TIKEXO — Plateforme de titres-restaurant numériques (Bénin)

Système de gestion de tickets-restaurant numériques pour les entreprises béninoises.  
Domaine de production : **tikexo.bj**

---

## Démarrage rapide (5 commandes)

```bash
# 1. Cloner le dépôt
git clone git@github.com:tikexo/tikexo.git && cd tikexo

# 2. Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos clés (voir section Variables d'environnement)

# 3. Démarrer les services (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis

# 4. Migrer la base de données et générer le client Prisma
cd backend && npx prisma migrate dev && npx prisma generate && cd ..

# 5. Lancer en développement
docker compose -f docker-compose.dev.yml up
```

L'API est disponible sur `http://localhost:3000`, le frontend sur `http://localhost:5173`.

---

## Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL | `postgresql://tikexo:pass@localhost:5432/tikexo` |
| `REDIS_URL` | Redis pour rate limiting | `redis://localhost:6379` |
| `JWT_SECRET` | Secret JWT (≥32 chars) | `changez-moi-en-prod-tikexo` |
| `JWT_EXPIRES_IN` | Durée validité token | `7d` |
| `FEDAPAY_SECRET_KEY` | Clé API FedaPay | `sk_live_...` |
| `FEDAPAY_PUBLIC_KEY` | Clé publique FedaPay | `pk_live_...` |
| `FEDAPAY_WEBHOOK_SECRET` | Secret HMAC webhook | `whsec_...` |
| `CLOUDINARY_URL` | Stockage images/QR codes | `cloudinary://key:secret@cloud` |
| `FIREBASE_PROJECT_ID` | Notifications push FCM | `tikexo-prod` |
| `FIREBASE_PRIVATE_KEY` | Clé privée Firebase | `-----BEGIN RSA...` |
| `FIREBASE_CLIENT_EMAIL` | Email service Firebase | `firebase@tikexo-prod.iam...` |
| `NODE_ENV` | Environnement | `production` |
| `PORT` | Port serveur Express | `3000` |

---

## Architecture

```
tikexo/
├── backend/                    # API Node.js/Express
│   ├── prisma/
│   │   └── schema.prisma       # Schéma PostgreSQL (17 modèles)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # Prisma + middleware immuabilité
│   │   ├── middlewares/
│   │   │   ├── auth.js         # JWT + RBAC
│   │   │   ├── rateLimiter.js  # Rate limiting Redis
│   │   │   └── errorHandler.js
│   │   ├── modules/
│   │   │   ├── auth/           # OTP bcrypt 12 rounds
│   │   │   ├── transaction/    # Pipeline validation complet
│   │   │   ├── dotation/       # Calcul jours ouvrés Bénin
│   │   │   ├── mutation/       # Changement d'employeur
│   │   │   ├── fedapay/        # Intégration paiement + webhook
│   │   │   ├── wallet/         # Gestion wallets + Socket.io
│   │   │   └── ...
│   │   └── utils/
│   │       ├── ledger.js       # Ledger immuable — CRITIQUE
│   │       ├── antiFraude.js   # 8 règles, 4 niveaux — CRITIQUE
│   │       ├── kyc.js          # KYC par proxy — CRITIQUE
│   │       ├── otp.js          # Génération/vérification OTP
│   │       ├── qrcode.js       # QR codes Cloudinary
│   │       └── jours-feries-benin.js
│   └── src/__tests__/
│       ├── unit/               # Tests unitaires (couverture 100% critiques)
│       ├── integration/        # Tests intégration (PostgreSQL réel)
│       ├── security/           # Tests immuabilité + auth + rate limit
│       └── load/               # Tests k6 (p95<500ms, p99<1000ms)
├── web/                        # React 18/Vite/TypeScript
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── stores/             # Zustand
│   └── e2e/                    # Tests Playwright
└── mobile/                     # React Native/Expo
```

### Invariants clés

| Règle | Implémentation |
|-------|---------------|
| `LedgerEntry` immuable | Prisma middleware bloque UPDATE/DELETE |
| `AuditLog` immuable | Même middleware |
| `wallet.solde` modifiable uniquement via `ledger.js` | Middleware vérifie la stack trace |
| `email_perso` jamais modifiable | Aucune route API ne l'expose en update |
| Wallet bénéficiaire crédité UNIQUEMENT par dotation | `crediterWallet` vérifie le type de source |
| FedaPay : 3 usages seulement | Collecte, payout marchand, remboursement départ |

---

## Commandes utiles

```bash
# Tests
cd backend
npm run test:unit          # Tests unitaires
npm run test:integration   # Tests intégration (nécessite PostgreSQL)
npm run test:security      # Tests sécurité + immuabilité
npm run test:all           # Tous les tests avec couverture

# Tests de charge k6
k6 run src/__tests__/load/transaction-load.js \
  --env BASE_URL=http://localhost:3000 \
  --env TEST_TOKEN=<jwt>

# Tests E2E Playwright
cd web && npx playwright test e2e/

# Audit sécurité npm
cd backend && npm audit --audit-level=critical
cd web && npm audit --audit-level=critical

# Base de données
npx prisma studio        # Interface visuelle
npx prisma migrate dev   # Appliquer les migrations
npx prisma db seed       # Données de test
```

---

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) bloque le déploiement si :

- Au moins un test échoue
- Couverture `ledger.js`, `antiFraude.js`, `kyc.js` < 100%
- Couverture globale < 80%
- `npm audit` détecte une vulnérabilité **CRITIQUE**

Étapes : `lint → test-unitaire → test-integration → test-securite → test-e2e → audit-dependances → build-docker → deploy-production`

---

## FedaPay — Flux d'appels

```
Entreprise recharge wallet
  └── POST /api/v1/wallet/recharger          → FedaPay COLLECTE (créé en DB avant API)
      └── POST /api/v1/fedapay/webhook        → HMAC vérifié → idempotence → créditer wallet

Marchand — payout automatique
  └── Job nightly (eligible weekdays 8h-18h) → FedaPay PAYOUT (min 1000 XOF)
      └── Batch : 1 appel FedaPay/marchand

Salarié — remboursement au départ
  └── POST /api/v1/mutations/:id/valider-a   → option REMBOURSEMENT → FedaPay PAYOUT
```

---

## Licence

Propriétaire — TIKEXO SAS, Cotonou, Bénin.
