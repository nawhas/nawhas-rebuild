# Nawhas Rebuild — Roadmap (April 2026)

**Status:** Phase 1 shipped (2026-04-21) · Phase 2.1 shipped · 2.1 decisions resolved · Phase 2.1d shipped · Phase 2.2 shipped · Phase 2.1e shipped · Phase 2.3 shipped (2026-04-22) · Phase 2.4 W1 shipped (2026-04-23) · Phase 2.5 shipped (2026-04-25) · Phase 2.4 W2 shipped (2026-04-25) · Phase 2.4 W3 shipped (2026-04-25) · Phase 2.1c + Phase 3 not started
**Author:** Asif (brainstormed with Claude)
**Created:** 2026-04-21
**Last updated:** 2026-04-25

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

The README's "Verify before porting" section enumerated the full list of product/design decisions that had to resolve before 2.2 could start. All resolved 2026-04-22 — see the `## Decisions (resolved 2026-04-22)` section of `docs/design/README.md`. Summary:

- Brand hue: restore legacy red/grey, both light and dark modes.
- PWA: skip entirely (rebuild is not a PWA and there is no near-term plan to become one).
- Display fonts: port both Bellefair and Roboto Slab (plus Roboto Mono for lyrics timestamps).
- Lyrics highlight + scroll-sync: parked for dedicated research — see Phase 2.1c below.
- Library IA: ship the simpler one-route model (keep `/library/tracks` + `/history`; do not restore legacy's anon landing or `/library/home` dashboard).
- Search entry points: keep both (header `SearchBar` for jump intent, `/search` page for browse intent).
- Contextual `AuthReason` copy: port via a `?reason=save|like|library|contribute` query param.
- PlayerBar regressions: fix as a pre-2.2 side-quest — see Phase 2.1d below.

### Deferred to a follow-up visual verification pass (2.1b)

~12 items that a code-first audit can't settle without eyeballs: Vuetify elevation `rgba` stacks, dark-mode surface colours, lyrics scroll-sync interaction timings, elevation-lift animations on hover, and a handful of layout edge cases. Full list in `docs/design/README.md § Deferred: visual verification agenda`. Not a blocker for 2.2 — tokens can land against the code-audit findings and 2.1b can reconcile later.

### Lessons worth carrying forward

- **Code-first audits via `gh api` are tractable at this legacy's scale.** Roughly 3 hours of execution time, no local clone, full provenance citations throughout. Worth repeating for future legacy-system audits rather than cloning + `grep`ping locally — the citation trail is more durable than a shell history.
- **Discovery tasks should go first and stay uncommitted.** The liveness sweep + source-of-truth ladder in `.audit-notes.md` prevented every downstream task from re-discovering the same facts; committing it would have duplicated content in the final README without adding signal.
- **Soft line caps on audit entries are aspirational.** The 30-line cap on per-page entries was exceeded for every entry (actual: 40–71 lines); trimming would have lost load-bearing structural deltas. Plan for ~50-line audit-entry reality on the next pass.

### 2.1c Lyrics highlight + scroll-sync research (parked)

**Status:** not started · blocks a launch-parity decision on the Track page.

The legacy Track page has two features the rebuild does not: (a) the active lyrics line is highlighted in real time as the audio plays, driven by a `LyricsHighlighter` class bound to Vuex timing state, and (b) the active line auto-scrolls into view inside `<lyrics-overlay>` on the morphing AudioPlayer. Rebuild's `<LyricsDisplay>` has neither.

Before committing to port these (which is nontrivial) or drop them (which materially changes the Track page UX), we need a code-first investigation of the rebuild:

1. Does the rebuild's lyrics schema carry per-line timestamps today? (Check `packages/db/` migrations + `apps/web/src/server/routers/tracks.ts` / lyrics router.)
2. If yes — is the data actually populated for the seeded catalogue, or only the schema?
3. If no — what would it take to add timestamp persistence, and does the legacy data export carry them?
4. Is there any existing scroll-sync or highlight scaffolding we overlooked in `<LyricsDisplay>` / `<MobilePlayerOverlay>`?

Output: a short research note (`docs/superpowers/specs/YYYY-MM-DD-lyrics-sync-research.md`) with the findings and a go / no-go recommendation for launch parity. The decision feeds into Phase 2.3's Track-page redesign spec.

### 2.1d PlayerBar regressions ✅ shipped 2026-04-22

Two regressions Phase 2.1 surfaced, shipped as a single commit on branch `fix/player-bar-regressions` (`0bcb7fe`):

- **Body reservation.** Introduced `<PlayerBarSpacer />` client component at `apps/web/src/components/player/PlayerBarSpacer.tsx` — reads `selectCurrentTrack` from the player store and renders an 80px (`h-20`) aria-hidden spacer inside `<main>` when a track is active. Matches legacy's `.app--player-showing .main-container { padding-bottom: 80px }` at `nawhas/nawhas:nuxt/assets/app.scss#L27-31`.
- **Shadow direction.** Replaced `shadow-lg` with `shadow-[0_-2px_8px_4px_rgba(0,0,0,0.16)]` (+ `dark:shadow-[0_-2px_8px_4px_rgba(0,0,0,0.40)]`) on the `PlayerBar` outer div, mirroring legacy's hand-rolled upward cast at `nawhas/nawhas:nuxt/components/audio-player/AudioPlayer.vue#L862`. Regression guard added in `PlayerBar.test.tsx` prevents a revert to `shadow-lg`.

Verification: 444 existing Vitest tests still pass; two new tests (`PlayerBarSpacer.test.tsx`) cover the spacer; one regression guard added to `PlayerBar.test.tsx`. Typecheck clean, lint clean (pre-existing warnings only).

### 2.2 Design-system foundation in `packages/ui` ✅ shipped 2026-04-22

Shipped as 17 commits on `main` in strict dependency order — tokens first (the visible day-one flip), then primitives, then mechanical replacements, then closeout (this update).

**Tokens** (`7cfa284`, `eada1c4`):
- `apps/web/app/globals.css` — legacy-derived palette ramps (red/zinc/orange + full semantic ramps for error/info/success/warning), radius scale (2/4/6/8/9999), shadow scale (including `--shadow-player-up` from 2.1d), motion (150/280/400ms + Material-standard easing). Shadcn semantic token layer (`--color-primary`, `--color-card`, `--color-muted`, `--color-border`, `--color-ring`, etc.) with class-based `.dark` overrides makes the entire app dark-mode-complete.
- `apps/web/app/layout.tsx` — Bellefair + Roboto Slab + Roboto Mono loaded via `next/font/google`; `<Toaster />` mounted at root (sonner). `lucide-react` installed for primitive icons.
- `packages/ui/components.json` — shadcn base color flipped from `slate` to `zinc`.

**Primitives** (`14a3ddf` through `a5b33d5` — 11 commits):
- Ten shadcn-generated (`Button`, `Card`, `Dialog`, `Tabs`, `DropdownMenu`, `Tooltip`, `Sheet`, `Input`, `Select`, `Badge`) — Radix-backed where applicable.
- One hand-authored (`SectionTitle`) — formalizes legacy's `.section__title` pattern (Vuetify h5 map + 1.4rem + 12px margin-bottom) surfaced by the 2.1 audit.
- Each primitive ships with Vitest render tests (3–5 per primitive). Package-total: 40 tests across 12 files, all green.
- Toast plumbing via `sonner` (Task 2); no separate primitive file.

**Replacements** (`61a8121`, `d0283c4`, `b0f69d2`, `eb4ed96` — 4 commits):
- `<Button>`: 12 files, swapped inline `<button>` with className drift (`rounded` / `rounded-md` / `rounded-lg` mix) for the primitive across SaveButton, LikeButton, auth forms, contribute forms, library CTAs, empty-state, mod apply-button.
- `<Card>`: 5 files swapped (reciter/album Links intentionally NOT wrapped — their `rounded-lg` is focus-ring only, not a card shell).
- `<Input>`: 4 auth form files + 1 shared `form-field.tsx` wrapper (which propagates transitively to ~31 consumer call sites across the contribute flow).
- `<DropdownMenu>`: user-menu rewritten (119 → 81 LOC) — Radix now handles click-outside, keyboard nav, focus trap, portal mounting.

**Shadcn CLI × Tailwind 4 × React 19 compatibility notes** (captured during Task 3 probe):
- `components.json` schema required three fixes (typo `rsx` → `rsc`; `style: "default"` → `"new-york"`; added `iconLibrary: "lucide"`).
- Every `shadcn add` writes to the wrong path (`packages/ui/@nawhas/ui/components/ui/*.tsx`) and must be `mv`'d to `packages/ui/src/components/*.tsx`.
- Every generated file's `cn` import must be rewritten from `@nawhas/ui/lib/utils` to `../lib/utils.js` (NodeNext requires the `.js` extension on relative imports).
- Occasional `exactOptionalPropertyTypes` conflicts when shadcn forwards optional controlled-state props (e.g. `checked={checked}`) — fixed with conditional spread `{...(x !== undefined ? { x } : {})}`.

**Verification:** `./dev typecheck` + `./dev lint` green throughout. `pnpm --filter @nawhas/web test` maintained 444 passed / 135 skipped across all 17 commits. `./dev test` and `./dev test:e2e` were not run due to a local port conflict with another project's containers (bcewhub-app holding Postgres:5432 + Typesense:8108) — the user should run `./dev qa` + `./dev test:e2e` in a clean environment as the final sanity gate.

**Deferred for follow-ups:**
- Dev-server manual smoke of the 10 live routes with the new palette + fonts — the user's call on when to do this.
- E2E suite run in a clean docker environment.
- Additional `<Button>` replacements surfaced during Task 14 (resubmit-form, change-password-form, change-email-form, delete-account-section, contribution-list, check-email-card, social-buttons) — these were deliberately left scoped out of Task 14 to keep the commit focused; opportunistic sweep in 2.3.
- Full visual-regression snapshot suite — folds into 2.1b or a future pass.
- Hand-authored SVG icons in `apps/web/src/components/layout/mobile-nav.tsx` etc. — swap to `lucide-react` opportunistically during 2.3.
- Page-specific compositions (`Hero`, `LyricsPanel`, `TrackList`, `ReciterHero`) — owned by Phase 2.3.

Refs: `docs/superpowers/specs/2026-04-22-phase-2-2-design-system-foundation.md`, `docs/superpowers/plans/2026-04-22-phase-2-2-design-system-foundation.md`.

### 2.1e Complete frontend audit ✅ shipped 2026-04-22

Shipped as 11 subagent audit passes (`/tmp/audit-scratch-2-1e/0X-*.md`, uncommitted) merged into 8 committed files on `main` under `docs/design/audit-complete/`. 127 production `.tsx`/`.ts` files audited across seven axes; the bulk of the frontend is unchanged after Phase 2.2's primitive-swap commits landed on ~30-40 surfaces, which this audit now inventories file-by-file.

Eight deliverables committed direct to `main`:

| File | Organised by | Purpose |
|---|---|---|
| [`docs/design/audit-complete/tokens.md`](../../design/audit-complete/tokens.md) | Subtree | Per-file color / radius / shadow / spacing inventory. Summary + top-10 offenders. |
| [`docs/design/audit-complete/dark-mode.md`](../../design/audit-complete/dark-mode.md) | Status bucket | Good / Mixed / Broken / N/A flat list + priority fix list for high-traffic routes. |
| [`docs/design/audit-complete/responsive.md`](../../design/audit-complete/responsive.md) | Subtree | Breakpoint coverage + concerns (missing `sm:`, magic heights, overflow risks). |
| [`docs/design/audit-complete/primitives-replacement.md`](../../design/audit-complete/primitives-replacement.md) | Target primitive | High/lower-confidence candidates per primitive + files already consuming. |
| [`docs/design/audit-complete/accessibility.md`](../../design/audit-complete/accessibility.md) | Severity | Critical / Important / Nice-to-have findings as one flat list per severity. |
| [`docs/design/audit-complete/legacy-gap.md`](../../design/audit-complete/legacy-gap.md) | Page | Missing / Divergent / Rebuild-only split per page against `docs/design/layouts.md`. |
| [`docs/design/audit-complete/dead-code.md`](../../design/audit-complete/dead-code.md) | Finding type | TODOs / unused exports / orphan state / duplication hot spots / suspect heuristics. |
| [`docs/design/audit-complete/README.md`](../../design/audit-complete/README.md) | — | Cross-links the seven axis docs + methodology recap + top findings per axis. |

**Top findings surfaced for Phase 2.3:**

- **Tokens:** zero semantic-token call sites across the app (all `bg-background`/`text-foreground`/etc. indirection lives inside primitives). Top-10 offenders cluster around Player, Search, and the `/mod/*` route.
- **Dark-mode:** ~20 Broken files on high-traffic routes — full Track page surface (track-header, lyrics-display, track-actions, and the three player-button variants), all three Search components, `library-tracks-list`, most of the auth subtree, and every settings form.
- **A11y:** 4 Critical findings — MobilePlayerOverlay has no focus trap despite `aria-modal="true"`; DeleteAccount modal has no focus trap / Escape / focus return; `play-all-button.tsx` has no `aria-label` and hard-coded English; `search-results-content.tsx` uses tab semantics without `tabpanel`.
- **Legacy parity:** the `?reason=save|like|library|contribute` port decided 2026-04-22 is **not yet implemented** anywhere. Track page is missing 5 hero / right-rail / control surfaces; Reciter profile is missing discography pagination and the "Top Nawhas" strip.
- **Dead code / duplication:** `AlbumListCard` in `album-grid.tsx` duplicates `cards/album-card.tsx` with all dark-mode variants missing (~60 lines; consolidation fixes the regression at the same time). `AuthStatusCard` extraction collapses ~40 lines of `reset-password/page.tsx` + `verify-email/page.tsx`. 15+ files still hard-code English strings that the rest of the codebase routes through `useTranslations`.

**Methodology:** subagent-per-subtree (11 dispatches), standardised checklist, static review only (no runtime / screenshots). Scratch files left on disk at `/tmp/audit-scratch-2-1e/` for re-runs. Controller merged partial findings into the seven per-axis master docs + README.

Refs: `docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md` (spec + implementation plan).

### 2.3 Page-by-page redesign ✅ shipped 2026-04-22

Shipped as 26 commits on `main` in descending-traffic order
(Home → Reciter → Album → Track → Library+History → Search →
Auth → Contribute+Mod). Per-page workstream ran the 5 steps
(tokens → dark-mode → primitives → legacy-gap port → a11y)
consuming Phase 2.1e audit output as the backlog.

**Home** (4 commits): `55a0093` token+dark sweep → `148ee5c`
<Card> + <SectionTitle> adoption → `f072d46` legacy hero
restored (red-gradient + Bellefair 2.5rem slogan + hero-variant
SearchBar), new Top Nawhas ordered-list, Saved strip gated on
useSession. New tRPC procedures home.getTopTracks /
home.getRecentSaved + TrackListItemDTO. Zero additional a11y
findings — Tasks 1-3's implementations were already clean.

**Reciter** (2 commits): `3f24b81` sweep → `583f44c` Roboto
Slab hero title + load-more album pagination via new
<LoadMoreAlbums> client component + <SectionTitle> adoption.
Dead placeholder buttons confirmed never ported (port gap, not
regression). Zero additional a11y findings.

**Album** (4 commits): `6d53314` sweep → `28045d0` Roboto Slab
+ primitives (play-all-button onto <Button>) → `9c6699e`
precomputed vibrant-color hero backgrounds (new
albums.vibrant_color column via migration 0009, one-shot
compute-vibrant-colors.ts script using node-vibrant v4,
AlbumDTO extended, render with text-contrast switch) → `488b1ad`
a11y (row clickable via stretched-link ::before overlay, dot
role="img").

**Track** (3 commits): `fefd0b2` sweep → `06ea24f` <Tabs>
adoption for MediaToggle + LyricsDisplay language switcher,
Rules-of-Hooks fix in lyrics-display (early null-return moved
after useState/useEffect), Roboto Slab hero title → `d54ee58`
a11y (lang attr on lyrics lines, en-Latn for Romanized).
Lyrics highlight+sync functionality deferred to Phase 2.1c per
scope call.

**Library + History** (2 commits): `426001a` combined sweep
(token+dark+SectionTitle + <Button variant="destructive"/"link">
on clear-history controls) → `c2fb1b3` a11y (removed duplicate
<main> landmarks — PageLayout already wraps).

**Search** (2 commits): `71a857f` <Tabs> adoption on 4-tab
results strip (fixes Critical role="tab" without tabpanel/
aria-controls audit finding) + token+dark sweep → `7cccf8a`
a11y (misleading track link aria-label corrected, listbox
section headers wrapped in role="group" with aria-labelledby).

**Auth** (4 commits): `6a4d922` sweep (error-red → destructive
tokens) → `160561b` <Card> + <Button> (7 card wraps + 5 button
swaps across 4 form files + 2 page branches, Apple brand-black
preserved) → `eaaf3ad` AuthReason query-param-driven
contextual copy via new buildLoginHref helper + wired to
SaveButton/LikeButton → `d0af993` a11y (aria-describedby/
aria-invalid linkage, role="status" on async state changes,
anchor-as-button → <Button asChild><Link/>>).

**Contribute + Mod + Settings** (4 commits): `10b5aed` sweep
(~205 class rewrites across 32 files; hot-spot record maps
in mod/badges + submit buttons in mod/review-actions
deliberately left for Task 24) → `15e1180` Badge/Button/Select/
Dialog primitives (21 adoptions; delete-account modal rewritten
with Radix Dialog — gains focus trap + Escape + inert
background) → `37a601e` i18n port of contribute + mod
hardcoded strings (~115 new translation keys) → `c70bea0`
a11y (form-field required-asterisk → aria-required via
cloneElement, aria-describedby error linkage, role="status"
on async state, table captions).

Verification: `./dev typecheck` + `./dev lint` green throughout;
`pnpm --filter @nawhas/web test` grew from 444 to 449+ tests
(new auth-reason + updated save/like tests); zero regressions.
Phase 2.1e audit's 523 Tailwind-default call sites reduced
substantially — most remaining ones live in intentional brand
colors (error-red, success-green halos, provider brand buttons
like Apple black, mod badge visual scanning).

Refs: `docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md`, `docs/superpowers/plans/2026-04-22-phase-2-3-page-redesign.md`.

## Phase 2.4 — Contributor & Moderator Overhaul

The M6 contribute + moderate loop shipped in Feb–Mar 2026 was architecturally
complete but experientially thin: reciter submissions accepted only `name` +
`slug`; album and track forms required contributors to paste raw UUIDs for
the parent entity; artwork and audio were URL-only (no upload despite S3
presigned infra already shipping for the avatar flow); lyrics could not be
submitted at all; moderators who approved a submission but didn't click
Apply in the same session effectively orphaned the record (it vanished
from `/mod/queue`); there was no "apply to contribute" flow, no draft save,
no withdrawal path, no revision thread, no internal moderator notes, no
audit filters, no new-submission notifications.

Three-workstream plan spec'd 2026-04-23 in
[`docs/superpowers/specs/2026-04-23-contributor-moderator-overhaul-design.md`](./2026-04-23-contributor-moderator-overhaul-design.md):

| # | Name | Status |
|---|---|---|
| W1 | Contribute forms (parent pickers, uploads, auto-slug, lyrics, drafts) | ✅ shipped 2026-04-23 |
| W2 | Moderation flow (merge approve+apply, internal notes, thread, filters) | not started |
| W3 | Contributor lifecycle (apply-for-access, withdraw, resubmit-diff, digests) | ✅ shipped 2026-04-25 |

### 2.4 W1 Contribute forms ✅ shipped 2026-04-23

Shipped as 30 commits on `main` (`65504aa..112b3bf`) in the plan's six
phases — schema first, server second, UI primitives third, forms fourth,
integration fifth, post-review fixes last.

**Schema** (migration `0010_unknown_zaran.sql`, 4 DDL commits +
1 migration commit):
- `reciters` +5 columns: `arabic_name`, `country`, `birth_year`, `description`, `avatar_url` (all nullable)
- `albums` +1 column: `description`
- `submissions` +1 column (`moderator_notes`) + status enum extended with `withdrawn` and later `applied`
- New `access_requests` table (user_id, reason, status, reviewed_by, review_comment + partial unique index for one-pending-per-user) — landed now, consumed by W3

**Types + Zod** (`3ed9b1d`, `21d6edc`):
- `@nawhas/types` submission DTOs widened for all new optional fields + lyrics map
- `reciterDataSchema` / `albumDataSchema` / `trackDataSchema` accept rich fields with proper validation (birthYear 1800–current, description caps, lyrics keyed by `'ar' | 'ur' | 'en' | 'transliteration'`)

**Server + apply step** (`53d8fd9`, `a2edc0b`, `b0e4abe`, `4fb418f`,
`874932a`, `ebf96f8`, `b401791`, `8f6af26`):
- Extracted `slugify` + new `findFreeSlug` collision helper into `apps/web/src/server/lib/slug.ts`
- `moderation.applyApproved` now writes rich reciter/album fields, upserts per-language lyrics rows on tracks, and uses per-entity collision-safe slug pickers (reciter global, album per-reciter, track per-album)
- New `contribute` tRPC router with `searchReciters` + `searchAlbums` (contributor-gated typeahead backing the parent pickers)
- Two new upload endpoints: `POST /api/uploads/image` (5 MB, jpeg/png/webp, S3 BUCKET_IMAGES) and `POST /api/uploads/audio` (50 MB, mpeg/mp4/wav/ogg, S3 BUCKET_AUDIO, duration auto-probed via `music-metadata`). Both role-gated to contributor+moderator, mirror the existing avatar-upload pattern.

**UI primitives** (`de7a991`, `c59ba31`, `1a2b9ea`, `3b24f4d`, `a8c2c01`,
`77e3c9f`, `125d344`):
- `ImageUpload`, `AudioUpload`, `ParentPicker` (typeahead combobox with keyboard nav + grouped-by-reciter album results), `SlugPreview` (live read-only URL preview), `LyricsTabs` (4-language tabbed editor with RTL + char counters)
- `useDraftAutosave` hook (localStorage, 7-day TTL, debounced), `useUnsavedChangesGuard` hook (beforeunload), `COUNTRY_OPTIONS` ISO list

**Forms** (`5cc6f7a`, `69faed6`, `9e4e0d0`):
- ReciterForm / AlbumForm / TrackForm fully rewritten. No slug field anywhere — auto-generated server-side with live preview. Parent pickers replace raw UUID paste. Upload widgets replace URL-only inputs. Lyrics tabs inside the track form. Draft restore banner on mount, unsaved-changes guard on dirty. Edit pages updated to fetch rich fields (and lyrics via the existing `TrackWithRelationsDTO`) and pass them as `initialValues`.

**Integration** (`1370cfe`, `3dc0299`, `072aa8e`):
- `apps/web/messages/en.json` extended with ~115 new i18n keys under `contribute.*` (country labels, upload copy, lyrics placeholders, draft restore prompt, slug preview template)
- `/mod/submissions/[id]` field-diff extended to show all new reciter/album fields + per-language lyrics rows
- E2E `apps/e2e/tests/contributor-submissions.spec.ts` updated for the new forms; new `describe` blocks for album (ParentPicker + happy-path) and track (album combobox + Arabic lyrics tab submission)

**Post-review fixes** (`5780ba9`, `112b3bf`):
- `applyApproved` now flips submission status to `'applied'` inside the same transaction as the canonical writes + audit log, preventing double-apply races under concurrent moderator clicks or post-refresh
- `audio/mpeg` uploads now store with the `.mp3` extension via an explicit MIME→extension map (previously `.mpeg`, which broke playback on some CDNs)

**Verification:** `./dev qa` green (typecheck + lint + 474 unit tests).
Direct vitest run against the test DB overlay: 618 tests pass, 5 pre-existing
Typesense-gated skips, 0 failures.

**Deferred follow-ups** (not regressions, tracked in commit messages):
- Manual browser smoke of the three form flows + moderator apply — pending user verification
- Raw UUIDs for `reciterId` / `albumId` still render in the mod diff — fold into W2's moderation-flow polish
- Pre-existing e2e package fixture type error (same pattern in 4 other spec files; not in the turbo typecheck pipeline)
- `pg_trgm` index on `reciters.name` / `albums.title` for the typeahead search — fine at current scale
- `moderator_notes` column landed but the edit UI is W2 scope
- `access_requests` table landed but W3 wires the endpoints and UI

Refs:
[`docs/superpowers/specs/2026-04-23-contributor-moderator-overhaul-design.md`](./2026-04-23-contributor-moderator-overhaul-design.md),
[`docs/superpowers/plans/2026-04-23-w1-contribute-forms-plan.md`](../plans/2026-04-23-w1-contribute-forms-plan.md).

### 2.4 W2 Moderation flow ✅ shipped 2026-04-25

Shipped as 27 commits on `main` (`db9a661..68d0428`).

**Server (heart of W2 — `b644585`):** `moderation.review(action='approved')`
now writes the canonical entity inline in the same transaction as the
review row + status update + audit log. Status motion `pending →
applied` (skips `approved`). On any DB error inside the tx (slug
collision, FK violation, etc.) the whole thing rolls back; submission
stays `pending`. The canonical-write logic was extracted to a private
`applyToCanonical(tx, submission)` helper shared by both `review` and
the now-downgraded `applyApproved` (kept as ops escape hatch only —
removed from the UI in `19c7d11`). The original spec's "Awaiting apply"
queue tab was dropped because the merge makes it structurally
unreachable.

One staging-only data wipe shipped as
`apps/web/scripts/reset-approved-submissions.ts` (`fcc1594`) — flips
any legacy `'approved'` rows back to `'pending'` so they go through
the new merged flow.

**New tRPC procedures:**

| Commit | Procedure | Purpose |
|---|---|---|
| `253cd3c` | `moderation.setModeratorNotes` | Persists internal-only `moderator_notes`; audits `submission.notes_updated` with `meta.length` (note text deliberately not mirrored into audit) |
| `8896670` | `moderation.getReviewThread` | Submitter + chronological reviews + applied bookend, joined for reviewer name + role |
| `b200ebb` | `submission.getMyReviewThread` | Owner-scoped variant; reviewer names redacted to `''`, role to `null` |
| `ec101a9` | `moderation.searchUsers` | Typeahead for the audit-log actor filter |
| `3ae28f4` | `moderation.auditLog` extension | `actor` / `action` / `targetType` / `from` / `to` filter params, all AND-composed; date range inclusive on both ends |
| `b9079bc` | `moderation.dashboardStats` | Pending count, last-7-days count, 7-bucket sparkline array, oldest-pending hours |
| `407ada8`, `3ead332` | `home.recentChanges` | Public feed source — `submission.applied` audit rows joined to canonical entity for slug + title + avatar; cursor pagination correct under post-filter row drops |

**Schema:** zero column additions (`moderator_notes` and the `applied`
/ `withdrawn` enum values shipped in W1). One new index `audit_log_
action_created_at_idx` on `(action, created_at desc)` (`db9a661`)
supports the `/changes` feed query and the `/mod/audit` action filter.
Two DTO additions in `@nawhas/types`: `ReviewThreadDTO` /
`ReviewThreadEntryDTO` and `RecentChangeDTO`; plus a `moderatorNotes:
string | null` field on `SubmissionDTO`.

**UI:**

- `<ModeratorNotes />` (`368291e`) — debounced (600ms) textarea above
  review actions on `/mod/submissions/[id]`. Saves via a new
  `setSubmissionModeratorNotes` server action. Visible only while the
  submission is reviewable; never surfaced to the contributor.
- `<ReviewThread />` (`462f58c`) — shared component used by both the
  moderator detail page and the new contributor detail page (Task 16).
  Renders bookends (submitted-by, applied-on) plus chronological review
  rows with action badges, comments, and timestamps. The
  `variant="contributor"` path skips reviewer-name rendering.
- `<AuditFilters />` + `<AuditRow />` (`919ccc9`) — filter strip with
  actor / action / target-type / date-range fields driving URL query
  params; per-row chevron toggle expands the `meta` jsonb as a
  key-value sub-row.
- `<DashboardStats />` (`e352045`) — three stat cards on `/mod`
  replacing the single-card grid; the 7-bar sparkline is plain CSS divs
  (no chart lib) with a screen-reader-only mirror table.
- New `/profile/contributions/[id]` route (`ba0c8a8`) — per-submission
  contributor view with reviewer-redacted thread; listing rows now link
  through. Same task extracted `<SubmissionFields>` and
  `fetchCurrentValues` into shared helpers used by both detail pages.
- New public `/changes` route (`737dd0a`) — day-grouped feed with
  "Today" / "Yesterday" labels and a sticky day heading per section.
  50-item initial fetch; "Load more" pagination deferred for now.
- "Recent changes" link added to the public header nav (`ba12332`).

**Tests:** 13 new unit tests across `moderation.test.ts`,
`submission.test.ts`, and `home.test.ts` covering each new procedure +
the merged-tx happy-path / FK-rollback / lyrics-upsert + the
contributor-redaction behavior. 4 new component tests covering
`<ModeratorNotes>` (debounce), `<ReviewThread>` (variant + bookends),
`<AuditFilters>` (URL roundtrip + reset), `<DashboardStats>` (3
cards + 7 bars + empty states). 3 new E2E specs in
`apps/e2e/tests/moderation-w2.spec.ts` covering single-click
approve-and-applies, audit filter URL + visible rows, and the public
`/changes` feed surfacing the just-approved entity. The pre-existing
two-step E2E tests in `moderation-flows.spec.ts` were marked `.skip`
in `2c4b7d4` (`Approve and apply` describe block) since they assert
the legacy two-button UI; they will be retired or rewritten in a
follow-up.

**Bugs caught in review (all fixed before commit):**

| # | Caught by | Title | Resolution |
|---|---|---|---|
| 1 | spec reviewer (Task 3) | `submission_reviews` rollback on FK violation was untested | Added assertion in `fbc9415` |
| 2 | spec reviewer (Task 3) | Merged-approve test seeded a reciter that wasn't tracked for `afterAll` cleanup | Track in `seededReciterIds` (`86d1053`) |
| 3 | code-reviewer (Task 11) | `recentChanges` cursor advancement and `hasMore` heuristic both wrong under post-filter row drops (could produce duplicates AND spurious empty pages) | Track `processedCount` explicitly; cursor advances past dropped rows (`3ead332`) |
| 4 | controller pre-merge (Task 16) | Privacy strip swapped — `notes` (submitter-facing) was being nulled on contributor responses while `moderatorNotes` (the actually-internal field) was leaking | Swap field name in all five strip sites (`875cafc`) |
| 5 | searchUsers tests (Task 8 + Task 9) | Test queries didn't actually match seeded data; tests would have skipped at validation | Use `String(SUFFIX)` for substring scope, `'bobs-'` for the email-match (`101c4f5`, `51a4e21`) |

**Verification:** `./dev qa` green throughout (typecheck + lint + 627
unit tests). DB-backed integration tests pass when invoked directly
inside the test container (turbo cache occasionally replays "skipped"
when the test DB stack flips between dev and test overlays). E2E
specs typecheck clean; not run end-to-end in this session because the
web container went unhealthy mid-execution — the user should run
`./dev test:e2e` in a clean environment as the final sanity gate.

**Deferred follow-ups:**

- E2E `moderation-flows.spec.ts` rewrite — the `.skip`-marked Apply-
  button blocks need either deletion (replaced by `moderation-w2.spec.ts`)
  or rewriting against the new merged flow.
- Submitter avatar in `/changes` rows — folds into W3 (no per-user
  avatar slot in the DB today).
- "Regenerate slug" moderator-only button — listed as open in the W2
  spec but not shipped here; can fold into W3 polish.
- `<img>` lint-warning in `change-row.tsx` — pre-existing pattern in
  the codebase, not a blocker.
- Manual browser smoke of all five new surfaces — pending user
  verification.

Refs:
[`docs/superpowers/specs/2026-04-25-phase-2-4-w2-moderation-flow-design.md`](./2026-04-25-phase-2-4-w2-moderation-flow-design.md),
[`docs/superpowers/plans/2026-04-25-phase-2-4-w2-moderation-flow.md`](../plans/2026-04-25-phase-2-4-w2-moderation-flow.md).

### 2.4 W3 Contributor lifecycle ✅ shipped 2026-04-25

Shipped as 37 commits on `main` (`b22f3ff..9b410a1`), executed across
nine phases (A–I).

**Schema (Phase A — 4 commits, migration `0013_many_red_wolf.sql`):**
`users` gained `username` (citext, unique partial-index on
`lower(username)`), `trust_level` (`'new' | 'regular' | 'trusted' |
'maintainer'` enum, default `'new'`), and `bio` (text, nullable —
surfaced on the public profile). `access_requests` gained
`withdrawn_at`, `reviewed_at`, `notified_at`; the status enum widened
to admit `'withdrawn'`. `submissions` gained `notified_at` to mark
rows folded into a moderator digest. Two partial indexes back the
hourly digest's "pending and unnotified" scan
(`access_requests_pending_unnotified_idx`,
`submissions_pending_unnotified_idx`).

**Server (Phase C — 9 commits):**

| Commit | Procedure | Purpose |
|---|---|---|
| `6d5517f` | `accessRequests.create` | Validates the applicant has no open request, inserts with status `'pending'`, audits `access_request.created` (note: renamed from `apply` in `b22f3ff` — `apply` is reserved by tRPC v11) |
| `335716f` | `accessRequests.withdrawMine` | Owner-scoped state flip `pending → withdrawn`, sets `withdrawn_at`, audits |
| `9abe651` | `accessRequests.getMine` + `.queue` | Self-fetch (returns null if none) and moderator queue (status filter, cursor pagination, joined applicant fields) |
| `304387e` | `accessRequests.review` | Approve / reject in one tx: status flip + role flip to `'contributor'` on approve + audit row + applicant email; rolls back atomically on any leg failing |
| `6f73a2f` | `submission.withdrawMine` | Owner-on-pending withdraw; mirrors the access-request shape |
| `d858209` | `submission.getResubmitContext` | Returns the prior `changes_requested` review row + diff payload feeding `<ChangesRequestedBanner>` on the contributor edit surface |
| `93526e1` | `moderation.dashboardStats` extension + `moderation.pendingCounts` | `dashboardStats` gains `pendingAccessRequestsCount`; the new `pendingCounts` returns submissions + access-requests counts in a single roundtrip for nav badges |
| `0138850` | `home.contributorProfile` + `home.contributorHeatmap` | Public, username-scoped profile + a 365-day bucket array of submission/applied counts |
| `9ac938e` | `dashboard.mine` (new router) + `submission.myHistory` status filter | Contributor dashboard stats + the listing tabs ("All / Pending / Changes / Applied / Withdrawn") |

**Email + cron (Phase D — 3 commits):** `sendModeratorDigest`,
`sendAccessRequestApproved`, `sendAccessRequestRejected` added to the
existing email helpers. `apps/web/scripts/send-moderator-digest.ts`
(`034ba67`) is a standalone Node entrypoint that queries the two
partial indexes, renders the digest, sends to all `moderator` /
`admin` users, and stamps `notified_at` on the rows it included
(at-least-once trade explicitly called out in comments — a digest can
double-send if the email succeeds and the stamp write fails). The
Helm template `deploy/helm/nawhas/templates/digest-cronjob.yaml`
(`db8f282`) wires it as a `CronJob` running at the top of every hour;
gated on a new `digest.enabled` value.

**Components (Phase E — 6 commits):**

- `<TrustLevelPill />` (`6fb7158`) — token-driven badge in
  `@nawhas/ui`, four variants (`new`, `regular`, `trusted`,
  `maintainer`).
- `<Heatmap />` (`1d895fc`) — 365-day calendar grid ported from the
  POC, single-year window, 5-bucket intensity scale, ARIA label per
  cell.
- `<ContributorHero />` (`7bef3dd`) — public profile header
  (avatar + username + trust pill + bio + join date + total counts).
- `<ContributionList />` (`7364e99`) — extracted from the dashboard
  routes; renders submission rows with status badges, used on both
  `/dashboard` and `/contributor/[username]`.
- `<PendingCountBadge />` (`0cf2bbe`) — small circle shipped on the
  main-nav `/mod` link and on each `/mod` sub-nav tab.
- `<ChangesRequestedBanner />` (`17f8846`) — placed on
  `/profile/contributions/[id]` (not the contribute edit page — see
  deviations below); shows the moderator comment + a diff toggle
  driven by `submission.getResubmitContext`.

**Routes (Phase F — 4 new routes, 4 commits):**

- `/contribute/apply` (`2080889`) — applicant form (reason field,
  optional supporting links) wired to `accessRequests.create`.
- `/mod/access-requests` + `/mod/access-requests/[id]` (`9e8c656`) —
  moderator queue with status filter + detail view with
  Approve / Reject / Comment actions.
- `/contributor/[username]` (`9a3c620`) — public, signed-out-friendly
  profile + heatmap + contribution list.
- `/dashboard` (`481ced3`) — contributor dashboard with stats cards
  + tabbed contribution list. The legacy `/profile/contributions`
  list route was removed in favor of a redirect (see G6); the
  per-submission detail route `/profile/contributions/[id]` is
  preserved as the contributor-side review surface.

**Restyled / extended (Phase G — 8 commits):**

- `/contribute` access-denied screen (`92bce9f`) is now an active CTA
  driven by `accessRequests.getMine`: applicant sees Apply button when
  no request exists, a pending panel with Withdraw when one is open,
  or a rejected panel with the moderator's comment.
- Main-nav `/mod` link (`ce3b76b`) and `/mod` sub-nav (`62e5e1d`)
  badge-decorated via `moderation.pendingCounts` — counts split into
  submissions + access-requests at the sub-nav level.
- `<ChangesRequestedBanner>` rendered on
  `/profile/contributions/[id]` for `changes_requested` rows
  (`e5691d6`).
- Owner Withdraw button on submission detail (`8ad5eb8`) — visible
  when the viewer owns the row and status is `pending`.
- `/profile/contributions` → `/dashboard` redirect (`d964efe`) keeps
  legacy bookmarks working.
- ~80 new i18n keys (`a111ff4`) covering the access-request flow,
  banners, badges, and dashboard chrome.
- Username required at signup (`fd4c42d`) with format validation
  and a 23505 unique-violation message; bundled dev/staging backfill
  script for existing users without a username.

**Tests:** 24 new server unit tests across `accessRequests.test.ts`
(new file), `dashboard.test.ts` (new file), `submission.test.ts`,
`moderation.test.ts`, `home.test.ts`. 18 new component tests across
the six new components. 6 new E2E specs in
`apps/e2e/tests/contributor-lifecycle.spec.ts` (`b5ea2c5`,
`c59a0f4`, `0099f39`, `93eecc0`, `05b6d31`, `9b410a1`) covering
apply→approve→contribute, access-request withdraw, submission
withdraw, the changes-requested banner round-trip, the public
profile + 404, and the moderator pending-count badge decrement.
The H-phase suite needed one infrastructure pass (`2c5139a`) to
unblock auth import, dev port, and DB helpers.

**Notable plan deviations:**

- `accessRequests.apply` was renamed to `.create` (`b22f3ff`) before
  the Phase C work landed: `apply` is reserved on tRPC v11
  procedure builders.
- The UI uses server actions throughout rather than tRPC client
  hooks, matching the rest of the app's contribute / mod surfaces.
- `<ChangesRequestedBanner>` lives on `/profile/contributions/[id]`
  (the contributor's own review surface) rather than the contribute
  edit page — the diff + moderator comment are read context for the
  resubmit decision, not edit-form chrome.
- The main-nav `/mod` link is gated to moderators-only and surfaces
  in the user-menu / mobile-nav rather than as a top-level desktop
  link, matching W2's nav shape; the badge decoration sits there.

**Verification:** `./dev qa` green (typecheck + lint + unit tests);
helm-template renders the CronJob with `digest.enabled=true`;
manual digest-script invocation against MailHog confirmed the email
body composes correctly. E2E specs are typecheck-clean and run on
CI; not exercised end-to-end locally for this closeout (W2 covered
the docker-runner sanity already).

**Deferred follow-ups:**

- **Trust-level auto-population.** Column `users.trust_level`
  shipped with default `'new'`; the criteria for promotion (e.g.
  `regular ≥ 10 applied submissions`, `trusted ≥ 50 + 95% approval`,
  `maintainer = manual`) and the scheduled recompute job are
  deferred for a future micro-feature.
- `/mod/users` surface for setting trust level manually — needed
  before the auto-population job lands so maintainers can be
  bootstrapped.
- Public contributor leaderboard at `/contributors` — surface
  exists in the POC but not wired here.
- Username self-service rename — currently set once at signup and
  immutable.
- Multi-year heatmap — single 365-day window today; year picker
  deferred.
- Digest unsubscribe link — moderators receive the digest while
  they hold the role; per-user opt-out deferred.

Refs:
[`docs/superpowers/specs/2026-04-25-phase-2-4-w3-contributor-lifecycle-design.md`](./2026-04-25-phase-2-4-w3-contributor-lifecycle-design.md),
[`docs/superpowers/plans/2026-04-25-phase-2-4-w3-contributor-lifecycle.md`](../plans/2026-04-25-phase-2-4-w3-contributor-lifecycle.md).

## Phase 2.5 — POC Design Port ✅ shipped 2026-04-25

A separate prototype repository, [`nawhas/new-design-poc`](https://github.com/nawhas/new-design-poc),
was built from a set of 12 design mockups into a fully functional Next.js 16 prototype on the same
stack as the rebuild. The roadmap owner has chosen the POC as the rebuild's forward visual
direction. Phase 2.5 ports the POC's tokens, fonts, components, and layouts onto the rebuild's
existing data layer, re-skinning every currently-implemented surface.

This is a forward-looking aesthetic decision that supersedes the brand-hue / typography
decisions resolved in the 2026-04-22 design audit (which were anchored on legacy production
aesthetic). Both decisions are coherent in their own time.

**Three POC-only surfaces** (public contributor profile + heatmap, public day-grouped changes
feed, contributor dashboard with stats) are deferred from this roadmap and folded into W2 / W3
where they thematically belong (see the W2 and W3 entries above).

**Branch strategy.** Single long-running feature branch (`phase-2.5-poc-reskin`), batched merge
to `main`, mirroring Phase 1's shape.

**What shipped (2026-04-21 → 2026-04-25 on `phase-2.5-poc-reskin`):**

- **Phase A (Tokens + Fonts + Theme).** Token cascade swap from legacy red `#F44336` to POC accent `#c9302c`; Inter + Fraunces + NotoNastaliqUrdu replace Bellefair + RobotoSlab + RobotoMono; dark theme becomes the default via `next-themes` (`data-theme` attribute).
- **Phase B (Components).** Footer, CoverArt, ReciterAvatar, TrackRow, Waveform, hashToIndex util ported from POC; PlayerBar restyled visual layer (player store untouched); `Input` primitive POC-tokenized; canonical `formatDuration` extracted to `@nawhas/ui/lib`; `AlbumCard` consolidated with `AlbumListCard`.
- **Phase C — Pages Wave 1 (public entities).** Home, reciters listing + A-Z nav, reciter profile, albums listing, album detail, track detail (+ Waveform).
- **Phase C — Pages Wave 2 (discovery + auth).** `/library/tracks`, `/search`, all 6 `(auth)/*` surfaces.
- **Phase C — Pages Wave 3 (contribute + mod + protected + boundaries).** All 19 remaining routes: `error.tsx` / `not-found.tsx` / 5 `loading.tsx`; `(protected)/{profile, history, settings}`; `/contribute` landing + 6 wizard routes + 11 shared form components; `/mod` dashboard + queue/audit/users + submission detail (333-line review workspace) + 9 mod components; final mop-up of 14 chrome primitives that escaped W1/W2 explicit File maps.
- **A11y + tokens hygiene.** WCAG 2.1 AA contrast fixed on `--text-faint` (light + dark) and `--color-primary-600` (dark). All interactive elements adopt `focus-visible:` (legacy `focus:ring-*` chains gone). `aria-busy` paired with `disabled` on async submits. `aria-current="page"` on active breadcrumbs / sub-navs. Hover-bg rule (cards in `--card-bg` containers hover to `--surface-2`, not `--surface`) codified in `docs/design/visual-vocabulary.md` after the dark-mode collision surfaced repeatedly across waves.
- **Test coverage.** 17 new unit-test files (~2k LOC) covering tracks/albums/reciters/home component sections. 489 → 618 passing test cases.
- **Cleanup.** `vibrantColor` field removed end-to-end (schema column dropped via migration `0011_large_martin_li.sql`, router selects + DTO type + 3 fixtures cleaned, `compute-vibrant-colors.ts` script + `node-vibrant` dep deleted). `placeholder-color.ts` dead util deleted. Visual vocab `--surface` vs `--card-bg` terminology reconciled with codebase reality.
- **Lighthouse canary.** Phase B end (2026-04-24): performance 0.98 / accessibility 0.97 / FCP 1600ms / LCP 1600ms / CLS 0.063 — all five thresholds cleared. Recorded in `docs/design/visual-vocabulary.md`.

Spec: [`2026-04-24-poc-design-port-design.md`](./2026-04-24-poc-design-port-design.md). Implementation
plans: `docs/superpowers/plans/2026-04-24-phase-2-5-foundation-and-components.md`,
`docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md`,
`docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave2-discovery-and-auth.md`,
`docs/superpowers/plans/2026-04-25-phase-2-5-pages-wave3-contribute-mod-protected-boundaries.md`.

## Phase 2.6 — POC Alignment (in progress)

A page-by-page comparison between [`new-design-poc`](https://github.com/nawhas/new-design-poc)
and the rebuild surfaced gaps that escaped the Phase 2.5 port. Tracked
inline in `docs/design/poc-alignment.md`. Decisions are batched per page
with status (⬜ → 🟨 → ✅) so the work can be split across sessions.

### 2.6 Header / Navbar ✅ shipped 2026-04-25

Gradient "N" mark + 22px white wordmark; restored Library nav link;
short labels matching POC ("Reciters" / "Albums" / "Changes");
role-gated red "+ Contribute" pill in header for `contributor` /
`moderator` (moves out of user-menu); user-menu redesigned to match
POC dropdown — gold/brown gradient avatar (with `user.image` fallback
for future profile-picture upload), name + @username + colour-coded
role badge header, hybrid item set with subtitles (My Dashboard /
Public profile / Account settings / Moderation queue / Sign out);
mobile menu mirrors the same dropdown style. Shared `RoleBadge`
extracted at `apps/web/src/components/layout/role-badge.tsx`.

### 2.6 Home page (in progress)

Hero rebuilt to POC spec — dark `var(--bg)` with two-layer red
radial-gradient + noise circles, Inter sans h1, white-pill `<SearchBar
variant="hero">` with a right-side circular dark submit button.
"Trending This Month" section restored visually, backed temporarily by
`home.getTopTracks` (the same newest-first proxy as `TopNawhasTable`).

#### Follow-up: real trending data

The current "Trending This Month" component is a B-implementation —
visual restoration only. It reuses the existing newest-first proxy, so
its first 5 entries duplicate the top of `TopNawhasTable`. The eventual
A-implementation:

- New tRPC procedure `home.getTrendingTracks({ window: '30d', limit })`
  that ranks tracks by play count over a rolling 30-day window.
- Backed by a `track_plays` event table (or an aggregation on
  `listening_history` if event-level granularity isn't needed).
- Wire into the existing `<TrendingTracks>` component — no UI change,
  just swap the prop source from `topTracks.slice(0, 5)` to
  `trendingTracks`.
- Same play-count source unblocks the "Most Popular Tracks" card
  subtitle (currently shows duration as a placeholder; POC shows a
  "{N} plays" count).

Blocked on having real play-count data in production. Sequencing: queue
this immediately after Phase 2.6's home-page section is done; can run
in parallel with Phase 3 launch prep since it doesn't touch
data-migration or SEO.

#### Follow-up: editable / rotating quote banner

`<QuoteBanner>` currently hardcodes a single quote string in JSX
(option-A restoration of the POC banner). Future work:

- Move the quote text + attribution into i18n (under
  `home.sections.quoteBanner.*`) so it can be edited / translated
  without code changes.
- Optionally extend to a small list of quotes the component picks from
  per-render (deterministic by date so it doesn't shift inside a single
  visit but rotates day-over-day).
- If the list grows beyond a handful, move to a content-managed source
  (a small `editorial_quotes` table or a JSON file in `public/`).

Low priority — purely an editorial / content lever. Pick up whenever
content stewardship lands.

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
Phase 2.1 → 2.2 → 2.3 → 2.4 W1 → W2 → W3   (visual + contribute/moderate polish)
                                ↓
                          Phase 3   (launch prep; can start in parallel with 2.4 W2/W3)
                                ↓
                          Phase 4   (can partly overlap with late 3)
```

Phase 2.4 W2 and W3 are not launch blockers — if Phase 3 data/SEO/cutover
work is ready before 2.4 finishes, 2.4 can continue in parallel or
defer until after cutover. W1 is shipped, so the contribute + moderate
loop is already usable for the public beta.

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
