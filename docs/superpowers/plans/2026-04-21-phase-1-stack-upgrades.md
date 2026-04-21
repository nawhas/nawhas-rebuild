# Phase 1 — Stack Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the entire nawhas-rebuild stack to current major versions in one coordinated batch, holding every CI check and Lighthouse threshold green.

**Architecture:** Single long-lived branch `chore/phase-1-upgrades`. Work proceeds in a strict order — regression-net tests first, then base runtime (Node), then TypeScript, then routine bumps, then the breaking majors (Zod → Typesense → diff → Next), then final verification. Each task ends with a commit; the branch is merged only when the full test suite + prodlike smoke + manual smoke all pass.

**Tech Stack:** pnpm monorepo, Turbo, Next.js 16, TypeScript 6, React 19, tRPC 11, Drizzle ORM, Typesense 3 client + 28 server, Zod 4, Better-Auth, Tailwind 4, Vitest, Playwright, axe-core, Docker Compose.

---

## Pre-flight: Worktree / branch setup

This plan is big enough that it should run in a dedicated worktree to keep `main` clean. From the repo root:

```bash
# Option A: dedicated worktree (recommended)
git worktree add -b chore/phase-1-upgrades ../nawhas-rebuild.phase-1 main
cd ../nawhas-rebuild.phase-1

# Option B: branch in-place
git checkout -b chore/phase-1-upgrades
```

Then enable corepack so pnpm resolves correctly: `corepack enable`.

Baseline: before touching anything, capture a green-state baseline by running `./dev qa && ./dev test:e2e && ./dev smoke:prodlike` and saving the output. If any of those are red on `main`, **stop and fix them first** — you cannot distinguish upgrade-induced regressions from pre-existing failures otherwise.

---

## Task 1: Tighten search integration coverage (regression net)

**Why this comes first:** Typesense 2 → 3 + server 26 → 28 is the upgrade most likely to silently return wrong results. The existing tests (`apps/web/src/__tests__/search.test.ts`, `apps/web/src/server/routers/__tests__/` do not yet cover) are component/route-level. We need a direct router-level test around `search.autocomplete` and `search.query` that hits a real Typesense instance and asserts on shape + ranking so the upgrade breakage is loud.

**Files:**
- Create: `apps/web/src/server/routers/__tests__/search.test.ts`
- Reference: `apps/web/src/server/routers/search.ts` (public shape of the router)
- Reference: `apps/web/src/__tests__/helpers.ts` and `apps/web/src/server/routers/__tests__/helpers.ts` (test harness patterns)

- [ ] **Step 1: Read the search router to map its public surface**

Run: `cat apps/web/src/server/routers/search.ts`. Note the procedure names, input shapes, and return shapes. Note how `syncTrack`, `syncAlbum`, `syncReciter` work in `apps/web/src/lib/typesense/sync.ts` — these are how test fixtures end up indexed.

- [ ] **Step 2: Read the existing test helpers**

Run: `cat apps/web/src/server/routers/__tests__/helpers.ts`. Mirror the same setup pattern (the caller factory, DB seed helpers) so this test fits the existing harness rather than inventing a new one.

- [ ] **Step 3: Write failing tests**

Create `apps/web/src/server/routers/__tests__/search.test.ts` with:

```ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { makeCaller, seedFixtures, clearDb, resetTypesense } from './helpers';

describe('search router', () => {
  beforeAll(async () => {
    await resetTypesense();
  });

  beforeEach(async () => {
    await clearDb();
    await seedFixtures({
      reciters: [
        { slug: 'nadeem-sarwar', name: 'Nadeem Sarwar' },
        { slug: 'mir-hasan-mir', name: 'Mir Hasan Mir' },
      ],
      albums: [
        { reciterSlug: 'nadeem-sarwar', slug: 'ya-hussain', title: 'Ya Hussain', year: 2020 },
      ],
      tracks: [
        { albumSlug: 'ya-hussain', slug: 'karbala', title: 'Karbala' },
        { albumSlug: 'ya-hussain', slug: 'hussain', title: 'Hussain' },
      ],
    });
  });

  it('autocomplete returns reciters, albums, tracks with highlighted snippets', async () => {
    const caller = await makeCaller();
    const result = await caller.search.autocomplete({ q: 'hussain' });

    expect(result.reciters).toBeDefined();
    expect(result.albums).toBeDefined();
    expect(result.tracks).toBeDefined();
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks[0].title).toMatch(/hussain/i);
  });

  it('autocomplete handles diacritic-insensitive queries', async () => {
    const caller = await makeCaller();
    const result = await caller.search.autocomplete({ q: 'Husain' }); // missing second 's'
    expect(result.tracks.some((t) => /hussain/i.test(t.title))).toBe(true);
  });

  it('query returns paginated results and supports type filtering', async () => {
    const caller = await makeCaller();
    const result = await caller.search.query({ q: 'hussain', type: 'track', page: 1 });
    expect(result.hits.every((h) => h.type === 'track')).toBe(true);
    expect(result.page).toBe(1);
  });

  it('empty query returns empty results without error', async () => {
    const caller = await makeCaller();
    const result = await caller.search.autocomplete({ q: '' });
    expect(result.reciters).toEqual([]);
    expect(result.albums).toEqual([]);
    expect(result.tracks).toEqual([]);
  });
});
```

If `resetTypesense`, `clearDb`, `seedFixtures`, or `makeCaller` do not exist with those names, add them to `helpers.ts` following the pattern of the existing helpers. If the exact function names in the router (`autocomplete`, `query`) differ, mirror the real names — do not invent.

- [ ] **Step 4: Run the tests to confirm they cover real behaviour, not trivially-pass mocks**

Run: `./dev test apps/web/src/server/routers/__tests__/search.test.ts`
Expected: all four tests PASS (the router already works). The value here is that these tests will now LOUD-FAIL when the Typesense upgrade breaks ranking, filtering, or highlighting.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/routers/__tests__/search.test.ts apps/web/src/server/routers/__tests__/helpers.ts
git commit -m "test(search): add router-level integration coverage as upgrade regression net"
```

---

## Task 2: Tighten lyrics diff viewer coverage (regression net)

**Why:** `diff` v8 → v9 changed its public API in small ways (see migration notes). The lyrics diff viewer (`apps/web/src/components/mod/field-diff.tsx`) is the only consumer. Lock its output with a unit test before the bump.

**Files:**
- Create: `apps/web/src/components/mod/__tests__/field-diff.test.tsx`
- Reference: `apps/web/src/components/mod/field-diff.tsx`

- [ ] **Step 1: Read the current FieldDiff component**

Run: `cat apps/web/src/components/mod/field-diff.tsx`. Note the props, the shape of its output markup, and exactly how it calls `diffWords`.

- [ ] **Step 2: Write failing tests**

Create `apps/web/src/components/mod/__tests__/field-diff.test.tsx` with:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FieldDiff } from '../field-diff';

describe('FieldDiff', () => {
  it('renders unchanged words without markers', () => {
    const { container } = render(<FieldDiff before="hello world" after="hello world" />);
    expect(container.querySelectorAll('ins, del')).toHaveLength(0);
    expect(container.textContent).toContain('hello world');
  });

  it('marks added words with <ins>', () => {
    const { container } = render(<FieldDiff before="hello" after="hello world" />);
    const ins = container.querySelector('ins');
    expect(ins).not.toBeNull();
    expect(ins?.textContent?.trim()).toBe('world');
  });

  it('marks removed words with <del>', () => {
    const { container } = render(<FieldDiff before="hello world" after="hello" />);
    const del = container.querySelector('del');
    expect(del).not.toBeNull();
    expect(del?.textContent?.trim()).toBe('world');
  });

  it('handles empty before string', () => {
    const { container } = render(<FieldDiff before="" after="hello" />);
    expect(container.querySelector('ins')?.textContent).toContain('hello');
  });

  it('handles empty after string', () => {
    const { container } = render(<FieldDiff before="hello" after="" />);
    expect(container.querySelector('del')?.textContent).toContain('hello');
  });
});
```

If the component's props aren't `{ before, after }`, mirror the real prop names. If the markup uses spans with classes rather than `ins`/`del`, assert on those selectors instead — the point is to lock *some* stable output shape.

- [ ] **Step 3: Run tests to confirm PASS**

Run: `./dev test apps/web/src/components/mod/__tests__/field-diff.test.tsx`
Expected: all five tests PASS against current `diff` v8.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/mod/__tests__/field-diff.test.tsx
git commit -m "test(mod): add FieldDiff regression coverage before diff 9 upgrade"
```

---

## Task 3: Node 20 → 22 LTS

**Why first among upgrades:** every subsequent upgrade runs on this runtime. Moving it first means the rest of the work is already executing against the runtime the upgraded stack will target.

**Files:**
- Modify: `apps/web/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.web-prod.yml`
- Modify: `docker-compose.ci.yml`
- Modify: `docker-compose.test.yml`
- Modify: `package.json` (root — `engines.node`)

- [ ] **Step 1: Update Dockerfile base images**

Edit `apps/web/Dockerfile`. Replace every `FROM node:20-alpine` with `FROM node:22-alpine`. Do the same replacement for any other Dockerfile in the repo (check with `grep -rn "node:20" --include=Dockerfile`).

- [ ] **Step 2: Update docker-compose images**

In every `docker-compose*.yml`, replace `image: node:20-alpine` with `image: node:22-alpine`. Grep first: `grep -rn "node:20" --include="docker-compose*"`.

- [ ] **Step 3: Update engines field**

Edit root `package.json`:

```json
"engines": {
  "node": ">=22"
}
```

- [ ] **Step 4: Rebuild images and run the full CI-equivalent locally**

```bash
./dev down
./dev build
./dev qa
./dev test:e2e
```

Expected: green. If deprecation warnings appear (Node 22 deprecates some APIs that Node 20 didn't) — fix them inline rather than suppressing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/Dockerfile docker-compose*.yml package.json
git commit -m "chore(runtime): upgrade Node 20 → 22 LTS"
```

---

## Task 4: TypeScript 5.7 → 6.0

**Why before other major bumps:** TS 6 surfaces new strictness and lib type changes. Hitting those now means subsequent upgrades have a stable type baseline to compare against — otherwise "did Zod 4 cause this error or did TS 6?" becomes a guessing game.

**Files:**
- Modify: `apps/web/package.json`, `packages/db/package.json`, `packages/ui/package.json`, `packages/types/package.json` — every `typescript` dependency
- Expect to modify: various `.ts` / `.tsx` files to satisfy new strictness

- [ ] **Step 1: Bump typescript in every package**

Run this one command from the repo root (pnpm handles the workspace):

```bash
pnpm up -r typescript@^6.0.3
```

- [ ] **Step 2: Re-install and re-build types**

```bash
pnpm install
pnpm -r typecheck
```

- [ ] **Step 3: Fix typecheck errors**

Read TS 6 release notes as you go (https://devblogs.microsoft.com/typescript/announcing-typescript-6/). Common sources of new errors:
- Stricter `lib.dom.d.ts` types (e.g. `FormData.get()` return types)
- Narrower inference on `Array.prototype.flat` and similar
- `unknown`-returning `JSON.parse` now propagating further

Fix at the *type* level, not by casting. If you need a cast, add a one-line comment explaining why.

- [ ] **Step 4: Run the full test suite**

```bash
./dev qa
./dev test:e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(ts): upgrade TypeScript 5.7 → 6.0 + typecheck fixes"
```

---

## Task 5: Routine minor/patch bumps (single batch)

Everything below is semver-minor or patch; landing them in one commit is fine because they compose cleanly and none introduces breaking changes.

**Files:**
- Modify: all `package.json` files that declare these dependencies

- [ ] **Step 1: Bump each dependency across the workspace**

Run from repo root:

```bash
pnpm up -r \
  react@^19.2.5 react-dom@^19.2.5 \
  @types/react@^19.2 @types/react-dom@^19.2 \
  drizzle-orm@^0.45.2 drizzle-kit@^0.31.10 \
  better-auth@^1.6.5 \
  "@trpc/server@^11.16.0" "@trpc/client@^11.16.0" "@trpc/react-query@^11.16.0" \
  "@tanstack/react-query@^5.99.2" \
  tailwindcss@^4.2.4 "@tailwindcss/postcss@^4.2.4" \
  turbo@^2.9.6 \
  eslint@^10.2.1 \
  "@sentry/nextjs@^10.49.0" \
  vitest@^4.1.5 "@vitest/browser@^4.1.5" \
  next-intl@^4.9.1 \
  "@aws-sdk/client-s3@^3.1033.0" "@aws-sdk/s3-request-presigner@^3.1033.0" \
  postgres@^3.4.9 \
  axe-core@^4.11.3 \
  "@testing-library/react@^16.3.2"
```

- [ ] **Step 2: Re-install**

```bash
pnpm install
```

- [ ] **Step 3: Typecheck + unit tests**

```bash
./dev qa
```

Expected: green. If drizzle-orm's newer version renames any helpers, fix call sites. If better-auth's config shape changed, update the Better-Auth initializer (check `apps/web/src/server/auth.ts` or wherever it lives).

- [ ] **Step 4: E2E**

```bash
./dev test:e2e
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(deps): bump routine minor/patch versions across workspace"
```

---

## Task 6: Zod 3 → 4

**Why after routine bumps:** minor-version packages may pull in newer Zod peer ranges; bumping Zod after them avoids fighting resolutions twice.

**Changes to expect in Zod 4** (verify against the official migration guide first: https://zod.dev/v4):
- `z.string().email()` → `z.email()` (still works but deprecated)
- `z.string().url()` → `z.url()` (same)
- `z.string().uuid()` → `z.uuid()` (same)
- `z.string().ip()` split into `z.ipv4()` / `z.ipv6()`
- `errorMap` option renamed in some APIs
- Stricter inference on optional / nullable in some edge cases
- `z.coerce.*` behaviour unchanged but internals differ (watch for edge cases)

**Files:**
- Modify: `apps/web/package.json` — zod version
- Expect to modify: every tRPC router in `apps/web/src/server/routers/` that uses Zod
- Expect to modify: Better-Auth plugin configuration that passes Zod schemas
- Expect to modify: any form validator using Zod

- [ ] **Step 1: Bump zod**

```bash
pnpm up -r zod@^4.3.6
pnpm install
```

- [ ] **Step 2: Run typecheck and read every error**

```bash
pnpm -r typecheck 2>&1 | tee /tmp/zod4-errors.log
```

- [ ] **Step 3: Fix errors router-by-router**

For each tRPC router with failing types, open it and apply the migration mechanically. Keep diffs small and focused. The codebase uses mostly `z.string().min(1)` and `z.object({...})` — those are unchanged. The deprecation warnings for `z.string().email()` / `.url()` / `.uuid()` can be migrated to the new shorthand in the same pass.

Example before/after:

```ts
// before
const input = z.object({ email: z.string().email(), userId: z.string().uuid() });
// after
const input = z.object({ email: z.email(), userId: z.uuid() });
```

- [ ] **Step 4: Run unit tests for every router**

```bash
./dev test apps/web/src/server/routers/__tests__
```

Pay attention: if tests pass an invalid value and expect a specific error message, Zod 4's default error messages changed — assert on `code` / `path` rather than `message` if they break.

- [ ] **Step 5: Run full suite + e2e**

```bash
./dev qa && ./dev test:e2e
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(zod): upgrade Zod 3 → 4 across router inputs and validators"
```

---

## Task 7: Typesense client 2 → 3 + server 26 → 28

**Why now:** this is the upgrade the regression net from Task 1 was built for. Do it with full test coverage in place.

**Changes to expect** (verify against https://typesense.org/docs/upgrade/):
- Client v3 moves several options under nested config objects
- Multi-search API shape tightened
- Some field `facet` defaults changed
- Server 28 has new collection defaults; existing collections migrate transparently but schema reconciliation (already in the codebase — see recent commit `418127f`) must run cleanly

**Files:**
- Modify: `apps/web/package.json` and `packages/db/package.json` — typesense version
- Modify: `docker-compose.yml` and `docker-compose.ci.yml` — `typesense/typesense:28.x`
- Modify: `apps/web/src/lib/typesense/client.ts` — client initialisation
- Modify: `apps/web/src/lib/typesense/collections.ts`, `packages/db/src/typesense/collections.ts` — collection schemas if needed
- Modify: `apps/web/src/lib/typesense/sync.ts` — if sync API shape changed

- [ ] **Step 1: Bump the npm client**

```bash
pnpm up -r typesense@^3.0.6
pnpm install
```

- [ ] **Step 2: Bump the server image**

In every docker-compose file using Typesense, change the image tag from `typesense/typesense:26.0` to `typesense/typesense:28.0` (check the latest patch tag on Docker Hub first).

- [ ] **Step 3: Reset local Typesense data**

```bash
./dev down
docker volume rm $(docker volume ls -q | grep typesense) 2>/dev/null || true
./dev up
```

- [ ] **Step 4: Re-run schema reconciliation**

```bash
./dev exec web pnpm -F @nawhas/db db:typesense-ensure
```

Read the output. Any "field mismatch" or "collection recreated" messages are expected on first run after a server-major jump; repeat runs should be idempotent (no changes).

- [ ] **Step 5: Typecheck + fix client call sites**

```bash
pnpm -r typecheck
```

The compile errors (if any) tell you exactly which call sites need updating. Apply the v3 migration pattern from the Typesense docs — typically wrapping raw options into structured config.

- [ ] **Step 6: Run the regression net from Task 1**

```bash
./dev test apps/web/src/server/routers/__tests__/search.test.ts
```

Expected: all four tests from Task 1 PASS. If ranking order changed and a test fails on ordering, update the test to match the new (correct) order **only** if you can justify why — otherwise investigate.

- [ ] **Step 7: Full suite + e2e**

```bash
./dev qa && ./dev test:e2e
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(typesense): upgrade client 2 → 3 and server 26 → 28"
```

---

## Task 8: diff 8 → 9

**Why:** smallest breaking upgrade, isolated to one component, protected by the test from Task 2.

**Changes to expect:** `diff` v9 changed default option names (e.g. `ignoreCase` default, `oneChangePerToken` behaviour). The `diffWords` signature is stable but return type is slightly refined.

**Files:**
- Modify: `apps/web/package.json` — `diff` and `@types/diff`
- Expect to modify: `apps/web/src/components/mod/field-diff.tsx`

- [ ] **Step 1: Bump**

```bash
pnpm up -r diff@^9.0.0 "@types/diff@^9.0.0"
pnpm install
```

- [ ] **Step 2: Run the FieldDiff test**

```bash
./dev test apps/web/src/components/mod/__tests__/field-diff.test.tsx
```

- [ ] **Step 3: Fix any failures**

If the output markup shape changed (e.g. the returned tokens no longer include the trailing space, or the `value` field was renamed), update `field-diff.tsx` to consume the v9 shape. The test assertions anchor the **desired** output; change component internals, not the test expectations, unless the test assertions themselves are too strict.

- [ ] **Step 4: Typecheck + e2e smoke of the mod pages**

```bash
pnpm -r typecheck
./dev test:e2e -g "moderation"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(diff): upgrade diff 8 → 9"
```

---

## Task 9: Next.js 15 → 16

**Why last:** biggest blast radius. Everything underneath it is stable, so any regression here is unambiguously a Next 16 issue.

**Changes to expect** (verify against https://nextjs.org/docs/upgrading):
- `fetch` default caching changed from "cached" to "uncached" unless opted in with `cache: 'force-cache'` or `next: { revalidate }`
- `params` and `searchParams` are now always `Promise`s in async RSCs
- `cookies()` and `headers()` already returning `Promise` — the ESLint rule in `f58dbc3` already forced app code to `await` these, so this should be a no-op
- Turbopack is the default dev bundler; `next dev` uses it automatically
- React Compiler opt-in available via `experimental.reactCompiler`
- `next/image` default behaviour tightened on a few edge cases
- Some `next.config.ts` options moved or renamed

**Files:**
- Modify: `apps/web/package.json` — `next`, `@next/bundle-analyzer`, `@next/eslint-plugin-next`
- Modify: `apps/web/next.config.ts` — migrate any renamed options
- Expect to modify: any `page.tsx` / `layout.tsx` that reads `params` / `searchParams` synchronously (should already be awaited after recent commits, but verify)
- Expect to modify: fetch call sites that relied on implicit caching

- [ ] **Step 1: Bump Next and its tooling**

```bash
pnpm up -r next@^16.2.4 "@next/bundle-analyzer@^16.2.4" "@next/eslint-plugin-next@^16.2.4"
pnpm install
```

- [ ] **Step 2: Run the Next codemod**

```bash
pnpm exec next codemod latest apps/web
```

Read every file it modifies and sanity-check the diff. Codemods are good at mechanical changes but occasionally misinterpret unusual patterns.

- [ ] **Step 3: Typecheck**

```bash
pnpm -r typecheck
```

Fix any async-param / async-cookies / async-headers residue that the codemod missed.

- [ ] **Step 4: Build**

```bash
./dev build
```

If the build warns about fetch calls missing explicit caching directives, audit those call sites. For static catalogue content (reciters, albums, tracks in RSCs) we want `cache: 'force-cache'` or `next: { revalidate: N }` to restore the pre-16 behaviour. For user-specific queries (library, history, profile) the new uncached default is correct.

- [ ] **Step 5: Run dev server against real services and smoke manually**

```bash
./dev up -d
./dev logs web -f &
# In another shell, open http://localhost:3000 and click through:
#   home → a reciter → an album → a track (play audio) → search → library (logged-in) → contribute → /mod
```

Kill the log tail when done.

- [ ] **Step 6: Full CI-equivalent**

```bash
./dev qa
./dev test:e2e
./dev smoke:prodlike
```

- [ ] **Step 7: Run Lighthouse**

```bash
pnpm perf:lighthouse
```

Confirm: performance ≥ 0.8, accessibility ≥ 0.9, LCP ≤ 2500ms, FCP ≤ 2000ms, CLS ≤ 0.1. If performance dropped, the most likely cause is caching defaults — fix by opting static routes back in.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(next): upgrade Next.js 15 → 16"
```

---

## Task 10: Final verification + cleanup

**Files:**
- Modify: `README.md` — update Node version badge in prerequisites
- Modify: `docs/dev-setup.md` — same
- Modify: `ARCHITECTURE.md` — any version-specific callouts

- [ ] **Step 1: Scan for stale version mentions**

```bash
grep -rn "Node.js 20\|node 20\|Next.js 15\|Next 15\|TypeScript 5\|Zod 3\|typesense 26" \
  README.md ARCHITECTURE.md docs/ CONTRIBUTING.md 2>/dev/null
```

Update any hits.

- [ ] **Step 2: Run the full CI matrix locally one more time from a clean state**

```bash
./dev down
docker volume rm $(docker volume ls -q | grep nawhas) 2>/dev/null || true
./dev up
./dev db:migrate
./dev db:seed
./dev qa
./dev test:e2e
./dev smoke:prodlike
pnpm perf:lighthouse
```

All steps green = Phase 1 done.

- [ ] **Step 3: Commit doc updates**

```bash
git add README.md docs/ ARCHITECTURE.md CONTRIBUTING.md
git commit -m "docs: update stack version references post-upgrade"
```

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin chore/phase-1-upgrades
gh pr create --title "chore: Phase 1 stack upgrades (Next 16, TS 6, Zod 4, Typesense 3/28)" \
  --body "$(cat <<'EOF'
## Summary
- Node 20 → 22 LTS, TypeScript 5.7 → 6.0
- Zod 3 → 4, Typesense client 2 → 3, server 26 → 28
- diff 8 → 9, Next.js 15 → 16
- Plus routine minor/patch bumps across the workspace

Implements Phase 1 of `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md`.

## Test plan
- [x] `./dev qa` green
- [x] `./dev test:e2e` green
- [x] `./dev smoke:prodlike` green
- [x] `pnpm perf:lighthouse` holds thresholds (perf ≥ 0.8, a11y ≥ 0.9)
- [x] Manual smoke: home, reciter, album, track (audio), search, library, contribute, mod
EOF
)"
```

- [ ] **Step 5: When PR is green and reviewed, squash-merge and delete branch**

(Post-merge action, not automated.)

---

## Rollback / Bail-out

If Task 9 (Next 16) gets stuck and can't be resolved in a reasonable time, **do not abandon the rest of the upgrade work**. Cut a partial PR with Tasks 1–8 merged and open a separate follow-up issue for Next 16. Every task ends with a green commit — the branch is safe to checkpoint at any point.
