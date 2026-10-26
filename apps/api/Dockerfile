# ── AetherSMP API ─────────────────────────────────────────────
# Собирается из корня монорепо: docker build -f apps/api/Dockerfile .

# ── Этап 1: зависимости и сборка ──
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Инструменты для нативной сборки argon2
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Ставим только зависимости API (web нужен лишь для резолва workspace)
RUN npm install --workspace @aethersmp/api --include-workspace-root --no-audit --no-fund

COPY apps/api ./apps/api

RUN cd apps/api && npx prisma generate && npm run build

# ── Этап 2: runtime ──
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Непривилегированный пользователь
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY package.json ./

USER nodejs

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4000/api/health || exit 1

CMD ["node", "dist/index.js"]
