# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Install all workspace dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Enable corepack so pnpm is available
RUN corepack enable

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Build all packages + the Next.js app
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copy installed node_modules from deps stage
# With shamefully-hoist=true in .npmrc, pnpm hoists all deps to /app/node_modules.
# Per-package node_modules dirs do not exist — only the root copy is needed.
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Build internal packages first, then the web app
RUN pnpm --filter @nawhas/types build && \
    pnpm --filter @nawhas/db build && \
    pnpm --filter @nawhas/web build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3: Production image — minimal runtime from standalone output
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the standalone bundle + static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy compiled db package (including migrate.js) for the K8s init container.
# Migration SQL files must be copied separately — tsc does not emit non-TS assets.
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/src/migrations ./packages/db/dist/migrations

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
