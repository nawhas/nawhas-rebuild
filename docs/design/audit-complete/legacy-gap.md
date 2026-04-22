# Phase 2.1e — Axis 6: Legacy-parity Gap

Organised by page so Phase 2.3's per-page redesign specs can consume a single read. Within each page: **Missing** (unresolved) / **Divergent** (intentional — cite decision) / **Rebuild-only**. Findings consolidated from 11 subtree audit passes against `docs/design/layouts.md` and `docs/design/README.md § Decisions (resolved 2026-04-22)`.

## Summary

- **Home:** 5 missing surfaces (hero, Trending This Month strip, Recently Saved strip, hero-quote banner, Top Nawhas numbered list); 1 intentional IA reshape; 1 rebuild-only section (RecentAlbums).
- **Reciter profile:** 4 missing (hero banner, pagination in discography, "Top Nawhas" strip, per-album expand); 1 intentional divergence (moderator edits moved to `/contribute/*`).
- **Album:** 4 missing (Vibrant tinted hero, responsive type ramp, add-to-queue CTA + snackbar, artwork elevation/border); 1 intentional URL flatten; 1 rebuild-only PlayAllButton + listing page.
- **Track:** 5 missing (Vibrant hero, right-rail YouTube + "More from this Album", add-to-queue/repeat, snackbar, lyrics timestamp highlight — parked per 2.1c); 1 intentional MediaToggle divergence; 1 rebuild-only (LyricsDisplay language tabs).
- **Library:** 0 missing (one optional "Recently Saved" dashboard fold-in flagged); 3 intentional simplifications.
- **Search:** 0 missing; 4 intentional divergences (dialog → page + header combobox + mobile overlay, Algolia → Typesense, tabs with per-type counts, split mobile/desktop).
- **Auth:** 1 unimplemented-but-decided item (`?reason=save|like|library|contribute`); 2 intentional divergences (6 routes, route-based instead of dialog); 2 rebuild-only (`/verify-email`, `/check-email`).
- **About:** out-of-scope for this audit (no rebuild file yet).
- **Contribute + Mod:** entirely rebuild-only per layouts.md; no legacy parity to measure.
- **Shared chrome:** 5 missing (SVG logo, "Library"/"About" nav items, Vuetify-style `v-navigation-drawer` mobile-nav, elevate-on-scroll header, user-menu feedback/moderator/theme items); multiple intentional divergences.
- **Cross-page:** Roboto Slab / Bellefair fonts loaded but not applied to display typography anywhere (Axis 1 observation).

---

## Home (`/`)

### Missing
- **No hero.** Rebuild has `sr-only` h1 and jumps into grids. Legacy: radial-red-gradient header, Roboto 200 / 64px slogan, inline `<global-search hero>`. Explicitly deferred in `layouts.md#L185-186` — Phase 2.3 call.
- **No hero-quote banner** (Imam Jafar Sadiq quote + `imam-hussain-header.jpg`). Unresolved — `layouts.md#L187` notes "no rebuild equivalent" without a deferred/dropped disposition.
- **No "Trending This Month" tracks strip** (legacy had `<track-card colored show-reciter/>` × 6).
- **No "Recently Saved Nawhas" auth-gated strip.** Decision was to fold into `/library/tracks`; home-side omission intentional. Flagged per `layouts.md#L188`.
- **No "Top Nawhas" numbered `<TrackList metadata numbered count=20>` table.**
- **`PopularTracks` is thin.** Legacy shipped play/save affordances; rebuild `home/popular-tracks.tsx` is title + duration only with no play hook (explicit `// Server Component — pure presentation, no interactivity` at L18).

### Divergent (intentional)
- **IA reshape.** Legacy: trending tracks → stories → saved → quote → top reciters → top nawhas. Rebuild: reciters → albums → popular tracks. Documented as intentional (`layouts.md#L189`).
- **No "Latest Stories" strip** — out of scope per `README.md#L44` (stories are roadmap non-goals).

### Rebuild-only
- `RecentAlbums` section (legacy home did not foreground albums).

## Reciter profile (`/reciters/[slug]`)

### Missing
- **No hero banner.** `reciter-header.tsx` is a flex row with initials avatar. Legacy: full-bleed `azadari-flags.jpg` backdrop, 88/128px bordered avatar, 1.6rem centred Roboto weight-300 name, moderator hero bar. Deferred per `layouts.md#L242`.
- **No pagination in discography.** `reciter-discography.tsx` renders the full album list in one grid. Legacy uses `?page=` query with scroll to `#albums-section`. Rebuild's `reciter-grid.tsx` **does** use cursor-based `LoadMore` for the `/reciters` list, but the profile page does not — genuine gap.
- **No "Top Nawhas" section on profile.** Legacy renders 6 track-cards above the albums. Rebuild omits entirely (`layouts.md#L245`).
- **No per-album expand.** Legacy `<album>` component renders each album with nested track list inline. Rebuild shows cards only.

### Divergent (intentional)
- Moderator edit dialogs moved to `/contribute/*` (intentional).
- Per-album expand omission — `layouts.md#L246` documents the flattening as intentional.

### Rebuild-only
- None specific to this page beyond the shared Card primitives.

## Album (`/albums/[slug]`)

### Missing
- **No Vibrant-derived hero tint.** `album-header.tsx` has no `node-vibrant` palette extraction; background is flat neutral. Legacy samples artwork `DarkMuted` swatch. Per `layouts.md#L303`.
- **No responsive typography down-step.** `text-3xl` fixed. Legacy: 2.4rem → 1.9rem (sm-and-down) → 1.4rem (xs).
- **No add-to-queue CTA + "Added to Queue" snackbar.** Rebuild keeps only `<PlayAllButton>`.
- **Artwork uses `rounded-lg`, no white border / elevation.** Legacy: 4px white border + `elevation-4`. `album-header.tsx#L20` uses `rounded-lg bg-gray-100` — flat.

### Divergent (intentional)
- **URL shape** `/albums/[slug]` top-level vs legacy `/reciters/:reciter/albums/:album` — per `layouts.md` (intentional flattening).
- **Metadata layout flattened.** Rebuild: year + track-count as `flex-wrap` row. Legacy: "Album • {reciter} • {year}" + separate "N tracks" with icons. Intentional flattening per `layouts.md#L307`.
- **Moderator edit-album dialog** moved to `/contribute/edit/album`.

### Rebuild-only
- `<PlayAllButton>` + index-route `/albums` listing page.

## Track (`/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]`)

### Missing
- **No hero.** Legacy ships Vibrant-tinted full-bleed hero with 96/128/192px bordered artwork + Roboto Slab bold 2.4rem title. Rebuild is plain `<header>` with `text-3xl` sans title and no artwork.
- **No right-rail `md=4` column** — YouTube card + "More From This Album" sibling list with active-row tint (`layouts.md § Track delta`).
- **No responsive type ramp** (2.4 / 1.9 / 1.4rem across breakpoints); rebuild fixed 24px.
- **No add-to-queue / repeat / print controls** (print is an explicit roadmap non-goal).
- **Lyrics timestamp highlight + auto-scroll sync** — parked per Phase 2.1c research.
- **No snackbar feedback with Undo.**
- **No `<lyrics-renderer>` JSON-v1 renderer** with monospaced Roboto Mono timestamps at a 45px left gutter — blocked by upstream schema research.
- **No `assistant`-icon tooltip** ("New! Write-up synchronized with audio") — contingent on same research.

### Divergent (intentional)
- **MediaToggle (Listen / Watch tabs)** instead of persistent YouTube right-rail card — rebuild simplification; `layouts.md § Track Delta "Right rail dropped"`.
- **`TrackActions` row** drops add-to-queue/moderator affordances; `layouts.md § Track Delta "Action cluster reshaped"`.

### Rebuild-only
- `LyricsDisplay` language tabs (ar/ur/en/romanized with localStorage persistence). Legacy shipped one lyrics document per track.
- `<PlayerStore.setCurrentLyrics>` wiring so `MobilePlayerOverlay` re-renders the same `LyricsDisplay` in the bottom sheet (static today — research-dependent).

## Library (`/library/tracks`, `/history`, `/profile`, `/profile/contributions`, `/profile/settings`)

### Missing
- **"Recently Saved" dashboard strip** — legacy `/library/home` had a curated 6-item grid above the full list. Decisions allows folding into `/library/tracks` "if there is real UX value at list-load"; currently not implemented. Flag as optional Phase-3 follow-up, not a gap.

### Divergent (intentional)
- **3 legacy library routes collapsed to 1** (`/library/tracks`) per Decisions: "Library IA — ship the simpler one-route model. Keep rebuild's `/library/tracks` + `/history`; do not restore the legacy anon landing or `/library/home` dashboard."
- **Pagination model differs** — cursor-based `<LoadMore/>` in place of `<v-pagination circle>` numbered pages (rebuild-wide convention).
- **No anon marketing gate** — runs inside `(protected)` layout. Intentional per Decisions.

### Rebuild-only
- `/history` (legacy had no history surface).
- Unified `/profile/*` pages (legacy scattered across Vuex + preferences).

## Search (`/search` + header `SearchBar`)

### Missing
- **Hero-variant search pill on home** (deferred visual verify per `layouts.md § Home`).

### Divergent (intentional)
- **Dialog → page + header combobox + mobile overlay** — per Decisions: "Search entry points — keep both. Header `SearchBar` for jump-to-result intent (autocomplete, ≤5 hits); `/search` page for browse intent (paginated, filterable)."
- **Backend swap Algolia → Typesense** — intentional.
- **Tabs with per-type counts + paginated results** — implemented in `search-results-content.tsx`. New affordance vs legacy (which stacked all three collections in one dropdown).
- **Mobile implementation split** — legacy `<GlobalSearch/>` handled both desktop + mobile with internal breakpoint switches; rebuild splits into `search-bar.tsx` + `mobile-search-overlay.tsx`. Behaviour-equivalent.

### Rebuild-only
- `/search` page, `SearchResultsContent` with type-filtered tabs.

## Auth (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/check-email`)

### Missing
- **Contextual `AuthReason` copy** ("to save a track, sign in") — **resolved per Decisions** (port via `?reason=save|like|library|contribute` query param); **not yet implemented**. `login-form.tsx` only reads `callbackUrl`, no `reason`. Affects `auth-page-shell.tsx` (no `reason` prop / no query-param read), `login-form.tsx`, and `SaveButton.tsx` / `LikeButton.tsx` which today redirect without the reason param. Legacy string mapping to reproduce: `save → "Sign in to save a track"`, `like → "Sign in to like this"`, `library → "Sign in to view your library"`, `contribute → "Sign in to contribute"`. No translation keys exist yet.

### Divergent (intentional)
- **Auth dialog → 6 routes** (intentional per `layouts.md § Auth` and Decisions).
- **`<UserMenu>` login-dialog → `<Link>` to `/login`** (intentional per Decisions L64).

### Rebuild-only
- `/verify-email` and `/check-email` flows (legacy had neither).

## About

Not covered in any scratch file — the rebuild does not ship an `/about` route yet. Per `layouts.md § About` the page is deferred (`README.md#L87`).

## Contribute + Mod

Entirely rebuild-only surfaces — no legacy parity to measure, per `layouts.md § Contribute + Mod`: "Delta: rebuild-only — no reconciliation needed."

- **Contribute:** `/contribute`, `/contribute/album/new`, `/contribute/reciter/new`, `/contribute/track/new`, `/contribute/edit/album/*`, `/contribute/edit/reciter/[slug]`, `/contribute/edit/track/*` — all net new. No `reciter-picker` / `language-picker` yet despite design brief hints; Phase 2.2+ future work.
- **Mod:** `/mod`, `/mod/audit`, `/mod/queue`, `/mod/submissions/[id]`, `/mod/users` — all net new. Legacy used PR-based contributions against the repo; there was no on-platform review queue. Inline `<edit-track-dialog>` / `<edit-reciter-dialog>` from legacy public pages replaced by `/contribute/edit/<entity>` routes.

## Shared chrome (header / footer / mobile nav / user menu / theme toggle / player bar)

### Missing
- **Footer content.** `apps/web/app/layout.tsx:118` passes `footer={<></>}` — legacy ships `<app-footer>` with About/Feedback/brand icon (per `layouts.md § Global footer`).
- **SVG logo icon + wordmark** — rebuild is text-only per `layouts.md#L45` ("Deferred: visual wordmark parity").
- **"Library" and "About" nav items** — intentional per Decisions (`README.md#L62` keeps one Library route; `L87` About deferred).
- **Mobile drawer parity** — legacy Vuetify `v-navigation-drawer` (off-canvas slide-in) replaced with absolutely-positioned dropdown `div` below header — `layouts.md#L50` flagged; Sheet primitive would restore closer parity.
- **Icon+label tile treatment** in mobile nav (legacy used `4 icon+label tiles` per `layouts.md#L28`).
- **`<bug-report-form>` / feedback dialog** — unaddressed in Decisions; still a gap per `layouts.md`.
- **`elevate-on-scroll` header** — rebuild uses static `border-b` instead; `layouts.md#L51` (deferred: visual verify).
- **`<UserMenu>` legacy items** — Feedback / moderator / Dark-mode toggle menu items absent; rebuild's menu has only Profile + Sign Out.

### Divergent (intentional)
- **Search in header is inline `SearchBar` + `/search` page** instead of dialog (Decisions L63 "keep both").
- **Auth in header is `<Link>` to `/login`** instead of in-place login dialog (Decisions L64).
- **`<Toaster>` now wired globally** at `apps/web/app/layout.tsx:125` (sonner) — CLOSES the legacy gap noted in `layouts.md § Global notifications / dialogs`. Update opportunity: `layouts.md` is out of date on this point.
- **No `<update-service-worker>` equivalent** — per Decisions, PWA skipped, so this is intentional.

### Rebuild-only
- `ThemeProvider`, `AudioProvider`, `NextIntlClientProvider`, `PlayerBarLazy`, `PlayerPanels`, `ThemeToggle` in header (legacy had no header theme toggle), skip link (legacy had no A11y skip), `PlayerBarSpacer` mount point, `use-listening-history` + `/history` surface.

## Cross-page

### Missing (across multiple pages)
- **Roboto Slab / Bellefair display typography** loaded via `next/font/google` in `apps/web/app/layout.tsx` per Phase 2.2 but **not applied** to hero/title surfaces anywhere (no `font-display-serif` / `font-slab` use in any card or header file). Legacy typography gaps will surface once Phase 2.3 wires these to the display surfaces.
- **Vibrant palette extraction (`node-vibrant`)** absent wholesale — affects Album header + Track hero.
- **Icon library consistency** — duplicate close-icon SVGs across PlayerBar/MobilePlayerOverlay/QueuePanel; duplicate music-note placeholders across `album-card.tsx` / `album-grid.tsx`; envelope SVG duplicated across `check-email-card.tsx` / `forgot-password-form.tsx`. All candidates for a shared `icons/` module or `lucide-react` adoption.

### Rebuild-only surfaces (cross-page)
- `ThemeToggle`, `PlayerBarSpacer`, global `<Toaster>`, cursor-based `LoadMore` convention, on-platform review queue, `/search` page, `/history` page, semantic Next Image wrapper (`ui/image.tsx`), skeleton grid components.

### SEO / infrastructure
- `apps/web/app/sitemap.ts` · `robots.ts` — rebuild-only shape. Legacy Nuxt had `@nuxtjs/sitemap` but different URL structure. Completeness note.
- Nothing blocks Phase 3.2 (SEO parity) — redirect map from legacy URL shapes to rebuild's flattened ones is future work.
