# Design Audit — Legacy `nawhas.com` vs Rebuild

This directory is the output of **Phase 2.1** of the rebuild roadmap. Two companion docs compare legacy production `nawhas.com` against the current rebuild — row-by-row for tokens and page-by-page for layouts — with the goal of scoping Phase 2.2 (primitives) and Phase 2.3 (page redesigns) as concrete, traceable work.

## Contents

- **[tokens.md](./tokens.md)** — six comparative tables (Palette, Typography, Spacing, Border radius, Shadows / elevation, Motion) with legacy value, rebuild value, and suggested Action per row. Every legacy value carries a `nawhas/nawhas:<path>#Lx-y` provenance citation.
- **[layouts.md](./layouts.md)** — per-page skeletons (Home, Reciter, Album, Track, Library, Search, Auth, About, Contribute+Mod) plus the three shared-chrome surfaces (global header, global footer, persistent player bar). Each page pairs a legacy skeleton with the rebuild skeleton and a `Delta:` section.

## Methodology

Code-first static audit of `github.com/nawhas/nawhas@master` via `gh api` — no local clone, no running instance, **no screenshots this phase**. Every legacy value carries a `nawhas/nawhas:<path>#Lx-y` provenance citation. Values that could not be extracted code-first are marked `deferred: visual verify` — see the agenda below.

**Source-priority ladder** when legacy is internally inconsistent: Vuetify theme config > global SCSS > component-scoped SCSS > inline styles. The audit explicitly excludes features listed as non-goals in the parent roadmap (stories, draft-lyrics diff viewer, print-lyrics, unreleased moderator tooling).

## Summary of findings

### From the token audit

- **Hue flip:** rebuild's green-primary / amber-secondary is not derived from legacy's Vuetify red/grey — this is a rebuild-era rebrand that needs a product decision.
- **No PWA manifest in the rebuild** — legacy ships `theme_color #da0000` and `background_color #ff7252`; rebuild has neither.
- **Display-font usage is thin in legacy:** Bellefair is used in exactly one place (`HeroQuote.vue`); Roboto Slab dominates 7 hero surfaces; Roboto Mono is lyrics-timestamp-only.
- **Radius has drifted larger in the rebuild** via shadcn/Tailwind defaults — cards `8px` vs legacy `4px`; inputs/buttons `6px` vs legacy `4px`.
- **PlayerBar has two regressions:** no body `pb-20` reservation, and `shadow-lg` casts downward vs legacy's (hand-rolled) upward-casting shadow.
- **Legacy has three competing motion vocabularies** (280ms Material, 0.2s bespoke, Vuetify `slide-x-transition`) — consolidation decision belongs to 2.2.
- **Happy accident:** Tailwind's `ease-in-out` is byte-identical to legacy's Material-standard easing, so rebuild's motion curve is already aligned even where no one chose it explicitly.

### From the layout audit

- **Home has no hero in the rebuild.** Legacy opens with a full red-gradient hero + inline `<GlobalSearch hero>` pill; rebuild jumps straight into content strips.
- **Reciter profile has no album pagination in the rebuild** — legacy paginates the album grid.
- **Per-album hero theming is gone.** Legacy runs `node-vibrant` against the album artwork to derive a `DarkMuted` background + text colour per album/track hero; rebuild has no equivalent pattern.
- **Track-page lyrics are fully static in the rebuild.** Legacy's `LyricsHighlighter` reads the Vuex player state to highlight the active timestamp group (and auto-scrolls it in the overlay variant); rebuild's `<LyricsDisplay/>` has no highlight and no scroll-sync.
- **Language switching (AR / UR / EN / romanized tabs) is rebuild-only.** Legacy tracks carry a single lyrics document.
- **Library IA collapsed.** Legacy has 3 routes (`/library`, `/library/home`, `/library/tracks`); rebuild has 1 (`/library/tracks`) plus the rebuild-only `/history`.
- **Search promoted from dialog to page.** Legacy: Algolia dialog component only (no route). Rebuild: first-class `/search` route backed by Typesense, *plus* the header `SearchBar` still exists.
- **Auth promoted from 1 dialog to 6 routes** under the `(auth)` group. Lost in translation: the `AuthReason` enum's per-trigger contextual copy ("to save a track, sign in" etc.) — rebuild uses generic headings.
- **Contribute + Mod are rebuild-only surfaces.** Legacy had only inline moderator-edit dialogs on public pages (`EditReciterDialog`, `EditAlbumDialog`); the rebuild splits these into a public `/contribute/*` writer flow and a role-gated `/mod/*` section.

## What we deliberately did not carry over

Pages and patterns from the legacy codebase that are **not** in scope for the rebuild, with reason:

- **Stories** (`/stories/:date/:story` + the "Latest Stories" home strip) — out of scope per roadmap non-goals.
- **Print lyrics** (`/print/:reciterId/:albumId/:trackId`, including the `window.beforeprint` popup hook on the Track page) — out of scope.
- **Legacy moderator routes** (`/moderator/revisions`, `/moderator/drafts/lyrics`, `/moderator/stories/*`) — role-gated; rebuild replaces with `/mod/*` (different shape) and `/contribute/*` (new contributor flow).
- **Inline moderator edit dialogs on public pages** (`EditReciterDialog` / `EditAlbumDialog` on ReciterProfilePage; `EditTrackDialog` / `EditDraftLyrics` on Track page) — rebuild splits these out to `/contribute/edit/*`.
- **Auth dialogs** (login / register as Vuetify dialog components) — rebuild promotes to 6 routes under the `(auth)` route group.
- **Hand-rolled hacks** that the rebuild must not port literally:
  - Upward-casting hand-rolled `box-shadow: 0 -2px 8px 4px rgba(0,0,0,0.16)` at `nawhas/nawhas:nuxt/components/audio-player/AudioPlayer.vue#L862` — port the *intent* via a token, not the literal.
  - Off-grid `14px` margin on `.card__title .icon` at `nawhas/nawhas:nuxt/assets/tracks/_cards.scss#L8` — rebuild should normalise to 16px.
  - Inline hero typography `Roboto 200 / 64px / 75px / -1.5px` at `HomePage.vue#L265-271` — belongs in tokens if kept.

## Decisions (resolved 2026-04-22)

These are the product / design decisions the audit surfaced, now resolved by the roadmap owner. Phase 2.2 planning should treat them as fixed inputs.

- **Brand hue — restore legacy red/grey.** Not a rebrand; the rebuild's green/amber was a shadcn-starter default. Both light and dark modes derive from legacy's palette (`colors.red.base` `#F44336` primary, `colors.grey.darken2` `#616161` secondary, `colors.orange.accent3` `#FF6D00` accent, `#DA0000` wordmark). 2.2 builds new `--color-*` ramps anchored on these hues for both modes.
- **PWA — skip entirely.** The rebuild is not a PWA and there is no near-term plan to become one. Drop the `theme_color` / `background_color` rows from the 2.2 work list. If PWA support is added later it becomes its own sub-project.
- **Display fonts — port both Bellefair and Roboto Slab.** Match legacy. Load via `next/font/google` in `apps/web/app/layout.tsx`; add `--font-display-serif` (Bellefair) and `--font-slab` (Roboto Slab) tokens. Roboto Mono also ports for lyrics timestamps.
- **Lyrics highlight + scroll-sync — parked for dedicated research.** Rebuild's current lyrics implementation (schema, data flow, timestamp persistence) needs a code-first investigation before we can decide whether highlight + scroll-sync is a launch-blocker or post-launch work. Tracked as an explicit roadmap sub-project — see [`2026-04-21-rebuild-roadmap.md`](../superpowers/specs/2026-04-21-rebuild-roadmap.md) Phase 2.x-research.
- **Library IA — ship the simpler one-route model.** Keep rebuild's `/library/tracks` + `/history`; do not restore the legacy anon landing or `/library/home` dashboard. Fold the "Recently Saved" strip into the top of `/library/tracks` if there is real UX value at list-load.
- **Search entry points — keep both.** Header `SearchBar` for jump-to-result intent (autocomplete, ≤5 hits); `/search` page for browse intent (paginated, filterable). Same dual pattern as Spotify / YouTube; legacy conflated them into one dialog.
- **Contextual AuthReason copy — port.** Add a `?reason=save|like|library|contribute` query param on redirects to `/login`, map to copy variants in the auth page shell. Small effort; real UX win on conversion.
- **PlayerBar regressions — fix as a pre-2.2 side-quest.** Two code-fixable bugs: (a) conditional `pb-20` on `<main>` when `selectCurrentTrack !== null`; (b) replace `shadow-lg` with an upward-casting custom box-shadow matching legacy's intent. Ship separately from Phase 2.2 proper.

## Deferred: visual verification agenda

Every row / section across the two companion docs marked `deferred: visual verify` (or `deferred: product decision`) is listed below, with a pointer to where it lives. This is the concrete work list for Phase 2.1b (the follow-up visual verification pass): capturing production screenshots, inspecting computed styles, and filling in the rows that code-first extraction could not resolve.

### From tokens.md

- **Vuetify 2 semantic-colour defaults** — actual rendered hex values for `error` / `info` / `success` / `warning` in production (legacy sets none of these; upstream Vuetify defaults apply). → `tokens.md § Palette, rows "error / info / success / warning"`.
- **Vuetify 2 `$material-light` + `$material-dark` surface / background / text / border tokens** — all rendered from upstream SCSS maps; no local override. → `tokens.md § Palette, rows "Surface (light)", "Surface (dark)", "Text primary", "Borders / dividers"` plus the Dark-mode note.
- **Arabic + Urdu fallback rendering in legacy** — legacy loads no Arabic/Urdu font family, so production renders in OS default serif; needs per-platform visual check (Safari / Chrome / Android). → `tokens.md § Typography, font-family Arabic & Urdu rows`.
- **Vuetify 2 elevation scale (`elevation-0..24`)** — 25 Material Design rgba stacks; pixel values not extractable code-first. → `tokens.md § Shadows / elevation, "elevation scale" + the card / dialog / menu rows that each defer to the upstream stack`.
- **Legacy page transition timing** — `slide-x-transition` ships with Vuetify; exact ms/curve not extractable without inspecting Vuetify source. → `tokens.md § Motion, "page transition" row`.
- **Legacy hover / interactive transition timings** — inferred from Vuetify component defaults (button hover, card hover, ripple). → `tokens.md § Motion, "hover / interactive" row`.

### From layouts.md

- **Track-page lyrics: timestamp data schema.** Does rebuild's lyrics schema even carry timestamps? Needed before deciding whether highlight-sync is implementable. → `layouts.md § Track, Delta: "Audio-lyrics coupling diverges"`.
- **Track-page legacy multi-language.** Legacy stores a single lyrics document per track and has no language tabs; production may have per-track language variants we have not seen. → `layouts.md § Track, Legacy interactions note`.
- **Library anon landing.** Whether to re-introduce legacy's `/library` marketing gate for anon users (rebuild currently redirects to `/login?callbackUrl=/library/tracks`). → `layouts.md § Library, Delta: "Anon landing gone"` (deferred: product decision).
- **Hero search on Home.** Whether a hero-variant search pill belongs on the rebuild home (legacy had one; rebuild doesn't). → `layouts.md § Home, Delta: "Hero search input gone"`.
- **Auth intent copy surfacing.** Whether the rebuild exposes `AuthReason`-style contextual copy anywhere (legacy surfaced it in the dialog). → `layouts.md § Auth, Delta: "Auth copy decoupled from reason"`.
- **About page future.** Whether `/about` gets rebuilt in Phase 3 or dropped entirely (rebuild currently has no equivalent). → `layouts.md § About, Delta note` (deferred: product decision).

## What this document is not

This is a descriptive audit. It does not dictate which values Phase 2.2 should adopt — that is 2.2's call, informed by the `Action` column in `tokens.md` and the `Delta` entries in `layouts.md`. Similarly, layout deltas do not prescribe solutions for 2.3 — they enumerate differences to be resolved.

The "Verify before porting" list is not an acceptance gate — some items are product decisions that may legitimately go either way. Treat it as a scoping document for the next conversation with the roadmap owner.
