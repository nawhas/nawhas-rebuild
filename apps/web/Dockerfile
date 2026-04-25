# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Install all workspace dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Enable corepack so pnpm is available
RUN corepack enable

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Build all packages + the Next.js app
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

# Copy installed node_modules from deps stage
# With shamefully-hoist=true in .npmrc, pnpm hoists all deps to /app/node_modules.
# apps/web/node_modules is also required — pnpm creates @nawhas/* symlinks there
# pointing to the workspace packages (db, types, ui, config) even with hoisting.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy full source
COPY . .

# Ensure hoisted binaries (tsc, etc.) are on PATH.
# With shamefully-hoist=true, deps land in /app/node_modules/.bin but pnpm's
# script runner only prepends {package}/node_modules/.bin — which doesn't exist
# for packages without their own node_modules dir. Explicitly extend PATH here.
ENV PATH="/app/node_modules/.bin:${PATH}"

# Build internal packages first, then the web app.
# Use absolute tsc path to bypass pnpm's script runner PATH isolation:
# pnpm's spawned child process does not reliably inherit the ENV PATH above,
# so packages/types and packages/db (which have no local node_modules/.bin with
# shamefully-hoist) cannot find tsc via pnpm script. Calling tsc directly avoids
# this entirely. The web build still uses pnpm (Next.js handles its own tooling).
RUN /app/node_modules/.bin/tsc --build packages/types/tsconfig.json && \
    /app/node_modules/.bin/tsc --build packages/db/tsconfig.json && \
    /app/node_modules/.bin/tsc --build packages/ui/tsconfig.json && \
    BETTER_AUTH_SECRET=build-placeholder \
    BETTER_AUTH_URL=http://localhost:3100 \
    DATABASE_URL=postgresql://localhost/nawhas \
    TYPESENSE_HOST=localhost \
    TYPESENSE_PORT=8108 \
    TYPESENSE_PROTOCOL=http \
    TYPESENSE_API_KEY=build-placeholder \
    S3_ENDPOINT=http://localhost:9000 \
    S3_ACCESS_KEY_ID=build-placeholder \
    S3_SECRET_ACCESS_KEY=build-placeholder \
    pnpm --filter @nawhas/web build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3: Production image — minimal runtime from standalone output
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100
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

# Copy node_modules needed by the migration + seed scripts at runtime
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres
# @aws-sdk/client-s3 is required by the seed script to upload fixtures to MinIO/S3
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@aws-sdk ./node_modules/@aws-sdk
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@smithy ./node_modules/@smithy
# typesense is required by the seed script to index data into Typesense.
# axios is typesense's HTTP client; the remaining packages are its transitive deps.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/typesense ./node_modules/typesense
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/loglevel ./node_modules/loglevel
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/tslib ./node_modules/tslib
# axios and its transitive runtime deps
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/axios ./node_modules/axios
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/follow-redirects ./node_modules/follow-redirects
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/proxy-from-env ./node_modules/proxy-from-env
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/form-data ./node_modules/form-data
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/asynckit ./node_modules/asynckit
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/combined-stream ./node_modules/combined-stream
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/delayed-stream ./node_modules/delayed-stream
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/mime-types ./node_modules/mime-types
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/mime-db ./node_modules/mime-db
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/call-bind-apply-helpers ./node_modules/call-bind-apply-helpers
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/dunder-proto ./node_modules/dunder-proto
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/es-define-property ./node_modules/es-define-property
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/es-errors ./node_modules/es-errors
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/es-object-atoms ./node_modules/es-object-atoms
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/es-set-tostringtag ./node_modules/es-set-tostringtag
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/function-bind ./node_modules/function-bind
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/get-intrinsic ./node_modules/get-intrinsic
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/get-proto ./node_modules/get-proto
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/gopd ./node_modules/gopd
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/has-symbols ./node_modules/has-symbols
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/has-tostringtag ./node_modules/has-tostringtag
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/hasown ./node_modules/hasown
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/math-intrinsics ./node_modules/math-intrinsics

USER nextjs

EXPOSE 3100

CMD ["node", "apps/web/server.js"]
