# Testing

This project has four testing layers. Each targets a different level of the stack.

| Layer | Tool | What it covers | Command |
|-------|------|----------------|---------|
| Unit & integration | Vitest | Business logic, React components, tRPC routers | `./dev test` |
| End-to-end | Playwright | Full user flows in a real browser against a running stack | `./dev test:e2e` |
| Accessibility | jest-axe + @axe-core/playwright | WCAG 2.1 AA automated checks | included in unit + e2e |
| Performance | Lighthouse CI + k6 | Core Web Vitals, load capacity | `pnpm perf:lighthouse` / `pnpm perf:k6` |

---

## Unit & Integration Tests (Vitest)

### Running

```bash
./dev test              # all unit/integration tests
./dev test:e2e:ui       # interactive Playwright UI (for debugging)
```

Or, to run a single file:

```bash
pnpm --filter @nawhas/web vitest run src/__tests__/lib/audio-engine.test.ts
```

### Location

Tests live alongside the code they test:

```
apps/web/src/
├── __tests__/lib/              # Library / utility tests
├── components/**/__tests__/    # React component tests
├── server/routers/__tests__/   # tRPC router integration tests
└── lib/typesense/__tests__/    # Typesense sync tests
packages/db/src/
└── __tests__/                  # DB-layer tests (if any)
```

### Vitest environments

- **`jsdom`** (default) — for React component tests that need a DOM
- **`node`** — for tRPC router tests and server-side logic; set with `// @vitest-environment node` at the top of the file

```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest';
```

### Component tests

Use `@testing-library/react`. Always call `cleanup` after each test.

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PageLayout } from '../page-layout';

afterEach(cleanup);

it('renders header, main content, and footer', () => {
  const { container } = render(
    <PageLayout
      header={<nav>Site Nav</nav>}
      footer={<p>Site Footer</p>}
    >
      <p>Main Content</p>
    </PageLayout>
  );
  expect(container.querySelector('main')?.textContent).toBe('Main Content');
});
```

Key conventions:
- Use `getByRole()` and `getByLabelText()` over `getByTestId()` — prefer semantic queries
- Use `vi.mock()` to mock `next/link`, `next/image`, and server actions
- Use `vi.useFakeTimers()` when testing components with intervals or timeouts

### tRPC router tests

Router tests hit a real PostgreSQL test database. They use a `createTestDb()` helper that builds an in-process Drizzle instance.

```typescript
// @vitest-environment node
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { createTestDb, makeAlbumCaller } from './helpers';

describe.skipIf(!dbAvailable)('Album Router', () => {
  let db: TestDb;

  beforeAll(async () => {
    ({ db } = createTestDb());
    await db.insert(albums).values({ /* seed data */ });
  });

  afterAll(async () => {
    await db.delete(albums).where(...);
  });

  it('returns the album with its tracks', async () => {
    const caller = makeAlbumCaller(db);
    const result = await caller.getBySlug({ reciterSlug: '...', albumSlug: '...' });
    expect(result!.tracks.length).toBeGreaterThan(0);
  });
});
```

The test database requires PostgreSQL to be running. The `DATABASE_URL` env var in `apps/web/vitest.config.ts` points to `nawhas_test`:

```env
DATABASE_URL=postgresql://test:test@localhost:5432/nawhas_test
```

Create the test user once:

```sql
CREATE USER test WITH PASSWORD 'test';
CREATE DATABASE nawhas_test OWNER test;
```

Then apply migrations:

```bash
DATABASE_URL=postgresql://test:test@localhost:5432/nawhas_test \
  pnpm --filter @nawhas/db db:migrate
```

Use `describe.skipIf(!dbAvailable)` to gracefully skip router tests when no database is reachable.

### Seed unique data per test

To avoid test pollution, append a timestamp to slugs:

```typescript
const suffix = Date.now();
const RECITER_SLUG = `test-reciter-${suffix}`;
```

---

## End-to-End Tests (Playwright)

### Running

```bash
./dev test:e2e           # Docker mode (used in CI)
./dev test:e2e --ci      # CI mode (parallel workers, retries)
./dev test:e2e:ui        # Interactive UI mode (local debugging)
```

E2E tests require the full Docker stack plus the `nawhas.test` hosts entry:

```bash
echo '127.0.0.1 nawhas.test' | sudo tee -a /etc/hosts
./dev up
./dev db:seed
./dev test:e2e
```

### Production-like detail-page smoke check

Use this before deploys to catch production-only rendering regressions (like
`DYNAMIC_SERVER_USAGE`) on detail pages:

```bash
./dev smoke:prodlike
```

What it does:
- Starts the production-like web stack (`docker-compose.yml` + `docker-compose.ci.yml`)
- Seeds fixture data
- Verifies key detail pages return HTTP 200
- Fails if `DYNAMIC_SERVER_USAGE` appears in recent web logs

Optional overrides:

```bash
RECITER_SLUG=ali-safdar ALBUM_SLUG=panjtan-pak ./dev smoke:prodlike
```

### Location

```
apps/e2e/
├── tests/
│   ├── home.spec.ts
│   ├── reciters.spec.ts
│   ├── reciter-profile.spec.ts
│   ├── album-detail.spec.ts
│   ├── track-detail.spec.ts
│   ├── audio-playback.spec.ts
│   ├── search.spec.ts
│   ├── auth-login.spec.ts
│   └── auth-register.spec.ts
├── fixtures/
│   └── seed.ts          # Custom test fixture with seeded DB data
├── global-setup.ts
└── playwright.config.ts
```

### Fixtures

Use the custom `seed` fixture (not Playwright's built-in fixtures) to get consistent test data:

```typescript
import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';

test('playing a track shows the player bar', async ({ page, seedData }) => {
  await page.goto(`/reciters/${seedData.reciter.slug}/${seedData.album.slug}`);
  await page.getByRole('button', { name: `Play ${seedData.track.title}` }).click();

  const playerBar = page.getByRole('region', { name: 'Audio player' });
  await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();
});
```

### Conventions

- **Use `getByRole()`** — accessibility-first queries make tests resilient to CSS changes
- **Use `getByRole('region', { name: '...' })`** for major page sections (player bar, queue panel)
- **Use semantic regions** — the app uses `role="region"` with `aria-label` on key UI areas
- **Test state transitions** — e.g. Play button becomes Pause after click
- **Audio tests** — set a 15s timeout for auto-advance (the seeded MP3 fixtures are minimal)

---

## Accessibility Tests

### Automated (jest-axe, unit level)

Add axe assertions to component tests that cover meaningful UI:

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Automated (Playwright + axe-core, e2e level)

For full-page accessibility scans in E2E tests:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('home page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

See [ACCESSIBILITY.md](../ACCESSIBILITY.md) for the full WCAG 2.1 AA checklist and PR review requirements.

---

## Performance Tests

### Lighthouse CI

Runs against the production build on every CI push. Thresholds are defined in `.lighthouserc.json`:

- Performance ≥ 0.8 (warn)
- Accessibility ≥ 0.9 (**error** — only failing check that blocks a PR)
- LCP ≤ 2500ms, FCP ≤ 2000ms, CLS ≤ 0.1 (warn)

To run locally:

```bash
# Start the production stack
docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d --wait web

# Run Lighthouse
npx @lhci/cli autorun
```

### k6 Load Tests

A smoke test runs every Monday at 02:00 UTC. To run manually:

```bash
./dev up
k6 run apps/web/perf/k6/scripts/smoke.js
```

The smoke test checks:
- Homepage returns HTTP 200
- Response time under 500ms
- 1 virtual user for 10 seconds

To test against a live environment:

```bash
BASE_URL=https://nawhas.com k6 run apps/web/perf/k6/scripts/smoke.js
```
