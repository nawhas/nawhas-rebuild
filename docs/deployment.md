# Deployment

This document covers how to deploy Nawhas.com to a production environment.

> **Note:** There is no Dockerfile in this repo. The app is deployed using Docker Compose with the CI compose overlay (`docker-compose.ci.yml`) which runs the Next.js standalone production build.

## Production Build

The production build sequence (run inside the `web` container or on a Node.js server):

```bash
corepack enable
pnpm install --frozen-lockfile

# Build shared packages first (required before next build)
pnpm --filter @nawhas/types build
pnpm --filter @nawhas/db build

# Apply pending database migrations
pnpm --filter @nawhas/db db:migrate

# Build the Next.js app
pnpm --filter @nawhas/web build

# Start the production server
pnpm --filter @nawhas/web start
```

The `./dev build` shortcut runs the build steps inside the running Docker `web` container for local testing.

### Standalone output

`next.config.ts` sets `output: 'standalone'`. The build produces a self-contained server at `.next/standalone/server.js` that can be run with plain Node.js:

```bash
node apps/web/.next/standalone/server.js
```

Copy `.next/static` and `public/` alongside the standalone output when deploying outside Docker.

## Environment Variables

All variables must be set in the production environment. Never commit real secrets to the repo.

### Application

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Must be `production` | `production` |

### Server logging (structured JSON to stdout)

The web app emits JSON lines from [`server.ts`](../apps/web/src/lib/logger/server.ts) in the web package. **tRPC** procedures are logged via middleware (`trpc.procedure_ok` at debug, `trpc.procedure_failed` on errors). **Server actions** log unauthenticated and handled-error paths where applicable; some actions log `serverAction.ok` at debug. **Vitest** sets `LOGGING_ENABLED=false` so tests stay quiet.

| Variable | Description | Example |
|----------|-------------|---------|
| `LOGGING_ENABLED` | Master switch for server logger | `true` |
| `LOG_LEVEL` | Minimum level: `trace`, `debug`, `info`, `warn`, `error` | `info` |
| `LOG_SINK` | `console` (stdout/stderr) or `file` | `console` |
| `LOG_FILE_PATH` | Used when `LOG_SINK=file` | `/tmp/nawhas-web.log` |
| `NEXT_PUBLIC_LOGGING_ENABLED` | Client-side logger in the browser | `true` |

**Staging:** [`values-staging.yaml`](../deploy/helm/nawhas/values-staging.yaml) sets `LOG_LEVEL=trace` so every level above is emitted. After changing it, redeploy the web chart so pods pick up the new env.

**Next.js Server Components:** Production builds often log generic “Server Components render” failures without a full stack. That output comes from Next.js, not the structured `serverLogger` above, so raising `LOG_LEVEL` alone does not reveal those messages. Use a local non-production build, add targeted `serverLogger` calls around the suspect route, or rely on digests plus source maps as appropriate.

### Database

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/nawhas` |

### Authentication (Better-Auth)

| Variable | Description | Example |
|----------|-------------|---------|
| `BETTER_AUTH_SECRET` | Random secret ≥ 32 chars — rotate to invalidate all sessions | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Canonical app URL with no trailing slash | `https://nawhas.com` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated list of allowed origins | `https://nawhas.com` |

### Search (Typesense)

| Variable | Description | Example |
|----------|-------------|---------|
| `TYPESENSE_HOST` | Typesense server hostname | `search.nawhas.com` |
| `TYPESENSE_PORT` | Typesense port | `443` |
| `TYPESENSE_PROTOCOL` | `http` or `https` | `https` |
| `TYPESENSE_API_KEY` | Admin API key (server-side only, never exposed to browser) | `<secret>` |
| `TYPESENSE_SEARCH_API_KEY` | Read-only search key (safe for browser) | `<readonly-key>` |

### Object Storage (S3 / MinIO / R2 / B2)

| Variable | Description | Example |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3-compatible endpoint URL | `https://s3.amazonaws.com` |
| `S3_ACCESS_KEY_ID` | Access key | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_ACCESS_KEY` | Secret key | `<secret>` |
| `S3_BUCKET_AUDIO` | Bucket for MP3 audio files | `nawhas-audio-prod` |
| `S3_BUCKET_IMAGES` | Bucket for album artwork and reciter photos | `nawhas-images-prod` |
| `S3_PUBLIC_BASE_URL` | Public base URL for audio files (CDN preferred) | `https://cdn.nawhas.com` |

### Email (SMTP)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.resend.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `resend` |
| `SMTP_PASS` | SMTP password / API key | `<secret>` |
| `SMTP_FROM` | From address for transactional emails | `noreply@nawhas.com` |
| `SMTP_SECURE` | `true` for port 465, `false` for STARTTLS | `false` |

## Database Migrations

Migrations are applied automatically when the `web` service starts (the startup command runs `db:migrate` before `start`). This follows the **migrate-then-start** strategy — the app will not serve traffic until migrations are applied.

To apply migrations manually:

```bash
./dev db:migrate
```

To generate a new migration after changing the Drizzle schema:

```bash
pnpm --filter @nawhas/db db:generate
```

Commit the generated migration file in `packages/db/src/migrations/`. Migrations are irreversible by default — write a rollback migration manually if needed.

## Typesense

### Collections vs PostgreSQL migrations

Drizzle migrations only change PostgreSQL. **Typesense collection schemas** are defined in code ([`packages/db/src/typesense/collections.ts`](../packages/db/src/typesense/collections.ts)) and consumed by the web app via `@nawhas/db`.

### Kubernetes (Helm)

- **DB migrations:** the `migrate` **initContainer** on [`nawhas-web`](../deploy/helm/nawhas/templates/deployment.yaml) runs `packages/db/dist/migrate.js` before each pod starts.
- **Typesense schema reconcile:** a **Helm hook Job** ([`typesense-schema-job.yaml`](../deploy/helm/nawhas/templates/typesense-schema-job.yaml)) runs on `post-install` / `post-upgrade` with **hook-weight 5** (before the [seed hook](../deploy/helm/nawhas/templates/seed-job.yaml) at weight 10). It runs `node packages/db/dist/typesense-ensure-cli.js` with the same image and `TYPESENSE_*` env as the app. The job **creates** missing collections and **deletes + recreates** any collection whose fields are outdated relative to code — safe because the Job runs **once per release**, not per replica. Disable via `typesenseSchemaJob.enabled` in Helm values.

On app startup, [`instrumentation.ts`](../apps/web/instrumentation.ts) still calls `ensureCollections`, which only **creates** collections that do not exist (no deletes), so multiple replicas do not race on schema changes.

### Index bootstrap

When deploying to a **fresh** environment, the Typesense index will be empty. Bootstrap it after seeding the database:

```bash
./dev db:seed
```

This runs the full re-index as its final step. In production (where `db:seed` should not be run against live data), run the re-index separately:

```bash
docker compose exec web pnpm --filter @nawhas/db db:search-index
```

The `db:search-index` script is idempotent — it upserts documents from the current PostgreSQL data. If the schema hook **recreated** a collection, run `db:search-index` (or your usual sync path) so search is repopulated.

## Switching from MinIO to Real S3

No code changes are needed. Update these four environment variables:

```env
S3_ENDPOINT=https://s3.amazonaws.com          # or your S3-compatible provider
S3_ACCESS_KEY_ID=<real-access-key>
S3_SECRET_ACCESS_KEY=<real-secret-key>
S3_BUCKET_AUDIO=nawhas-audio-prod
S3_BUCKET_IMAGES=nawhas-images-prod
S3_PUBLIC_BASE_URL=https://cdn.nawhas.com     # CDN URL in front of the bucket
```

For Cloudflare R2, set `S3_ENDPOINT` to your R2 account endpoint (`https://<account-id>.r2.cloudflarestorage.com`).

## CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every PR and push to `main`.

Four jobs are required to merge:

| Job | What it does |
|-----|--------------|
| `quality` | `./dev typecheck`, `./dev lint`, `./dev test` — runs locally with Node.js |
| `build` | Starts Docker stack, runs the full Next.js production build |
| `docker-build` | `docker compose build` — validates the compose configuration |
| `e2e` | Starts Docker stack, seeds DB, runs Playwright suite |

An optional `lighthouse` job runs the production build via the `docker-compose.ci.yml` overlay and audits against these thresholds:

| Metric | Threshold | Failure mode |
|--------|-----------|-------------|
| Performance | ≥ 0.8 | warn |
| Accessibility | ≥ 0.9 | **error** (blocks merge) |
| First Contentful Paint | ≤ 2000ms | warn |
| Largest Contentful Paint | ≤ 2500ms | warn |
| Cumulative Layout Shift | ≤ 0.1 | warn |

The accessibility threshold is the only Lighthouse assertion that blocks a merge. All others are warnings.

## Health Checks

The production `web` service should expose a health check endpoint. The CI stack uses:

```bash
wget --no-verbose --tries=1 --spider http://localhost:3100
```

Configure your load balancer or uptime monitor to check `GET /` (or a dedicated `/api/health` endpoint if one is added).

## Performance Testing

A k6 smoke test runs every Monday at 02:00 UTC via `.github/workflows/performance.yml`. It can also be triggered manually via workflow dispatch with an optional `base_url` input.

To run locally against production:

```bash
BASE_URL=https://nawhas.com k6 run apps/web/perf/k6/scripts/smoke.js
```

The smoke test checks:
- Homepage returns HTTP 200
- Response time under 500ms
