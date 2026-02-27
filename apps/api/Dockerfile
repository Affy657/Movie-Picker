# Build depuis la racine du monorepo : docker build -f apps/api/Dockerfile .

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copier uniquement le code source et la config (pas node_modules, sinon on écrase les deps installées)
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/
RUN pnpm --filter api build

# Production stage : image légère avec uniquement l'API
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copier uniquement le package.json de l'API et installer les deps de prod
COPY apps/api/package.json ./
RUN npm install --omit=dev

# Copier le build depuis le builder
COPY --from=builder /app/apps/api/dist ./dist

CMD ["node", "dist/index.js"]
