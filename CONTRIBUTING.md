# Contributing

## Before You Start

- **No direct commits to `main`** — all changes go through a pull request
- **pnpm only** — never use npm or yarn; the repo enforces this via `packageManager` in `package.json`
- **Docker required** — the development stack runs in Docker Compose; see [docs/dev-setup.md](docs/dev-setup.md)
- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand how the system fits together

## Branches

| Pattern | Use for |
|---------|---------|
| `feature/naw-NNN-short-description` | New features (linked to a Nawhas issue) |
| `fix/naw-NNN-short-description` | Bug fixes |
| `chore/short-description` | Dependency updates, tooling, CI |
| `docs/short-description` | Documentation-only changes |

Use lowercase kebab-case. Keep descriptions short (3–5 words).

## Setting Up Locally

```bash
git clone <repo-url>
cd nawhas-rebuild
corepack enable
cp apps/web/.env.example apps/web/.env.local
./dev up
./dev db:seed
```

See [docs/dev-setup.md](docs/dev-setup.md) for full details and troubleshooting.

## Running the Quality Gate Locally

Run all checks before pushing to avoid CI surprises:

```bash
./dev typecheck   # TypeScript — no errors allowed
./dev lint        # ESLint — no errors allowed
./dev test        # Vitest unit/integration tests
./dev test:e2e    # Playwright E2E (requires ./dev up and ./dev db:seed first)
```

All four CI checks (`quality`, `build`, `docker-build`, `e2e`) must pass for a PR to merge.

### ESLint Rules

#### require-dynamic-for-headers-cookies

Pages and layouts using `headers()`, `cookies()` from `next/headers` or accessing `searchParams` from props must export `const dynamic = 'force-dynamic'`. This is required by Next.js 15+ to avoid `DYNAMIC_SERVER_USAGE` errors.

**Example:**
```typescript
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function MyLayout() {
  const headersList = await headers();
  // ...
}
```

This is a warning, not an error, to allow for review since some usages may be intentional with other rendering strategies.

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `ci`

**Scope:** package or area affected, e.g. `web`, `db`, `e2e`, `ui`, `search`, `player`

**Examples:**
```
feat(search): add lyrics search to autocomplete results
fix(player): restart track on previous() when > 3 seconds in
chore(deps): upgrade Playwright to v1.60
docs(search): add Typesense re-index guide
```

Keep the subject line under 72 characters. Use the body to explain *why*, not *what*.

## Pull Requests

### Before opening a PR

- [ ] Branch is up-to-date with `main`
- [ ] All four local quality checks pass
- [ ] New features include tests
- [ ] UI changes include accessibility review (see [ACCESSIBILITY.md](ACCESSIBILITY.md))

### PR description

Include:
1. **What** — a one-line summary of the change
2. **Why** — the problem being solved or the feature being added
3. **Testing** — how you verified the change (unit test, E2E test, manual steps)
4. **Screenshots** — for any UI changes

### Review requirements

- At least one approval required before merging
- All CI checks must pass
- Accessibility engineer sign-off required for any PR touching UI components or RTL/Arabic text

## Adding a New Package to the Monorepo

1. Create the package directory under `packages/`:
   ```bash
   mkdir packages/my-package
   ```

2. Add a `package.json` with the `@nawhas/` scope:
   ```json
   {
     "name": "@nawhas/my-package",
     "version": "0.0.0",
     "private": true,
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts"
   }
   ```

3. Extend the shared tsconfig:
   ```json
   {
     "extends": "@nawhas/config/tsconfig.base.json"
   }
   ```

4. Add it to the `pnpm-workspace.yaml` (it is auto-included via `packages/*` glob — no change needed)

5. Add it as a dependency where needed:
   ```bash
   pnpm --filter @nawhas/web add @nawhas/my-package
   ```

6. If the package needs to be transpiled for Next.js, add it to `transpilePackages` in `apps/web/next.config.ts`

## Dependency Management

- **Add a dependency:** `pnpm --filter <package> add <dep>`
- **Add a dev dependency:** `pnpm --filter <package> add -D <dep>`
- **Add a root-level dev tool:** `pnpm add -Dw <dep>`
- Always commit `pnpm-lock.yaml` after changing dependencies
- Do not add `^` or `~` version ranges manually — pnpm manages this

## Database Schema Changes

1. Edit the schema files in `packages/db/src/schema/`
2. Generate a migration:
   ```bash
   pnpm --filter @nawhas/db db:generate
   ```
3. Review the generated SQL in `packages/db/src/migrations/`
4. Apply it:
   ```bash
   ./dev db:migrate
   ```
5. Commit both the schema change and the migration file

Migrations are applied automatically on container startup. Never edit a migration file after it has been committed to `main`.

## Release Process

Releases are not yet automated. The current process:

1. All features for the release are merged to `main` and all CI checks pass
2. The CTO tags the release: `git tag v<major>.<minor>.<patch>`
3. The tag triggers a manual deployment

Semantic versioning: `major` for breaking changes, `minor` for new features, `patch` for bug fixes.
