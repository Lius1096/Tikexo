#!/usr/bin/env bash
# TIKEXO — Génère tous les secrets de .env.prod en une seule commande.
# Usage : bash scripts/generate-secrets.sh
#
# Copie .env.prod.example -> .env.prod si besoin, puis remplace chaque
# placeholder CHANGE_ME_* par une valeur aléatoire (openssl rand -hex 32),
# la MÊME valeur partout où le placeholder apparaît dans le fichier — donc
# POSTGRES_PASSWORD et son occurrence dans DATABASE_URL restent synchronisés
# automatiquement (docker compose n'interpole pas les ${VAR} dans un env_file,
# voir l'avertissement en tête de .env.prod.example).

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env.prod"
EXAMPLE_FILE=".env.prod.example"

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "Erreur : $EXAMPLE_FILE introuvable." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo "✓  $ENV_FILE créé à partir de $EXAMPLE_FILE"
fi

replace_placeholder() {
  local placeholder="$1"
  if ! grep -q "$placeholder" "$ENV_FILE"; then
    echo "  ↷  $placeholder absent de $ENV_FILE — ignoré (déjà généré ?)"
    return
  fi
  local value
  value=$(openssl rand -hex 32)
  sed -i "s|${placeholder}|${value}|g" "$ENV_FILE"
  echo "  ✓  $placeholder"
}

echo ""
echo "TIKEXO — Génération des secrets dans $ENV_FILE"
echo ""

replace_placeholder "CHANGE_ME_POSTGRES_PASSWORD"
replace_placeholder "CHANGE_ME_JWT_SECRET"
replace_placeholder "CHANGE_ME_JWT_REFRESH_SECRET"
replace_placeholder "CHANGE_ME_CARTE_QR_SECRET_KEY"
replace_placeholder "CHANGE_ME_CARTE_NFC_SECRET_KEY"
replace_placeholder "CHANGE_ME_CARTE_CVV_SECRET_KEY"
replace_placeholder "CHANGE_ME_MINIO_ROOT_PASSWORD"

echo ""
echo "Secrets générés. Il reste à renseigner à la main dans $ENV_FILE :"
echo "  FEDAPAY_*, CLOUDINARY_*, FIREBASE_*, SMTP_*, SMS_API_KEY, SENTRY_DSN"
echo ""
