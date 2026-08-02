# TIKEXO — Dockerfile unifié VPS (API + build web dans un seul container)
# N'affecte pas backend/Dockerfile ni web/Dockerfile, utilisés par les autres
# chemins de déploiement (Render, Vercel, docker-compose.yml self-hosted).

# ── Stage 1 : build du front Vite ───────────────────────────────────────────
FROM node:20-alpine AS web-build
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
# Vite fige ces valeurs DANS le bundle JS au moment du build — ce ne sont PAS
# des variables d'environnement runtime. VITE_API_URL vide => appels API en
# chemin relatif (même origine que le front, servi par ce même container).
ARG VITE_API_URL=""
ARG VITE_ASSETS_URL=/media
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ASSETS_URL=$VITE_ASSETS_URL
RUN npm run build

# ── Stage 2 : dépendances + génération Prisma du backend ───────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app
RUN apk add --no-cache openssl
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
# npx télécharge le CLI Prisma à la volée (absent des deps de prod) juste le
# temps de générer le client — il n'est pas conservé dans l'image finale.
RUN npx prisma generate

# ── Stage 3 : runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/src ./src
COPY --from=backend-build /app/prisma ./prisma
COPY --from=backend-build /app/scripts ./scripts
COPY --from=backend-build /app/package.json ./
COPY --from=web-build /app/dist ./web-dist

RUN addgroup -g 1001 -S tikexo && adduser -S tikexo -u 1001 \
  && chown -R tikexo:tikexo /app
USER tikexo

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
