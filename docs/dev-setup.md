# Local Development Setup

The full dev stack starts with a single command:

```bash
./dev up
```

This brings up five services:

| Service      | URL / Port                         | Purpose                           |
|--------------|------------------------------------|-----------------------------------|
| web          | http://localhost:3000              | Next.js app (hot-reload)          |
| postgres     | localhost:5432                     | PostgreSQL database               |
| typesense    | localhost:8108                     | Full-text search engine           |
| minio        | http://localhost:9001 (console)    | S3-compatible object storage      |
| mailpit      | http://localhost:8025 (UI)         | Transactional email catcher       |

---

## MinIO (S3-compatible object storage)

MinIO provides local S3-compatible storage for audio files and images. No cloud credentials are needed in development.

### Buckets

Two buckets are created automatically on first startup:

| Bucket          | Purpose                  |
|-----------------|--------------------------|
| `nawhas-audio`  | MP3 audio files          |
| `nawhas-images` | Album covers, reciter photos |

### Console

Access the MinIO browser UI at **http://localhost:9001**.

- Username: `minioadmin`
- Password: `minioadmin`

### Environment variables (dev defaults)

```env
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_AUDIO=nawhas-audio
S3_BUCKET_IMAGES=nawhas-images
S3_PUBLIC_BASE_URL=http://localhost:9000/nawhas-audio
```

These are already set in `docker-compose.yml` for the `web` service. Copy `.env.example` to `.env.local` if you run the app outside Docker.

### Seeding fixtures

Upload placeholder audio and image fixtures to MinIO:

```bash
./dev db:seed
```

This uploads small placeholder MP3s and JPEGs to the `nawhas-audio` and `nawhas-images` buckets. You can then stream a seeded audio file directly in the browser via the public MinIO URL.

### Switching to production S3

In production, swap to real credentials via environment variables — no code changes needed:

```env
S3_ENDPOINT=https://s3.amazonaws.com        # or any S3-compatible provider
S3_ACCESS_KEY_ID=<real-access-key>
S3_SECRET_ACCESS_KEY=<real-secret-key>
S3_BUCKET_AUDIO=nawhas-audio-prod
S3_BUCKET_IMAGES=nawhas-images-prod
S3_PUBLIC_BASE_URL=https://cdn.nawhas.com
```

---

## Mailpit (email catcher)

Mailpit captures all outbound email from the app so you can inspect it without sending real emails. No SMTP credentials are required in development — Mailpit acts as an open relay on port 1025.

### Web UI

View all captured emails at **http://localhost:8025**.

Emails appear here as soon as the app sends them (registration confirmation, password reset, etc.).

### Environment variables

SMTP settings are pre-configured in `docker-compose.yml` for the `web` service. If running outside Docker, copy the `SMTP_*` variables from `.env.example`.

For production, replace the SMTP variables in your `.env.local` with your real provider credentials (host, port, user, password, etc.).

---

## Environment file

Copy `.env.example` to `.env.local` when running the app outside Docker:

```bash
cp apps/web/.env.example apps/web/.env.local
```

The example file contains dev-safe defaults for all services. Production values are set via CI/CD secrets — never committed to the repo.

---

## Lint, typecheck, and tests (Docker)

`./dev lint`, `./dev typecheck`, and `./dev test` run **inside the `web` container** (not on the host). Lint and typecheck use `docker compose run --no-deps` so Postgres/Typesense are not started. Tests use `docker-compose.test.yml` so `DATABASE_URL` points at `nawhas_test` and dependencies start automatically.

For one shot matching CI:

```bash
./dev qa
```

Vitest inherits `DATABASE_URL` and Typesense env from the container when present; see `apps/web/vitest.config.ts`.

---

## Health checks

Use these commands to verify all services are running after `./dev up`:

```bash
# Next.js web app
curl -f http://localhost:3000

# PostgreSQL
./dev exec postgres pg_isready -U postgres

# Typesense
curl -f http://localhost:8108/health

# MinIO (open http://localhost:9001 in a browser, or check the API)
curl -f http://localhost:9000/minio/health/live

# Mailpit (open http://localhost:8025 in a browser)
curl -f http://localhost:8025
```

All should return `200 OK` (or a success message). If a service is not yet ready, wait a few seconds and retry — the `web` container waits for `postgres` and `typesense` to be healthy before starting.

---

## Troubleshooting

### Port conflicts

If any service fails to start because a port is already in use:

| Service | Default port | Common conflict |
|---------|-------------|-----------------|
| web | 3000 | Another Next.js dev server |
| postgres | 5432 | A local PostgreSQL installation |
| typesense | 8108 | Rarely conflicts |
| minio API | 9000 | Other S3-compatible tools |
| minio console | 9001 | Other MinIO instances |
| mailpit UI | 8025 | Other mail catchers |

To find what is using a port: `lsof -i :<port>` (macOS/Linux) or `netstat -ano | findstr :<port>` (Windows).

### E2E (`./dev test:e2e`) and port 3000

End-to-end tests use [`docker-compose.test.yml`](../docker-compose.test.yml) on top of [`docker-compose.yml`](../docker-compose.yml): test DB (`nawhas_test`), `nawhas.test` aliases, and the **Playwright** service (profile `testing`) all live in the test overlay. **`./dev test:e2e --ci`** and CI add [`docker-compose.ci.yml`](../docker-compose.ci.yml), which includes [`docker-compose.web-prod.yml`](../docker-compose.web-prod.yml) so `web` runs **`next build` + `next start`** instead of `next dev`.

The base `web` service maps **host port 3000** (`ports: "3000:3000"`). Playwright (in Docker) uses `http://nawhas.test:3000` on the **container** network; the host publish is for `http://localhost:3000` from your machine.

If you see **`failed to bind host port 0.0.0.0:3000: address already in use`**, something on the host is already listening on 3000. Typical cases:

- A **local** `pnpm dev` / `next dev` (not in Docker) for this or another project
- A **leftover** stack — run `./dev down` and retry
- Another tool using 3000 — check with `ss -tlnp | grep 3000` or `sudo lsof -i :3000`

Inside the repo, prefer **either** `./dev up` **or** E2E in Docker, not both a host Next server and a fresh `web` container fighting for the same port.

### Resetting all local data

To wipe all Docker volumes and start fresh (⚠️ destroys the local database and all seeded data):

```bash
./dev down -v
./dev up
./dev db:seed
```

### MinIO bucket not found

If the app logs S3 errors about missing buckets, the `minio-init` one-shot container may not have run successfully. Re-run it manually:

```bash
./dev up minio-init
```

### Database migrations not applied

If the app crashes with schema errors, apply pending migrations:

```bash
./dev db:migrate
```

Or simply restart the `web` container — it runs migrations automatically on startup.

### pnpm install fails

Ensure you are using Node.js 22+ (LTS) and that corepack is enabled:

```bash
node --version   # should be v22.x or higher
corepack enable
pnpm install
```

If the `node_modules` volume inside Docker is stale, rebuild the container:

```bash
./dev build web
./dev up
```

### Typesense search returns no results after seeding

The search index is populated during `./dev db:seed`. If the index is missing or stale, re-run the seed:

```bash
./dev db:seed
```

If the Typesense container was restarted after seeding, the index persists in the `typesense_data` volume and does not need to be rebuilt.

### Authentication callback errors

Better-Auth validates the `BETTER_AUTH_TRUSTED_ORIGINS` environment variable. If you see origin mismatch errors, ensure your `.env.local` (or `docker-compose.yml` for the `web` service) includes your local hostname:

```env
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
```
