# Local Development Setup

The full dev stack starts with a single command:

```bash
docker compose up
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
pnpm db:seed
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
