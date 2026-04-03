# Architecture

This document describes how the Nawhas.com system is structured, how data flows through it, and how the key services relate to each other.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                 │
│   Next.js App Router  ←→  TanStack Query  ←→  Zustand Store     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ tRPC (HTTP)
┌──────────────────────────────▼──────────────────────────────────┐
│                    Next.js Server (apps/web)                      │
│   App Router handlers  ·  tRPC routers  ·  Better-Auth handler   │
└───┬──────────────────────┬───────────────────┬───────────────────┘
    │ Drizzle ORM           │ Typesense client   │ S3 client (AWS SDK)
    ▼                       ▼                   ▼
┌────────┐           ┌───────────┐        ┌─────────┐
│  PostgreSQL  │     │ Typesense │        │  MinIO  │
│  (data)      │     │ (search)  │        │ (audio, │
│              │     │           │        │  images)│
└────────┘           └───────────┘        └─────────┘
```

## Monorepo Dependency Graph

```
apps/web         → @nawhas/db, @nawhas/ui, @nawhas/types
apps/e2e         → (test-only, no runtime deps on workspace packages)
packages/db      → @nawhas/types
packages/ui      → (no workspace deps)
packages/types   → (no workspace deps)
packages/config  → (no workspace deps, provides ESLint/tsconfig)
```

Build order enforced by Turbo: `types → db → ui → web`.

## Request Lifecycle

### Page render (server component)

```
1. Browser requests /reciters/ali-fazel
2. Next.js App Router matches the route
3. React Server Component calls tRPC caller directly (server-side, no HTTP)
4. tRPC router queries PostgreSQL via Drizzle ORM
5. RSC renders HTML with data embedded
6. Browser hydrates; TanStack Query caches the result client-side
```

### Data mutation (client component)

```
1. User action triggers a tRPC mutation
2. tRPC client sends POST /api/trpc/<router>.<procedure>
3. Next.js Route Handler receives the request
4. tRPC middleware verifies the Better-Auth session
5. Router procedure runs business logic + Drizzle ORM write
6. On write: syncTrack()/syncAlbum()/syncReciter() upserts to Typesense
7. TanStack Query invalidates cached queries on success
```

### Search request

```
1. User types in search box → debounced autocomplete query
2. tRPC search.autocomplete called with { q: "..." }
3. Server calls Typesense multi-search (3 collections in one round-trip)
4. Returns top 3 reciters, 3 albums, 5 tracks with highlighted snippets
5. Full search.query supports pagination and type filtering
```

## Authentication Flow

Nawhas uses **Better-Auth** for session management.

```
1. User submits sign-in form
2. POST /api/auth/sign-in handled by Better-Auth route handler
3. Better-Auth verifies credentials, creates a session row in PostgreSQL
4. Sets a signed HTTP-only cookie (session token)
5. Next requests include the cookie automatically
6. tRPC middleware calls auth.api.getSession() to validate
7. Protected procedures receive ctx.session or throw UNAUTHORIZED
```

**Key config:**
- `BETTER_AUTH_URL` must match the app origin exactly
- `BETTER_AUTH_TRUSTED_ORIGINS` is a comma-separated allowlist — required for cross-origin cookie acceptance
- Session tokens are stored in the `session` table; they never leave the server

## Media Flow

### Audio upload (future admin flow)

```
1. Admin requests a presigned PUT URL via tRPC
2. Server calls MinIO/S3 presigned URL API (short TTL)
3. Client uploads MP3 directly to MinIO — server never proxies the file
4. On success, admin confirms upload; server writes audioUrl to tracks table
5. syncTrack() updates Typesense document
```

### Audio playback

```
1. Track page renders with audioUrl from PostgreSQL
2. User clicks Play — Zustand PlayerStore.play(track) called
3. AudioEngine (Howler.js singleton) receives store change via subscription
4. Howler creates new Howl instance with html5: true (streaming mode)
5. Audio streams directly from MinIO public URL (or CDN in production)
6. Every 250ms: Howler position synced back into Zustand store
7. Player bar re-renders reactively from store state
```

In production, `S3_PUBLIC_BASE_URL` points to a CDN (e.g. Cloudflare R2 or CloudFront) rather than MinIO directly, so audio streams from an edge cache.

## Service Map

| Service | Role | Dev URL | Production |
|---------|------|---------|------------|
| Next.js (web) | App server + API | http://localhost:3000 | Container (standalone build) |
| PostgreSQL | Relational database | localhost:5432 | Managed DB (e.g. Supabase, RDS) |
| Typesense | Full-text search | http://localhost:8108 | Typesense Cloud or self-hosted |
| MinIO | Object storage (audio, images) | http://localhost:9000 | AWS S3, Cloudflare R2, Backblaze B2 |
| Mailpit | Email catch-all | http://localhost:8025 | Any SMTP provider (Resend, Postmark) |

## Key Design Decisions

**tRPC for the API layer** — end-to-end type safety from DB schema to React component without a separate API spec. All procedures are in `apps/web/src/server/routers/`.

**Drizzle ORM** — SQL-first, TypeScript-native. Schema lives in `packages/db/src/schema/`; migrations are generated with `pnpm db:generate` and applied with `./dev db:migrate`.

**Typesense for search** — self-hosted, fast, supports Arabic/Urdu ICU tokenisation and diacritic removal. The Typesense schema is defined in `apps/web/src/lib/typesense/collections.ts`.

**MinIO in development** — drop-in S3-compatible storage. Swap to real S3/R2/B2 in production by changing four environment variables — no code changes needed.

**Zustand + Howler.js for the audio player** — Zustand is the single source of truth for player state; Howler subscribes to it. This avoids event-listener spaghetti and makes the player fully testable without a real browser audio context.

**Next.js standalone output** — `output: 'standalone'` in `next.config.ts` produces a self-contained Node.js server. Deploy by running `node .next/standalone/server.js`.
