# Nawhas Rebuild — Roadmap (April 2026)

**Status:** Phase 1 shipped (2026-04-21) · Phase 2.1 shipped (2026-04-22) · Phase 2.2 not started
**Author:** Asif (brainstormed with Claude)
**Created:** 2026-04-21
**Last updated:** 2026-04-22

## Context

Nawhas.com runs in production on the legacy stack (Laravel + Nuxt 2 + Vuetify, monorepo at `github.com/nawhas/nawhas`). A rebuild in this repository (`nawhas-rebuild`) is well underway on a modern stack. The rebuild is already at or ahead of the live production feature set, but has two gaps preventing a public cutover: the visual styling no longer matches the production aesthetic, and several core dependencies have since moved a major version.

This document lays out the roadmap for taking the rebuild to public launch and beyond. It is a **top-level roadmap**, not an implementation plan — each phase below will be broken into its own spec and plan before execution.

## Goals

1. **Modernize the foundation.** The primary purpose of the rebuild is to shed legacy stack friction (Laravel + Nuxt 2) that historically blocked contributors. Keeping the stack current is therefore a first-class goal, not a nice-to-have.
2. **Match the production visual identity.** The rebuild currently does not match the Shia-devotional aesthetic of live `nawhas.com` across colour, typography, spacing, and component polish. A proper design pass is a launch blocker.
3. **Grow contributors.** Today the project is maintained by two people. Post-launch the rebuild needs to be easy to discover, trivial to set up, and have a groomed backlog so outside contributors can land their first PR without asking.

## Non-Goals

- **Blind feature parity with the legacy repo.** The legacy repo contains features that are not shipped in production today (stories, draft-lyrics diff viewer, print-lyrics, moderator tools that never went live). These are out of scope for the launch.
- **Net-new feature work before launch.** Playlists, topics/browse-by-event, MP3 download, mobile app, etc. are post-launch. They're tracked separately from this roadmap.

## Approach

**Approach A — sequential.** Stack upgrades first, design pass second, launch third, community push fourth. Rationale: redesigning components against a Next 15 / Zod 3 / Typesense-client 2 codebase wastes work when those are about to change. Getting upgrades out of the way first means the design pass is the last thing to touch any given file.

The alternative considered — running design and upgrades in parallel — was rejected here for two reasons: a two-person team creates real merge friction between the tracks, and locking in tokens against soon-to-change primitives (e.g. Tailwind 4.x minor bumps, Next 16 RSC caching behaviour) risks rework.

## Phase 1 — Stack Upgrades (single batch) ✅ shipped 2026-04-21

All upgrades land in a single coordinated PR stream. The upgrades are interlocked — Next 16's caching behaviour interacts with tRPC/react-query, Zod 4 is pulled in by newer versions of some consumers, and TypeScript 6's stricter lib types surface issues across every bumped package — so there is no clean seam at which to split them.

### Major-version changes (drive the effort)

- **Next.js 15.1 → 16.2** — async dynamic APIs (work already started via the `headers()/cookies()` ESLint rule in recent commits), new caching defaults, Turbopack default, React Compiler opt-in evaluation.
- **TypeScript 5.7 → 6.0** — typecheck sweep + stricter lib types.
- **Zod 3.24 → 4.3** — every tRPC input/output schema, every Better-Auth plugin config, every form validator.
- **Typesense npm client 2 → 3** + **Typesense server 26 → 28 (Docker)** — sync code, collection schemas, reconciliation runner.
- **diff 8 → 9** — lyrics diff viewer only.
- **Node 20 → 22 LTS** — Docker base images + `engines` field.

### Routine minor/patch bumps (ride along)

| Package | From | To |
|---|---|---|
| react, react-dom | 19.0 | 19.2 |
| drizzle-orm | 0.39.3 | 0.45.2 |
| drizzle-kit | 0.30.4 | 0.31.10 |
| better-auth | 1.2.5 | 1.6.5 |
| @trpc/* | 11.0.0 | 11.16.0 |
| @tanstack/react-query | 5.65.1 | 5.99.2 |
| tailwindcss | 4.0.6 | 4.2.4 |
| turbo | 2.3.3 | 2.9.6 |
| eslint | 10.1.0 | 10.2.1 |
| @sentry/nextjs | 10.47.0 | 10.49.0 |
| vitest | 4.1.0 | 4.1.5 |
| next-intl | 4.9.0 | 4.9.1 |
| @aws-sdk/* | 3.1022 | 3.1033 |
| postgres | 3.4.5 | 3.4.9 |

### Verification

Before starting: expand integration coverage around search and the lyrics diff viewer — these are the two surfaces most likely to regress silently under the major jumps. Those tests become the regression net.

After landing: all four required CI checks green (quality, build, docker-build, e2e) + Lighthouse thresholds held (perf ≥ 0.8, a11y ≥ 0.9, LCP ≤ 2500ms, FCP ≤ 2000ms, CLS ≤ 0.1) + prodlike smoke test passes + manual smoke of home, reciter, album, track, search, auth, library, contribute, and mod flows. Next 16's caching defaults are the single most likely source of debugging pain; budget accordingly.

### Outcomes (shipped)

Phase 1 landed as 16 commits on `main` (`832c236..2ad0d9b`). All CI jobs green including Deploy to Staging — staging now runs the full upgraded stack.

**Regression nets** (before the breaking upgrades):

| Commit | Surface |
|---|---|
| `bffcfae` + `80293e4` | Search router integration test with bounded Typesense-indexing poll |
| `ef30ad3` + `8e4f858` | FieldDiff component unit tests, tolerant of diff-v9 tokeniser quirks |

**Stack upgrade commits:**

| Commit | Upgrade | Source-code footprint |
|---|---|---|
| `8019c21` | Node 20 → 22 LTS | Dockerfiles, docker-compose, `.nvmrc`, `engines.node` |
| `dddb7cc` | TypeScript 5.7 → 6.0 | +1 new `global.d.ts` for TS 6's CSS ambient-module change |
| `056a264` | Routine minor/patch batch (react, drizzle, better-auth, tRPC, react-query, tailwind, turbo, eslint, sentry, vitest, next-intl, aws-sdk, postgres, axe-core, testing-library) | Zero source changes |
| `7b6398c` | Zod 3 → 4 | 29 deprecated `z.string().email()/.url()/.uuid()` call sites migrated to `z.email()`/`.url()`/`.uuid()` shorthand across 9 files |
| `3aad6ba` | Typesense client 2 → 3 + server 26 → 28 | Zero source changes — client v3 preserved every signature we use |
| `05005ce` | diff 8 → 9 | Zero source changes — `Change` shape unchanged |
| `8fedc28` | Next.js 15 → 16 | `apps/web/middleware.ts` renamed to `apps/web/proxy.ts` via codemod; removed `eslint.ignoreDuringBuilds` (Next 16 dropped built-in ESLint integration) |

**Closeout commits:**

| Commit | Purpose |
|---|---|
| `cf8869d` | Refresh stale version refs in README, CONTRIBUTING, docs/dev-setup |
| `0b2d752` | Update `require-dynamic-for-headers-cookies` ESLint rule message for Next 16 |

### Follow-ups surfaced during / after Phase 1 (all resolved)

| # | Title | Root cause | Commit |
|---|---|---|---|
| 11 | Search router fragile on fresh Typesense index | `query_by` referenced `lyrics_en/fr/transliteration` but only `lyrics_ar/ur` were declared as explicit schema fields; wildcard-only fields don't materialise until a doc is upserted, so a fresh index 404s. Introduced `SEARCHABLE_LYRICS_LANGUAGES` as single source of truth for the schema + the router query. | `0b701e0` |
| 12 | Pre-existing DB-backed router test failures | Four real test bugs: `library.list` / `history.list` passed `limit: 1000` (Zod `max(100)` rejects); `history.clear` asserted `.toBeDefined()` on a correct `Promise<void>` return; `moderation.test.ts` afterAll deleted users before `audit_log` FK rows (added explicit cleanup). | `04b1888` |
| 13 | "Docker build fails with `@nawhas/db` resolution" | Misdiagnosed on filing — was actually a cascading symptom of Typesense v3's `CollectionSchema = Required<…>` widening the type. A test mock missed 7 new required fields. `pnpm -r typecheck` passed locally because incremental `tsc --build` used a stale `tsconfig.tsbuildinfo` and skipped rechecking. Docker and CI both build fresh, caught it immediately. | `94be04c` |
| 14 | Helm chart Typesense still at 27.1 | Phase 1 bumped `docker-compose.yml` to `28.0` but the plan didn't enumerate Helm surfaces. Parameterised the image tag via `.Values.typesense.image`, default now `28.0`. Production unaffected (runs Typesense out-of-band with `typesense.enabled: false`). | `2ad0d9b` |

### Lessons worth carrying forward

- **Incremental `tsc --build` masks type regressions after dep major-bumps.** `pnpm -r typecheck` can report clean locally while Docker and CI both fail the same check. Before a dep major-bump's verification pass, run either `tsc --build --force` or delete `tsconfig.tsbuildinfo` workspace-wide so the typecheck matches what CI will see. Bit this cycle in Task 7 (Typesense v3 → `CollectionSchema` widening masked in `collections.test.ts` mock) and only surfaced when CI went red on the post-upgrade push.
- **The prep work (async-request-API ESLint rule in `f58dbc3`, `dynamic = 'force-dynamic'` in `f0b01d8`) made Next 16 trivial.** The Next 15 → 16 migration was one of the larger blast-radius upgrades in the industry this cycle; this codebase absorbed it in a single commit with a codemod + one config-key removal because the async-dynamic-APIs prerequisite had already been front-loaded. Worth repeating that pattern: when an upcoming framework jump has a known prerequisite, add it as a lint rule / config early and let it bake in over weeks before the actual bump.
- **Regression-net tests for dep-major-bumps paid off.** Tasks 1 and 2 added tests specifically as regression nets for Tasks 7 and 8 (Typesense and diff). Both ran against their target upgrades and passed — the tests prevented the kind of silent drift that's typical in this class of upgrade. Adopt the same pattern for future breaking bumps in Phase 2 onwards.

## Phase 2 — Design System + Visual Parity

**Unblocked:** Phase 1 is merged, staging is green on the upgraded stack, and the four post-upgrade follow-ups are closed. Tokens and primitives defined here will land against the stable Next 16 / TS 6 / Tailwind 4.2 baseline.

### 2.1 Legacy visual audit ✅ shipped 2026-04-22

Scope (original plan): screenshot every live production page across desktop and mobile breakpoints; extract design tokens and write them to `docs/design/tokens.md`. In execution, the audit pivoted to a code-first pass against the legacy repo via `gh api` (no screenshots, no local clone) — the legacy source was the canonical record, screenshots would have added noise without adding fidelity.

Three deliverables committed direct to `main` under `docs/design/`:

| File | Purpose | Commit |
|---|---|---|
| [`docs/design/tokens.md`](../../design/tokens.md) | Six-family comparative token audit (palette, typography, spacing, radius, shadows, motion) — ~67 rows, every legacy value citation-backed. | `529c0f7` |
| [`docs/design/layouts.md`](../../design/layouts.md) | Per-page skeletons for the 10 live production routes + shared chrome (header, footer, player bar, notifications), compared against rebuild equivalents. | `6cbc759` |
| [`docs/design/README.md`](../../design/README.md) | Index: methodology, summary of findings, what-we-did-not-carry-over list, verify-before-porting list, deferred visual-verification agenda. | `b8ae1ab` |

Also committed: the spec and implementation plan for this sub-project (`docs/superpowers/specs/2026-04-22-phase-2-1-legacy-audit-design.md` and `docs/superpowers/plans/2026-04-22-phase-2-1-legacy-audit.md`).

### Findings surfaced for Phase 2.2 / 2.3

The most impactful deltas the audit surfaced — each is a product/design decision that needs an answer before 2.2 can codify tokens or 2.3 can redesign pages:

- Rebuild's brand palette is hue-flipped from legacy (green/amber vs red/grey) — pick one before tokens land.
- Rebuild has no PWA manifest; legacy declares `theme_color #da0000` and installs as a standalone app.
- Rebuild home has no hero; legacy has a red-gradient hero with inline search as the primary entry point.
- Rebuild Track page lyrics are fully static; legacy has active-line highlight + scroll-sync driven by Vuex timing state.
- Language switching (AR / UR / EN / romanized tabs on lyrics) exists only in the rebuild — legacy has no equivalent.
- PlayerBar has two regressions vs legacy: no `pb-20` reservation on `body` (content scrolls under the bar) and a downward `shadow-lg` instead of legacy's upward cast.
- Rebuild has drifted larger on radius across the board (cards 8px vs 4px, buttons/inputs 6px vs 4px, etc.) — either ratify the drift or revert.
- Legacy uses three competing motion vocabularies (Vuetify, custom cubic-bezier, Material standard easing); Tailwind's `ease-in-out` is byte-identical to the Material standard curve, so rebuild can consolidate on Tailwind defaults without loss.

The README's "Verify before porting" section enumerates the full list of product/design decisions that must resolve before 2.2 starts.

### Deferred to a follow-up visual verification pass (2.1b)

~12 items that a code-first audit can't settle without eyeballs: Vuetify elevation `rgba` stacks, dark-mode surface colours, lyrics scroll-sync interaction timings, elevation-lift animations on hover, and a handful of layout edge cases. Full list in `docs/design/README.md § Deferred: visual verification agenda`. Not a blocker for 2.2 — tokens can land against the code-audit findings and 2.1b can reconcile later.

### Lessons worth carrying forward

- **Code-first audits via `gh api` are tractable at this legacy's scale.** Roughly 3 hours of execution time, no local clone, full provenance citations throughout. Worth repeating for future legacy-system audits rather than cloning + `grep`ping locally — the citation trail is more durable than a shell history.
- **Discovery tasks should go first and stay uncommitted.** The liveness sweep + source-of-truth ladder in `.audit-notes.md` prevented every downstream task from re-discovering the same facts; committing it would have duplicated content in the final README without adding signal.
- **Soft line caps on audit entries are aspirational.** The 30-line cap on per-page entries was exceeded for every entry (actual: 40–71 lines); trimming would have lost load-bearing structural deltas. Plan for ~50-line audit-entry reality on the next pass.

### 2.2 Design-system foundation in `packages/ui`

The groundwork is already in place: Radix Slot, class-variance-authority, tailwind-merge — the shadcn/ui recipe. This phase codifies the tokens into the Tailwind 4 theme layer and fills in the missing primitives: Button variants, Card, Dialog, Tabs, DropdownMenu, Tooltip, Sheet, Input, Select, Toast. Each primitive ships with a Vitest render test and a visual snapshot.

### 2.3 Page-by-page redesign

Redesign in descending order of user traffic. Each page ships behind the same bar:

1. Home
2. Reciter profile
3. Album
4. Track — the key surface (audio + lyrics + metadata)
5. Library / History / Saved / Liked
6. Search results
7. Auth pages
8. Contribute + Mod (lowest traffic)

Every page gets a Playwright visual-regression snapshot on its way in. After that phase the parity bar is objective: the snapshot matches or the PR is red.

## Phase 3 — Launch Prep

### 3.1 Data strategy

Open decision, owner: Asif. Two paths:

- **Import legacy data:** one-shot migration from the legacy Laravel database into the new Drizzle schema. Preserves existing slugs so public URLs don't break, preserves saved libraries and listening history so returning users don't lose state.
- **Fresh start:** seed canonical catalogue data from scratch. Simpler, but returning users re-create their libraries.

The choice depends on how large and engaged the legacy user base actually is. Decision goes in its own sub-spec before Phase 3 starts.

### 3.2 SEO parity

- Redirect map: any legacy URL shape that differs from the rebuild gets a 301 to the new equivalent.
- Sitemap: parity with legacy coverage (`sitemap.ts` already exists — audit for completeness).
- Meta / OG tags on every public page match or exceed the legacy equivalent.

### 3.3 Public beta cutover

- Deploy rebuild to `beta.nawhas.com`, leave legacy `nawhas.com` live.
- Parallel run for 1–2 weeks; watch Sentry, Lighthouse, real-user metrics.
- When confidence is high, swap DNS. Keep `legacy.nawhas.com` reachable for one release cycle as a safety net.

## Phase 4 — Community / Contributor Push

Can partly overlap with Phase 3 once beta is live and stable.

### 4.1 Onboarding polish

Rewrite `CONTRIBUTING.md` as "your first PR in 30 minutes." Single setup command. Explicit dev-loop walkthrough. Clear pointer to `ARCHITECTURE.md` (already good). Explicit "where do I add a new ___?" recipes for the common changes.

### 4.2 Good-first-issue grooming

~20 well-scoped tickets across small features, visual polish, docs, tests, accessibility. Each labelled `good-first-issue` with acceptance criteria and file-path pointers.

### 4.3 Public roadmap + changelog

A GitHub Projects board with the phases above and their sub-tasks. Release Drafter (or equivalent) for auto-generated changelog.

### 4.4 Community channel + announcement

Discord or Matrix server, a launch post when `nawhas.com` cuts over, reach out to the existing user base.

## Dependencies & Sequencing

```
Phase 1 (single batch)
      ↓
Phase 2.1 → 2.2 → 2.3   (visual work)
                  ↓
            Phase 3   (launch prep)
                  ↓
            Phase 4   (can partly overlap with late 3)
```

## Risks

- ~~**Phase 1** as a single batch: Next 16's caching defaults are the single most likely source of debugging pain.~~ **Resolved:** landed cleanly; the caching-default change had no effect because every app route was already `force-dynamic`. The actual pain came from a different source — see the `tsbuildinfo` lesson under Phase 1 outcomes.
- **Phase 2.3** can drift in scope if the token system from 2.1 is weak. Mitigation: tokens reviewed and committed *before* any page redesign starts.
- **Phase 3.1 data migration** is high-risk if done late. Mitigation: decide path early in Phase 2 so migration code can be written and tested in parallel with the visual work.

## Open Questions

1. Does the legacy production database need to be imported, or is a fresh start acceptable? (blocks Phase 3.1 detailed spec)
2. Do any legacy URL shapes differ from the rebuild's, and if so which? (needed for Phase 3.2 redirect map)
3. Is there an existing Discord/community channel, or does one need to be created? (Phase 4.4)

## What this document is *not*

This roadmap names phases and sub-projects; it does not specify implementation details. Each sub-project (Phase 1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1–4.4) gets its own design spec and implementation plan before coding starts.
