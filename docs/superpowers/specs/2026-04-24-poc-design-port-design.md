# Phase 2.5 — POC Design Port (Design)

**Status:** Design draft 2026-04-24 · Awaiting user review
**Author:** Asif (brainstormed with Claude)
**Scope:** Re-skin every currently-implemented surface of the rebuild to match the visual direction and behaviour established in the [`nawhas/new-design-poc`](https://github.com/nawhas/new-design-poc) prototype. Establishes the design system that all subsequent roadmap items inherit.

## Context

A separate prototype repository, `nawhas/new-design-poc`, was built from a set of 12 design mockups into a fully functional Next.js 16 prototype. It runs on the same stack as the rebuild (Next 16 / React 19 / Tailwind 4 / TypeScript) but with no backend — static JSON data, no auth, no persistence. The repo author has chosen this prototype as the visual direction for the rebuild.

This is a forward-looking aesthetic decision the user has independently made and prefers. It supersedes the brand-hue / typography decisions resolved in the 2026-04-22 design audit (which were anchored on legacy production aesthetic). Both decisions are coherent in their own time — the audit captured "what legacy looks like today"; this spec captures "what the rebuild should look like going forward."

The POC covers 12 routes (home, library, reciters, reciter/[slug], albums, album/[slug], track/[slug], changes, dashboard, submit, moderation, contributor/[slug]). The rebuild has all 12 of those plus more (auth, search, library/history, profile, settings, mod/queue|audit|users, contribute/edit/*) backed by tRPC + Drizzle + Better-Auth + Typesense + S3.

## Goals

1. **Adopt the POC design system as the rebuild's canonical aesthetic.** Tokens, fonts, components, and theme behaviour all switch to the POC's choices.
2. **Re-skin every existing surface.** All routes currently in the rebuild — including the ones with no POC reference — adopt the new design language.
3. **Establish the contract for downstream work.** Phase 2.4 W2, W3, Phase 3, and Phase 4 must build against this design system from the start; no further "Vuetify-red Phase 2.2" references.

## Non-Goals

- **No new product surfaces in this roadmap.** The POC's net-new pages (public contributor profile + heatmap, public day-grouped changes feed, contributor dashboard with stats) are deferred to the appropriate future phase: `/changes` → Phase 2.4 W2; `/contributor/[slug]` + heatmap + `/dashboard` → Phase 2.4 W3.
- **No backend or data-layer changes.** tRPC procedures, Drizzle schema, Better-Auth, Typesense, S3 wiring all stay intact. Re-skin is visual + component layer only.
- **No replacement of the POC's stub `/submit` and `/moderation` pages.** The rebuild already ships real, working W1 versions of those flows. The POC's stubs are visual references — the existing functional forms get restyled, not replaced.
- **No port of `DemoSwitcher`.** POC-only navigation aid; does not ship to production.
- **No port of POC's `PlayerContext`.** It's a UI scaffold, not a real audio engine — the rebuild already has a working player provider tied to HTMLAudioElement, queue, and seek behaviour. Visual layer of the player gets restyled; logic stays.
- **No lyrics highlight + scroll-sync.** Stays parked per the 2.1 audit's resolved decision.
- **No restoration of legacy-only patterns** that the 2.1 audit explicitly excluded (per-album `node-vibrant` hero theming, hand-rolled upward-cast box-shadow on PlayerBar, off-grid 14px margin on card titles, etc.).
- **No PWA support.**

## Approach

**Approach A — tokens → components → pages.** Single feature branch (`phase-2.5-poc-reskin`), batched merge to `main`, mirroring the Phase 1 stack-upgrade shape that already worked in this repo.

The dependency order is real: changing tokens after pages have been re-skinned would force every page revisit. Doing pages first risks tokens churning under them. The 2.2 → 2.3 sequence already validated this order in this codebase.

The alternative considered — page-by-page vertical slices each shipping their own sliver of tokens + components — was rejected because tokens would get refactored multiple times as edge cases surfaced, hurting cross-page consistency. The "parallel `apps/web-poc` cohabitation" approach was also rejected: the POC has no backend, so wiring it up in parallel doubles integration cost rather than reducing risk.

## Scope (in / out)

**In scope (this roadmap):**

- Replace design tokens (palette, typography, surfaces, theme) with the POC's.
- Port POC components into `packages/ui` and `apps/web/src/components`, replacing or augmenting current primitives.
- Re-skin every currently-implemented route, on the existing data layer.
- POC behaviour that fits existing surfaces: dark default with localStorage persistence, language toggle on track lyrics, waveform visualization on the track page, `/library/tracks` filter-bar treatment.

**Out of scope (folded into future phases):**

| Surface | Future home |
|---|---|
| Public `/contributor/[slug]` + contribution heatmap | Phase 2.4 W3 |
| Public day-grouped `/changes` feed | Phase 2.4 W2 |
| Contributor `/dashboard` with stats | Phase 2.4 W3 |

## Foundation (tokens, fonts, theme)

### Palette

Replace the Vuetify-red token system shipped in Phase 2.2 with the POC's CSS-variable system in `apps/web/app/globals.css`:

| Token | POC value | Replaces |
|---|---|---|
| `--accent` | `#c9302c` (both modes) | `colors.red.base #F44336` (Vuetify red, 2.2) |
| `--accent-soft` | `#e8524e` | hover/secondary red |
| `--accent-glow` | `rgba(201,48,44,.08)` light / `.15` dark | n/a |
| `--bg` / `--surface` / `--surface-2` / `--card-bg` | dark: `#0a0a0b` / `#141416` / `#1a1a1d` / `#141416`; light: `#ffffff` / `#fafafa` / `#f4f4f5` / `#ffffff` | shadcn neutral scale |
| `--text` / `--text-dim` / `--text-faint` | dark: `#f5f5f7` / `#a1a1a6` / `#6b6b70`; light: `#0a0a0b` / `#5a5a62` / `#8e8e98` | shadcn `foreground` / `muted-foreground` |
| `--border` / `--border-strong` | dark: `rgba(255,255,255,.1)` / `.18`; light: `#e6e6e8` / `#d4d4d8` | shadcn `border` |
| `--header-bg` | dark: `rgba(10,10,11,.7)`; light: `rgba(255,255,255,.8)` (translucent) | opaque header |
| `--success` / `--warning` / `--info` / `--danger` | `#10b981` / `#f59e0b` / `#3b82f6` / `#ef4444` | Vuetify semantic defaults |

The 2.1 audit's resolved decision ("restore legacy red `#F44336`") is explicitly superseded.

To preserve compatibility with the 2.3 component layer (which uses Tailwind's full red ramp for hover / focus / disabled / error halos), build a `red-50..950` ramp anchored on `#c9302c` (e.g. via Radix Colors generator) and expose it under both POC variable names AND existing Tailwind token names. POC's literal `--accent` / `--accent-soft` semantics ride on top.

### Typography

Replace 2.2's `Bellefair` + `Roboto Slab` + `Roboto Mono` with the POC's:

- **Sans (body, UI):** `Inter` (300/400/500/600/700/800)
- **Serif (display, branding):** `Fraunces` (300/400/500/600, optical-size 9..144)
- **Nastaliq (Urdu lyrics):** `Noto Nastaliq Urdu`, lazy-loaded only on routes that render Urdu

Loaded via `next/font/google` in `apps/web/app/layout.tsx` with `subset: ['latin']` and `display: 'swap'` (not POC's `@import url(...)` — keep the rebuild's existing self-host pattern for CLS + privacy). Token names: `--font-sans`, `--font-serif`, `--font-nastaliq`. Body font-size shifts to POC's `15px / line-height 1.6 / letter-spacing -0.01em`. No mono font.

Adopt POC's choice for Arabic + Urdu (Nastaliq for Urdu, system serif for Arabic). The 2.1 audit's "deferred: visual verify" item for Arabic font fallback is resolved by adopting the POC's choice; revisit only if visual verification surfaces issues post-port.

### Theme

Replace current theme provider with POC's pattern:

- `data-theme="dark" | "light"` attribute on `<html>` (currently `class="dark"`)
- **Default = dark** (currently system preference)
- localStorage key `theme` for persistence
- Inline blocking script in `<head>` to prevent flash (POC's `ThemeProvider` does this; rebuild already has equivalent logic, gets rewritten to match POC's contract)

### Radius / shadows / motion

POC uses Tailwind defaults for radius, minimal shadow vocabulary, and `transition: background 0.25s, color 0.25s` on body. Adopt POC defaults; revisit per-component during the components phase.

## Components

The POC ships 13 components. Each one maps to one of three actions in the rebuild:

| POC component | Action | Notes |
|---|---|---|
| `Header.tsx` (9.1 KB) | **Replace** | Current `apps/web/src/components/layout/Header*` swapped. Wire to existing `useSession()` from Better-Auth, existing nav, existing search bar, existing locale switcher. |
| `Footer.tsx` (2.9 KB) | **Replace** | Same pattern. |
| `ThemeProvider.tsx` + `ThemeToggle.tsx` | **Replace** | Replaces existing `apps/web/src/components/theme/*`. Same provider-in-root-layout, toggle-in-header contract. |
| `CoverArt.tsx` | **Augment** | Accepts `{ artworkUrl?, variant? }`; falls back to POC's gradient set keyed off the entity slug when `artworkUrl` is null. |
| `ReciterAvatar.tsx` | **Augment** | Same pattern: `{ avatarUrl?, name }`, falls back to POC's gradient initial avatar. |
| `Waveform.tsx` | **New (no current equivalent)** | Deterministic-bar version ships first; real audio peak data is post-launch. |
| `TrackRow.tsx` | **Replace** | Current `apps/web/src/components/{tracks,albums,library}/TrackRow*` swapped — POC's row is the canonical track row across the app. |
| `MiniPlayer.tsx` + `PlayButton.tsx` + `PlayerContext.tsx` | **Augment, do not replace logic** | Keep the rebuild's player provider + audio engine (HTMLAudioElement, queue, seek, mod-only state); replace only the visual layer (PlayerBar template + controls + waveform integration). POC's `PlayerContext` discarded. |
| `Heatmap.tsx` | **Skip (this roadmap)** | Used only on contributor profile + dashboard, both deferred to W3. Port lands with W3. |
| `DemoSwitcher.tsx` | **Skip (forever)** | POC-only nav aid; does not ship to prod. |

### Where components live

- Cross-app primitives (`Header`, `Footer`, `ThemeProvider`, `ThemeToggle`, `CoverArt`, `ReciterAvatar`, `TrackRow`, `Waveform`, `PlayButton`) → `packages/ui/src/components/` so the existing `@nawhas/ui` import contract holds.
- App-bound composites (re-skinned `PlayerBar`, page-level layouts) → `apps/web/src/components/`.
- Existing shadcn primitives in `packages/ui` (`button`, `card`, `dialog`, `input`, `select`, `tabs`, `tooltip`, `dropdown-menu`, `sheet`, `badge`, `section-title`) **stay**. They get restyled implicitly through the new CSS-variable layer; no rewrite. This is the single biggest divergence from the POC: POC says "no UI framework — pure Tailwind + inline styles," but the rebuild's shadcn primitives carry a11y wins (focus traps, keyboard nav, aria-* wiring) shipped in 2.3 that we are not throwing away.

### i18n

Every new component string goes through `next-intl` (`useTranslations`) with keys under `poc.<component>.*` in `apps/web/messages/en.json`. POC's hardcoded English strings are not ported verbatim.

### Component tests

Each ported component gets a render + a11y test in `packages/ui/src/__tests__/` mirroring the existing pattern. Target: +13 tests (one per ported component, including the augmented ones).

### Visual vocabulary for extrapolated routes

At the end of the components phase, before pages start, document a short visual vocabulary for routes the POC didn't cover (`(auth)/*`, `/profile`, `/settings`, `/library/history`, `/search`, `/mod/queue|audit|users`, `/contribute/edit/*`):

> Card on `--surface`, accent CTA, `Fraunces` heading, `--text-dim` for secondary, dark-mode treatment matches `--bg` (`#0a0a0b`).

One page under `docs/design/`. Every extrapolated route uses it; per-PR debates settle there.

## Pages

Re-skinned route-by-route in dependency order. Each row is one PR-sized commit on the feature branch. "POC ref" = POC route the visuals come from; "—" = no POC equivalent, extrapolate from the visual vocabulary doc.

| # | Route | POC ref | Key deltas to current |
|---|---|---|---|
| 1 | `/` (home) | `/` | Add hero section. Trending / Saved / Quotes / Top Reciters strips replace current. Existing tRPC fetches kept; auth gates kept. |
| 2 | `/reciters` | `/reciters` | A–Z anchor nav becomes the primary affordance; pagination drops below the fold. |
| 3 | `/reciter/[slug]` | `/reciter/[slug]` | Profile header swapped (gradient avatar + bio + verified badge); albums grid restyled. **Restores album pagination** (2.1 audit flagged its absence as a regression vs legacy). |
| 4 | `/albums` | `/albums` | Albums browse grid with filters. Current Typesense-backed filtering kept; visual treatment replaced. |
| 5 | `/album/[slug]` | `/album/[slug]` | Album hero (no `node-vibrant` per-album theming — out of scope). Track list uses new `TrackRow`. |
| 6 | `/track/[slug]` | `/track/[slug]` | Lyrics panel + waveform (new) + related tracks. Language toggle UX from POC replaces or coexists with current tabs (settle during the PR). Lyrics highlight + scroll-sync stays parked. |
| 7 | `/library/tracks` (+ `/library` redirect) | `/library` | POC's `/library` is a search+filter view; rebuild's `/library/tracks` is a saved-tracks list. Reconcile: keep rebuild's IA (saved-tracks, auth-gated) but adopt POC's filter-bar visual treatment. POC's "search across catalogue" intent is served by `/search` (#8). |
| 8 | `/search` | — | Typesense-backed search restyled with POC tokens; results list uses new `TrackRow` / `ReciterAvatar` / `CoverArt`. Filter bar borrowed from POC's `/library` treatment. |
| 9 | `(auth)/*` (login, register, forgot-password, reset-password, verify-email, check-email) | — | Centered card on POC surface, accent CTA. Existing AuthReason copy port (resolved in 2.1 audit) kept. |
| 10 | `/contribute` (landing) + `/contribute/{reciter,album,track}` + `/contribute/edit/*` | POC `/submit` (visuals only) | Functional W1 forms (ParentPicker, ImageUpload, AudioUpload, SlugPreview, LyricsTabs) restyled with POC tokens. Backend untouched. |
| 11 | `/mod`, `/mod/queue`, `/mod/submissions/[id]`, `/mod/audit`, `/mod/users` | POC `/moderation` (visuals only) | Mod queue and submission detail restyled. W2 (not started) inherits the new visual baseline. |
| 12 | `(protected)/profile`, `(protected)/settings`, `(protected)/library/history` | — | Tabbed account surface restyled with POC tokens. The "stats dashboard" version of `/profile` is a W3 deliverable. |
| 13 | Error / not-found / loading boundaries | — | `error.tsx`, `not-found.tsx`, every `loading.tsx`. Restyled to match POC tone (large display-serif heading, accent CTA). |

### Branch strategy

The whole effort lands on a long-running feature branch `phase-2.5-poc-reskin`. Each row above is one commit (or a tight PR-sized chunk) on that branch. Single merge to `main` at the end, mirroring Phase 1's batched-upgrade shape.

### Per-row exit criteria

- Page renders end-to-end with real tRPC data (no stubs).
- Light + dark mode both clean.
- Mobile viewport (375px) and desktop (1280px) both clean.
- Keyboard navigation works: Tab order sound, focus rings visible, no traps, Esc closes modals.
- Existing e2e specs targeting that route updated and passing in the same commit.
- Translation keys for that page added (no hardcoded English).

## What gets thrown away from Phase 2.2 / 2.3

This roadmap explicitly reverses or supersedes parts of work that shipped 2026-04-22 / 2026-04-23. Calling it out so the reversal is intentional and traceable.

### Reversed

| From | To | Source |
|---|---|---|
| Brand hue: Vuetify red `#F44336` + grey `#616161` + orange-accent `#FF6D00` + wordmark `#DA0000` | POC red `#c9302c` + accent-soft `#e8524e` + accent-glow rgba | 2.1 audit decision (`docs/design/README.md`), implemented in 2.2 |
| Display serif: Bellefair (per legacy `HeroQuote.vue`) + slab: Roboto Slab + mono: Roboto Mono | Sans: Inter, serif: Fraunces, Nastaliq: Noto Nastaliq Urdu. No mono font. | 2.1 audit decision, implemented in 2.2 |
| Theme default = system preference, attribute = `class="dark"` on `<html>` | Theme default = dark, attribute = `data-theme="dark"\|"light"` on `<html>` | 2.2 theme provider |
| PlayerBar shadow direction: upward-cast box-shadow matching legacy intent | POC's no-shadow translucent treatment | 2.1 audit "PlayerBar regressions" pre-2.2 side-quest |
| Header: opaque | Translucent `--header-bg` with backdrop blur | 2.2 layout |

### Demoted (kept but de-emphasized)

- The `docs/design/` audit (`README.md`, `tokens.md`, `layouts.md`, `audit-complete/*.md`) stays as a historical record of the legacy → rebuild gap analysis, but its "Decisions resolved 2026-04-22" section is **superseded** by this roadmap. A short banner at the top of `docs/design/README.md` notes this and links to this spec.
- The 2.2 design-system-foundation spec (`docs/superpowers/specs/2026-04-22-phase-2-2-design-system-foundation.md`) and 2.3 page-redesign spec stay as historical record. Same banner pattern.

### Kept verbatim (do not throw away)

- All 2.3 a11y wins: Radix Dialog focus-traps, aria-required wiring, aria-describedby error linkage, role="status" on async state, table captions. New POC-tokened components inherit these.
- All 2.3 i18n keys (~115 added in W1, more in 2.3 itself). New POC component strings get *added* to the same `en.json`; nothing existing is removed.
- The shadcn primitive set in `packages/ui` (`button`, `card`, `dialog`, etc.). The 2.1e audit's primitives-replacement work + 2.3's 21 dialog adoptions ride along — they re-style implicitly via the new CSS variables.
- 2.4 W1 contribute forms (ParentPicker, ImageUpload, AudioUpload, SlugPreview, LyricsTabs, useDraftAutosave, useUnsavedChangesGuard). All retained; only their visual chrome restyles.
- The `require-dynamic-for-headers-cookies` ESLint rule, all Sentry config, all next-intl wiring, all middleware/proxy setup. Out of scope.

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Long feature branch drifts from `main`. Wide diff touches design tokens + nearly every page. While the branch is open, anyone landing 2.4 W2/W3 work on `main` creates merge conflicts. | High | Medium | Pause W2/W3 work for the duration. If anything urgent must land on `main` mid-flight, rebase the branch immediately. Keep branch life under 4 weeks; if it stretches further, ship in waves to `main` instead of one merge. |
| R2 | Audio playback regression. New `Waveform` component will want to interact with real audio. Combined with the just-removed MinIO host port, audio in dev is broken. | Medium | Medium | Restore MinIO `:9000` port as a dev exception before row 6 (track-page re-skin) starts, OR ship a Next.js audio proxy as part of row 6 (substantive scope). Default to "put MinIO `:9000` back." |
| R3 | POC palette has only one accent shade pair (`#c9302c` + `#e8524e`). 2.3 components rely on Tailwind's full red ramp for hover / focus / disabled / error halos. | High | Low | Build `red-50..950` ramp anchored on `#c9302c` during the tokens phase; expose under both POC and Tailwind names. |
| R4 | Theme-default flip (system-pref → dark). Returning users land on dark mode regardless of OS preference. | Medium | Low | POC's choice with localStorage persistence: first-visit = dark, second-visit = whatever they set. If complaints surface, flip default in a single token-layer commit later. |
| R5 | a11y regression. POC is "no UI framework — pure Tailwind + inline styles." If a porter cargo-cults POC's stance and rewrites a button as `<div onClick>`, contrast/focus regressions slip in. | Medium | High | Mandate "shadcn primitives stay; only visual layer swaps." POC templates are visual references, not literal source. PR-checklist item: "no new `<button>` outside primitives." |
| R6 | Visual mismatch on extrapolated routes. Reviewers will disagree on what "POC-style" means for `(auth)/*` etc. | Medium | Medium | One-page visual vocabulary doc at end of components phase; every extrapolated route uses it. |
| R7 | Lighthouse regression. New fonts (3 families: 6 Inter weights + 4 Fraunces weights + 1 Nastaliq) inflate font payload. Translucent header backdrop-blur is a known LCP/CLS hazard. | Medium | Medium | `next/font/google` with `subset: ['latin']` + `display: 'swap'`; Nastaliq lazy-loaded only on Urdu routes. Run Lighthouse against branch after components phase, before pages start. 2.1 audit perf budget (LCP ≤ 2500ms, CLS ≤ 0.1) holds; if violated, treat as branch blocker. |
| R8 | Brand decision reversal undermines roadmap credibility. The 2.1 audit's "Decisions resolved 2026-04-22" included reasoning ("brand hue from legacy red is not a rebrand"). Reversing it 2 days later in a new spec without acknowledgement looks like ad-hoc whim. | Low | Low | Banner on `docs/design/README.md` + the supersession subsection of this spec explain: prior decision was anchored on legacy production aesthetic; POC now establishes a *forward* aesthetic the user has independently designed and prefers. Both decisions coherent in their own time. |
| R9 | POC doesn't show real-data states (loading, empty, error, no-results, no-audio, partial-lyrics, signed-out, mod-only banners). | High | Low | Catalogue missing states during components phase; build minimal token-aligned versions (skeleton on `--surface`, empty-state with `--text-dim` + accent CTA, error with `--danger`). Roll into the visual vocabulary doc. |
| R10 | Developer environment friction from the recent port removal. Audio + Mailpit lose host-side affordances right at the start of a wide design-system port. | Medium | Low | Already documented in `docs/dev-setup.md` troubleshooting. Restoring MinIO `:9000` (audio) and Mailpit `:8025` (auth flow testing) is a one-line revert if friction shows up. |

## Verification

### Pre-merge gates (must pass before the feature branch lands on `main`)

- `./dev qa` green (typecheck + lint + ~474 unit tests; should grow as new component tests land in `packages/ui`).
- `./dev test` green — currently 618 pass / 5 skipped. Target: +13 (one per ported component).
- `./dev test:e2e --ci` (Playwright against prodlike `web`) — every existing spec still passes. Re-skin will break selectors that target visible text or class names; update specs as part of the corresponding page row.
- Lighthouse CI (`.lighthouserc.json`) thresholds held: perf ≥ 0.8, a11y ≥ 0.95, FCP ≤ 2000ms, LCP ≤ 2500ms, CLS ≤ 0.1. Run Lighthouse against the branch *after* the components phase (before pages start) — canary for font payload + backdrop-blur regression (R7).
- Manual smoke through every route in light AND dark mode: home, /reciters, /reciter/[slug], /albums, /album/[slug], /track/[slug], /library/tracks, /search, all `(auth)/*`, /contribute landing + reciter + album + track + edit, /mod + queue + submission detail + audit + users, /profile, /settings, /library/history. Both themes; both signed-in and signed-out where applicable. Empty / loading / error states checked deliberately.
- Translation coverage: `en.json` parses; new POC component keys all populated; no `Missing translation:` warnings during smoke.
- Visual diff sanity: side-by-side screenshot of each ported route vs. the POC's equivalent (where one exists). Recognisably the same design language; not pixel-perfect.

### Post-merge verification

- Staging deploy auto-runs (existing CI gate). Smoke staging same as the manual smoke list above.
- Sentry watch for 24h: no spike in client errors, no spike in `useTheme` / `next/font` / hydration warnings.
- Lighthouse run against staging.

### Rollback plan

The whole effort lands as one merge to `main`. If something is structurally broken post-merge (Sentry surprise, real-user perf cliff), the rollback is a single `git revert -m 1 <merge-commit>`. The branch stays alive for fix-forward. No partial state, no per-page rollback complexity.

## Sequencing

### Inside this roadmap

```
Phase 2.5 — POC re-skin (single feature branch: phase-2.5-poc-reskin)
│
├─ A. Foundation (1 commit)
│    ↓ Tokens + globals.css + theme provider + fonts + Tailwind theme
│
├─ B. Components (3–4 commits, one per family)
│    ↓ Header + Footer + ThemeProvider/Toggle (chrome)
│    ↓ CoverArt + ReciterAvatar + TrackRow (entity primitives)
│    ↓ Waveform + restyled PlayerBar (audio surfaces)
│    ↓ Component tests + visual vocabulary doc for extrapolated routes
│
├─ C. Pages (13 commits, one per route in section above)
│    ↓ home → reciters → reciter/[slug] → albums → album/[slug]
│    ↓ → track/[slug] → library/tracks → search → (auth)/*
│    ↓ → contribute/* → mod/* → (protected)/profile|settings|library/history
│    ↓ → error / not-found / loading boundaries
│
└─ D. Pre-merge gates (verification above) + single merge to main
```

Foundation must complete before components (component CSS depends on token names). Components must complete before pages (every page restyle uses them). Within pages, "shared chrome first" — home is the canary because it consumes the most components in one place.

### Relationship to wider rebuild roadmap

```
[shipped] Phase 1 ──→ Phase 2.1 ──→ 2.2 ──→ 2.3 ──→ 2.4 W1
                                                       │
                                                       ↓
                                            ╔══════════════════════╗
                                            ║   Phase 2.5 POC      ║   ← this roadmap
                                            ║   re-skin            ║
                                            ║   (paused: W2/W3)    ║
                                            ╚══════════════════════╝
                                                       │
                                                       ↓
                            Phase 2.4 W2 (moderation flow polish)
                            + folds in: public day-grouped /changes feed
                                                       │
                                                       ↓
                            Phase 2.4 W3 (contributor lifecycle)
                            + folds in: public contributor profile,
                              contribution heatmap, dashboard with stats
                                                       │
                                                       ↓
                            Phase 3 (data migration · SEO · cutover)
                                                       │
                                                       ↓
                            Phase 4 (community / contributor push)
```

### Contract for downstream roadmap items

Phase 2.4 W2, W3, Phase 3, and Phase 4 specs (when written) must:

1. Build against the POC design system (tokens, fonts, components from this roadmap), not the legacy-red 2.2 system.
2. Inherit the POC's three deferred surfaces in the right home — public `/changes` feed in W2; public `/contributor/[slug]` + heatmap + `/dashboard` in W3.
3. Treat any divergence from the POC's visual vocabulary as an explicit decision needing its own design subsection.

### Roadmap document edits (land in same commit as this spec)

- `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md` gets a new "Phase 2.5 — POC re-skin" subsection with status pointer to this spec, inserted between Phase 2.4 W1 (shipped) and Phase 2.4 W2 (not started).
- Phase 2.4 W2's existing description gets one line appended: "scope extends to include the public day-grouped `/changes` feed surfaced by Phase 2.5."
- Phase 2.4 W3's existing description gets one line appended: "scope extends to include the public `/contributor/[slug]` profile, contribution heatmap, and `/dashboard` stats surfaced by Phase 2.5."
- `docs/design/README.md` gets a banner at the top noting the brand-hue / typography decisions resolved 2026-04-22 are superseded by this spec.

## What this document is *not*

This is a top-level design for the POC re-skin. It does not enumerate every commit — that belongs in the implementation plan, which gets written next via the writing-plans skill. The plan will:

- Decompose foundation / components / pages phases into ordered, sized work items.
- Specify file-level changes per item (token names, file paths, test files).
- Set explicit acceptance per item (renders, theme parity, e2e green).
- Surface per-item dependencies (e.g. PlayerBar restyle blocks track page).
