# Nawhas.com Rebuild

A modern digital library for nawha recitation — preserving and celebrating the art of nawha for reciters and listeners worldwide.

## What is this?

Nawhas.com is a comprehensive platform for discovering, listening to, and cataloguing nawha recitations. This repository contains the full-stack web application built as a pnpm monorepo.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| API | tRPC 11 + TanStack Query |
| Database | PostgreSQL 16 + Drizzle ORM |
| Search | Typesense 26 |
| Object Storage | MinIO (S3-compatible) |
| Authentication | Better-Auth |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Audio | Howler.js |

## Monorepo Structure

```
nawhas-rebuild/
├── apps/
│   ├── web/          # Next.js 15 app (frontend + tRPC API)
│   └── e2e/          # Playwright end-to-end tests
├── packages/
│   ├── db/           # Drizzle ORM schema, migrations, and client
│   ├── ui/           # Shared React component library
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared ESLint, Prettier, and tsconfig
├── infra/
│   ├── postgres/     # Database initialisation scripts
│   └── minio/        # S3 bucket setup and CORS config
└── docs/             # Developer documentation
```

## Quick Start

**Prerequisites:** Docker, Node.js 20+, pnpm 9.15.5+

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd nawhas-rebuild

# 2. Enable corepack (manages pnpm version automatically)
corepack enable

# 3. Copy environment variables
cp apps/web/.env.example apps/web/.env.local

# 4. Start all services
./dev up
```

The app will be available at **http://localhost:3000**.

Seed the database with fixture data (reciters, albums, tracks, audio files):

```bash
./dev db:seed
```

See [docs/dev-setup.md](docs/dev-setup.md) for full setup details, service URLs, and troubleshooting.

## Available Commands

All common tasks go through `./dev`. Run from the repo root:

| Command | Description |
|---------|-------------|
| `./dev up` | Start all Docker services (web, postgres, typesense, minio, mailpit) |
| `./dev down` | Stop all services |
| `./dev build` | Production build (Docker) |
| `./dev lint` | ESLint (Docker) |
| `./dev typecheck` | TypeScript check (Docker) |
| `./dev test` | Run unit and integration tests (Vitest) in Docker |
| `./dev qa` | Run typecheck, lint, and test in one Docker run (same as CI quality job) |
| `./dev test:e2e` | Run Playwright E2E tests in Docker |
| `./dev test:e2e:ui` | Run Playwright in interactive UI mode |
| `./dev smoke:prodlike` | Run production-like Docker smoke checks for detail pages |
| `./dev db:seed` | Seed the database with fixture data |
| `./dev db:migrate` | Apply pending database migrations |
| `./dev db:reset` | Drop, migrate, and reseed the database |
| `./dev logs web -f` | Tail the web container logs |
| `pnpm perf:lighthouse` | Run Lighthouse CI performance audits |
| `pnpm perf:k6` | Run k6 load tests |

Run `./dev --help` to see the full command reference.

## CI/CD

Four status checks are required to merge to `main`:

| Check | What it does |
|-------|--------------|
| `quality` | Typecheck, lint, and unit tests (`./dev qa` in Docker) |
| `build` | Production Next.js build against live Docker services |
| `docker-build` | Validates the Dockerfile builds cleanly |
| `e2e` | Full Playwright suite against a running stack |

A Lighthouse audit runs optionally on every push and enforces: performance ≥ 0.8, accessibility ≥ 0.9, LCP ≤ 2500ms, FCP ≤ 2000ms, CLS ≤ 0.1.

A scheduled k6 smoke test runs every Monday at 02:00 UTC.

## Accessibility

Nawhas.com targets **WCAG 2.1 Level AA** compliance with no exceptions. Accessibility checks are automated in CI via jest-axe and @axe-core/playwright and run on every PR.

Documentation:

- [ACCESSIBILITY.md](ACCESSIBILITY.md) — standards, checklist, and PR review requirements
- [ACCESSIBILITY_INDEX.md](ACCESSIBILITY_INDEX.md) — navigation hub for all accessibility resources
- [REACT_ACCESSIBILITY_PATTERNS.md](REACT_ACCESSIBILITY_PATTERNS.md) — copy-paste accessible React components
- [TAILWIND_ACCESSIBILITY.md](TAILWIND_ACCESSIBILITY.md) — Tailwind-specific accessibility patterns

## Contributing

- **No direct commits to `main`** — all changes go through a PR
- **Branch naming:** `feature/naw-NNN-short-description`, `fix/naw-NNN-short-description`
- **All four CI checks must pass** before merging
- **Accessibility review required** on any PR touching UI components
- **pnpm only** — do not use npm or yarn; the repo enforces this via `packageManager` in `package.json`

For local development setup, troubleshooting, and service configuration see [docs/dev-setup.md](docs/dev-setup.md).
