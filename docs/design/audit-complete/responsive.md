# Phase 2.1e — Axis 3: Responsive Coverage

Per-subtree inventory of breakpoint coverage, mobile/desktop chunk splits, and flagged concerns. Findings consolidated from 11 subtree audit passes.

## Summary

- **Files with flagged concerns:** ~18 (range: missing breakpoints on tables/tabs/overlays, magic-height calcs, fixed-size elements with no mobile alternative)
- **Files with no breakpoints (intentional):** ~35 (leaf forms, icon buttons, pure utility wrappers, skeletons that inherit responsive fractions from parents, hooks, lib)
- **Files with full responsive coverage:** most grids (`sm`/`md`/`lg`), the header chrome (`md:flex` swap), page layouts (`max-w-*` + `px-4 md:px-8`)
- **Breakpoint ramp observed across the codebase:** `sm` (640px), `md` (768px), `lg` (1024px); no `xl` or `2xl` anywhere in `apps/web/src/`
- **Primary hot spots:**
  1. Mod tables (`audit`, `users`) — no horizontal-scroll wrapper; tight on narrow viewports inside the fixed 224px sidebar
  2. Lyrics 4-tab row (`lyrics-display.tsx`) — will overflow on ~320px viewports
  3. `MobilePlayerOverlay` — no breakpoints; renders full-screen on desktop too (looks broken)
  4. `QueuePanel` — magic `h-[calc(100vh-65px)]` duplicating PlayerBar height
  5. Mod sidebar (`apps/web/app/mod/layout.tsx`) — fixed `w-56` with no `md:hidden` / mobile collapse

---

## apps/web/app/ (Pass 01)

### apps/web/app/error.tsx · not-found.tsx
Uses `sm` — button nav stacks to row at `sm:flex-row`. No concerns.

### apps/web/app/(auth)/reset-password/page.tsx · verify-email/page.tsx
No breakpoints — card is `max-w-md` via parent shell. Fixed `h-12 w-12` icon tile + `px-8 py-10` acceptable.

### apps/web/app/(protected)/profile/page.tsx
Uses `sm` — profile header flips to row at `sm`; stats grid `grid-cols-2`. No concerns.

### apps/web/app/(protected)/settings/page.tsx
No breakpoints — single-column sections with `px-6` inside `<Container>`.

### apps/web/app/(protected)/history/page.tsx · library/tracks/page.tsx
No breakpoints at page level — delegated to list components.

### apps/web/app/albums/page.tsx · reciters/page.tsx
No breakpoints at page level — grids live in `<AlbumGrid>` / `<ReciterGrid>`.

### apps/web/app/albums/loading.tsx · reciters/loading.tsx
Uses `md`, `lg` — grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`.

### apps/web/app/albums/[slug]/loading.tsx
Uses `sm` — header flex flips to row.

### apps/web/app/reciters/[slug]/loading.tsx
Uses `sm`, `md`, `lg` — discography grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`.

### apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/loading.tsx
No breakpoints — single-column lyrics skeleton.

### apps/web/app/contribute/page.tsx
Uses `sm` — tile grid `grid-cols-1 sm:grid-cols-3`.

### apps/web/app/mod/layout.tsx
**Concern:** sidebar is fixed `w-56` with no `md:hidden` / mobile collapse — sidebar is always visible and will crowd viewport under ~640 px. No responsive variant provided.

### apps/web/app/mod/page.tsx · audit/page.tsx · queue/page.tsx · submissions/[id]/page.tsx · users/page.tsx
**Concern:** `max-w-3xl` / `max-w-4xl` / `max-w-5xl` work but tables at `audit/page.tsx` and `users/page.tsx` use `table-fixed` / `w-full` with multiple columns — no horizontal-scroll wrapper; tight on narrow viewports despite sidebar taking 224 px.

### apps/web/app/search/page.tsx
No breakpoints at page level — results inside `<SearchResultsContent>`.

## apps/web/src/components/layout/ (Pass 02)

### page-layout.tsx
No breakpoints (intentional — structural only). No concerns.

### container.tsx
`md:px-8` — mobile-first scaling of horizontal padding. No sm/lg/xl/2xl. Reasonable for a generic wrapper.

### header.tsx
Uses `md:flex`, `hidden md:flex` to swap desktop/mobile affordances at 768px. Mobile hamburger + search icon shown < md. No `lg`/`xl` variants (logo, nav, search all share one breakpoint). **Concern:** single `md` break collapses everything at once — no tablet/desktop-lg nuance.

### nav-links.tsx
No breakpoint classes on the links themselves (container class passed in from parent). Acceptable — composed with `hidden md:flex` from header.

### mobile-nav.tsx
`md:hidden` wrapper L47 — strictly phone/small-tablet. No adaptation inside the menu (full width at all mobile widths). **Concern:** absolute `inset-x-0 top-16` assumes header is always exactly `h-16` — breaks if header height ever changes.

### user-menu.tsx
No explicit breakpoints. Fixed `h-8 w-8` avatar and `w-48` menu width — fine; Radix handles positioning.

## apps/web/src/components/player/ (Pass 03)

### PlayerBar.tsx
Breakpoints: `sm:`, `md:`. Mobile-only `md:hidden` ExpandIcon (L270); `md:cursor-default md:focus:ring-0` on track-info button (L250). Desktop-only `hidden ... md:flex` volume container (L349). Responsive gap `gap-2 sm:gap-4` / `gap-1 sm:gap-2`.
**Concern:** track-info flex-1 and right-cluster flex-1 at the same priority may cause middle controls to overflow on viewports <320px — no `min-w-0` audit fallback below `sm`.

### PlayerBarLazy.tsx · PlayerBarSpacer.tsx · PlayerPanels.tsx
Not applicable — no layout markup.

### MobilePlayerOverlay.tsx
No breakpoints. Intentionally a **mobile-only** surface, but component is rendered on all viewports. On desktop it can still be opened via track-info click (PlayerBar handler is unconditional). **Concern:** desktop users tapping the title get a full-screen overlay that looks broken at wide widths (no max-width cap, art is fixed `h-56 w-56` centred in unbounded column).

### QueuePanel.tsx
Breakpoints: `sm:w-80 md:w-96` on panel width (L205). Mobile full-width / tablet 320px / desktop 384px — sensible progression.
**Concern:** `h-[calc(100vh-65px)]` is unconditional; when `PlayerBarSpacer` is mid-mount or before PlayerBar is visible the 65px deduction is still subtracted.

### track-play-button.tsx · track-detail-play-button.tsx · play-all-button.tsx
No breakpoints. Components are single-size; acceptable for inline buttons.

## Content cards — cards / home / albums / reciters (Pass 04)

Breakpoints used across the pass: `sm:`, `md:`, `lg:` (no `xl:`, no `2xl:`).

| File | Breakpoints | Shape |
|---|---|---|
| `cards/reciter-card.tsx` | — | Intrinsic; scales with parent grid |
| `cards/album-card.tsx` | — | Aspect-square tile, `sizes` attr varies by width |
| `home/featured-reciters.tsx` | `sm`, `md` | `grid-cols-3 sm:grid-cols-4 md:grid-cols-6`. No mobile-only chunk |
| `home/recent-albums.tsx` | `sm`, `md`, `lg` | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6` |
| `home/popular-tracks.tsx` | — | Linear list, no responsive changes |
| `albums/album-header.tsx` | `sm` | Stacks vertical on mobile → row on `sm+`; artwork grows 192→224px at `sm` |
| `albums/track-list.tsx` | — | Single-column list |
| `albums/track-list-item.tsx` | — | No responsive chunks — **concern:** on narrow screens 5 hover-only buttons (save/like/queue) + title + duration will crowd; no mobile-specific treatment |
| `albums/album-grid.tsx` | `md`, `lg` | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`. **Concern:** skips `sm:` step (unusual vs siblings) |
| `reciters/reciter-grid.tsx` | `md`, `lg` | Same shape as `album-grid.tsx` |
| `reciters/reciter-header.tsx` | `sm` | Stacks column / centred on mobile → row / left-aligned on `sm+` |
| `reciters/reciter-discography.tsx` | `sm`, `md`, `lg` | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` |

**Concerns summary:**
1. Grid cadence inconsistent — `recent-albums` peaks at 6 cols, `reciter-discography` at 5, `album-grid` at 4; no rationale comment
2. `track-list-item` packs 5 interactive icons + variable-width title into one row with no small-screen collapse — risk of horizontal overflow on ≤360px
3. `album-grid` skips `sm:` (jumps `grid-cols-2` → `md:grid-cols-3`); neighbours all define an `sm:` step

## Track surface — tracks + lyrics (Pass 05)

### track-header.tsx
No breakpoints. Title `text-3xl` fixed at all widths — legacy shipped 2.4rem / 1.9rem / 1.4rem responsive ramp. Meta row uses `flex-wrap` + `gap-x/gap-y` — wraps gracefully.
**Concern:** 24px title on ≤360px phone can overflow for long Arabic-transliterated titles (e.g. "Mustahib-e-Pursa…").

### media-toggle.tsx
No breakpoints. `flex-1` on each tab → 50/50 full-width at every width. Fine for two tabs.

### track-actions.tsx
No breakpoints. Two buttons in a row — fine at all widths.

### youtube-embed-slot.tsx
No breakpoints. `aspect-video w-full` is inherently responsive.

### lyrics-display.tsx
No breakpoints. Tab row uses `flex gap-0` with no `overflow-x-auto` or wrap — **4 tabs (Arabic / Urdu / English / Romanized) at widest labels will overflow on ~320px viewports.** Tabs will either clip or force horizontal scroll the user can't see.

## Forms — auth + contribute (Pass 06)

- **auth-page-shell.tsx.** `max-w-md` fixed ceiling; `px-4 py-12` adapts. Single breakpoint-less design intentional for the narrow auth card — no concern.
- **check-email-card.tsx / forgot-password-form.tsx / login-form.tsx / register-form.tsx / reset-password-form.tsx.** No `sm` / `md` / `lg` at all. Relies on parent `max-w-md`. Fine for forms.
- **social-buttons.tsx.** `flex flex-col gap-3` stack. No breakpoints. Appropriate.
- **form-field.tsx.** No breakpoints (leaf component).
- **reciter-form.tsx / album-form.tsx / track-form.tsx / resubmit-form.tsx.** `space-y-5` vertical stack — no `sm` / `md` grid collapse. Probably fine for small forms but note: album-form has 5 fields and track-form has 7; on wide viewports they render as a very tall single column. A `md:grid-cols-2` for short fields like `slug` / `year` / `trackNumber` / `duration` would be an easy win — not a regression, just a missed affordance.
- **contribution-list.tsx.** `flex-wrap items-center gap-2` on badge row + `shrink-0` date. Expanded panel has `px-5 py-4` no-breakpoint padding. `truncate` on label. No concerns.

No mobile-only / desktop-only chunks in any form file. No `hidden md:block` patterns.

## Lists — library + search + mod (Pass 07)

| File | Breakpoints | Concerns |
|---|---|---|
| `library-tracks-list.tsx` | none | List works fluidly — no concern |
| `search-bar.tsx` | `hidden md:block` at root | By design — mobile goes through `mobile-search-overlay`. `w-64` fixed width may feel tight on narrow desktops (≥768 but <1024) |
| `mobile-search-overlay.tsx` | `md:hidden` at trigger, `flex-col` full-screen panel | Fine. Uses `fixed inset-0` — covers viewport correctly |
| `search-results-content.tsx` | `sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` for reciter + album grids | Good ramp. Track list stays single-column — correct. Tab strip doesn't collapse on narrow viewports — may cause horizontal scroll with 4 tabs + counts on ~375px (minor) |
| `apply-button.tsx` | none | Fine |
| `badges.tsx` | none | Inline pills scale with text |
| `field-diff.tsx` | none | **Concern:** `grid-cols-2` always splits at all viewports. On ~375px Current/Proposed columns become very narrow; no `sm:grid-cols-2` gate. Low severity |
| `load-more-audit.tsx` | none | Tabular — uses `<tr>`; assumes a table wrapper. On mobile, `max-w-xs truncate` helps |
| `load-more-queue.tsx` | none | Row is `flex` — wraps OK. Badges row may overflow at very narrow widths |
| `load-more-users.tsx` | none | Tabular — same caveat as audit |
| `review-actions.tsx` | none | `flex-wrap gap-3` handles small viewports |
| `role-button.tsx` | none | `<select>` — fine |
| `submission-row.tsx` | none | Same as queue |

## Utility — theme / ui / providers / settings (Pass 08)

- `theme/ThemeToggle.tsx`: single button at all sizes; no breakpoints; fine — header composes responsively around it.
- `settings/*`: forms use `max-w-sm`; no `sm`/`md`/`lg` breakpoints. Works because the settings route provides a responsive wrapper.
- `delete-account-section.tsx`: modal uses `max-w-md` + `p-4` backdrop padding; fine on mobile but no landscape-small-height handling (modal could overflow on short viewports).
- `empty-state.tsx`: centred flex-col, `py-16` fixed regardless of viewport — acceptable.
- `arabic-text.tsx` / `urdu-text.tsx`: fixed `text-[1.125rem]` regardless of breakpoint — legible on mobile but no scale-up for large displays.
- `image.tsx`: mobile-first `sizes` default is exactly the responsive concern handled here. Good.
- Skeleton files: no breakpoints; width fractions (`w-3/4`, `w-1/2`) are container-relative — correct approach.

**Concerns:** none blocking; the settings forms are narrow-by-design. Modal height-overflow is a minor a11y note.

## Top-level — SaveButton / LikeButton (Pass 09)

### SaveButton.tsx · LikeButton.tsx
**No breakpoints** (identical between the two). Control intentionally size-fixed (icon + `p-1`) for all viewports. No mobile/desktop chunks. No concerns — icon-only buttons usually don't need responsive sizing. However, `h-auto w-auto` + `p-1` yields ~24px hit target, below the 44×44 touch-target guideline (see accessibility doc).

## Hooks (Pass 10)

Not applicable. No `use-is-mobile` / `use-breakpoint` style hooks exist in this directory; neither file observes viewport or media queries. Mobile vs. desktop differentiation lives in the consuming components (`search-bar.tsx` vs. `mobile-search-overlay.tsx`), which share the single `useSearchAutocomplete` hook.

## Client lib (Pass 11)

Not applicable. No breakpoints, no viewport-conditional logic.
