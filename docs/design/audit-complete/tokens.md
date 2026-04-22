# Phase 2.1e — Axis 1: Token Consumption

Per-file inventory of colour / radius / shadow / spacing utilities across the rebuild frontend. Findings consolidated from 11 subtree audit passes.

## Summary

- **Files audited:** 127 (45 `app/`, 6 layout, 9 player, 12 content-card, 5 track-surface, 13 forms, 13 lists, 14 utility, 2 top-level, 2 hooks, 6 client lib in-scope; only production `.tsx`/`.ts` — tests excluded from tallies).
- **Semantic token call sites:** ~4 occurrences total (`border-destructive`, `focus-visible:ring-destructive` on `contribute/form-field.tsx`; `<Card>`-mediated `bg-card`/`border` on `home/popular-tracks.tsx`; shadcn semantic tokens inside the `<Button>` primitive itself). Zero direct consumption of `bg-background`, `text-foreground`, `text-muted-foreground`, `ring-ring` anywhere in `apps/web/src/`.
- **Ramped (brand) token call sites:** ~6 total — only `lyrics-display.tsx` uses `text-primary-700` / `border-primary-600` / `focus-visible:ring-primary-600`, plus `auth-page-shell.tsx` uses `bg-gray-50 dark:bg-gray-950` (ramped, neutral). No use of `bg-brand-*` / `text-accent-*`.
- **Tailwind-default palette call sites (gray/red/blue/green/orange/amber/yellow/emerald/purple):** hundreds — the de-facto surface system.
- **Literal utility call sites:** `bg-white` and `text-white` appear in ~30 files; `bg-black/30` and `bg-black` appear in a handful; arbitrary-value literals (`text-[1.125rem]`, `leading-[1.8]`, `leading-[2.0]`, arbitrary `shadow-[…]` / `h-[calc(100vh-65px)]`) are scoped to lyrics wrappers and player bar by design. Hex brand fills (`#4285F4` etc.) appear only in SVG provider logos (`social-buttons.tsx`) — legitimate brand assets.
- **Radii:** `rounded` / `rounded-md` / `rounded-lg` / `rounded-full` dominate; no explicit size-token (`rounded-base` etc.) anywhere.
- **Shadows:** mostly `shadow-sm` (hand-rolled card surface) + a handful of `shadow-md` / `shadow-lg` / `shadow-xl`. The PlayerBar emits a custom upward-cast arbitrary `shadow-[0_-2px_8px_4px_rgba(…)]` per Phase 2.1d fix.
- **Spacing:** canonical Tailwind scale throughout. One magic value: `h-[calc(100vh-65px)]` in `QueuePanel.tsx`.

### Top 10 offending files (by Tailwind-default call-site count)

| # | File | Approx. TW-default class occurrences |
|---|---|---|
| 1 | `apps/web/src/components/player/PlayerBar.tsx` | ~40+ |
| 2 | `apps/web/src/components/search/search-results-content.tsx` | ~35 |
| 3 | `apps/web/src/components/player/MobilePlayerOverlay.tsx` | ~30+ |
| 4 | `apps/web/app/mod/submissions/[id]/page.tsx` | ~25 (incl. blue tints) |
| 5 | `apps/web/src/components/layout/mobile-nav.tsx` | ~28 |
| 6 | `apps/web/src/components/player/QueuePanel.tsx` | ~24 |
| 7 | `apps/web/src/components/search/search-bar.tsx` | ~20 |
| 8 | `apps/web/src/components/search/mobile-search-overlay.tsx` | ~22 |
| 9 | `apps/web/src/components/albums/track-list-item.tsx` | ~16+ |
| 10 | `apps/web/app/mod/layout.tsx` + `mod/page.tsx` + `mod/audit/page.tsx` | ~15 each (heavy sub-route cluster) |

---

## Findings by subtree

## apps/web/app/ (Pass 01)

Note: `bg-gray-*`, `text-gray-*`, `bg-white`, etc. are Tailwind default/literal tokens — rebuild has not yet anchored these on the resolved red/grey hues from `docs/design/README.md § Decisions`. Every color-bearing file below hand-rolls `light class + dark:light class` pairs instead of using semantic tokens declared in `globals.css`.

### apps/web/app/layout.tsx
- Semantic: 0 · Ramped: 0 · Tailwind default: 0 · Literals: 0
- Radii/Shadows/Spacing: primitive-sourced (layout-only)

### apps/web/app/page.tsx
- Semantic: 0 · Ramped: 0 · Tailwind default: 0 · Literals: 0

### apps/web/app/error.tsx
- Semantic: 0 · Ramped: 0 · Tailwind default: 8 (`bg-red-50`, `text-red-300`, `text-gray-900`, `text-gray-600`, `bg-gray-900`, `text-gray-700`, `text-gray-300`, `border-gray-300`, `bg-gray-50`, `bg-gray-800`, `bg-gray-700`, `border-gray-600`) · Literals: 2 (`text-white`, `bg-white`)
- Radii: `rounded-full`, `rounded-md`

### apps/web/app/not-found.tsx
- Tailwind default: many (`bg-gray-100`, `text-gray-400`, `bg-gray-800`, `text-gray-600`, `text-gray-900`, `bg-gray-900`, `bg-gray-700`, `text-gray-700`, `text-gray-300`, `border-gray-300`, `border-gray-600`, `bg-gray-50`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-full`, `rounded-md`

### apps/web/app/login/page.tsx · check-email/page.tsx · (auth)/layout.tsx · (auth)/register/page.tsx · (auth)/forgot-password/page.tsx
- No color classes (delegates to primitives).

### apps/web/app/(auth)/reset-password/page.tsx
- Tailwind default: 8 (`bg-red-100`, `text-red-600`, `text-gray-900`, `text-gray-600`, `text-gray-500`, `text-gray-400`, `bg-gray-900`, `bg-gray-700`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-full`, `rounded-lg`, `rounded-md` · Shadows: `shadow-sm` · ring: `ring-gray-900/5`, `ring-gray-700`, `ring-gray-900`, `ring-offset-2`

### apps/web/app/(auth)/verify-email/page.tsx
- Tailwind default: many (`bg-red-100`, `text-red-600`, `bg-green-100`, `text-green-600`, `text-gray-900`, `text-gray-600`, `text-gray-500`, `text-gray-400`, `bg-gray-900`, `bg-gray-700`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-full`, `rounded-lg`, `rounded-md` · Shadows: `shadow-sm` · ring: `ring-gray-900/5`, `ring-gray-700`

### apps/web/app/(protected)/layout.tsx
- Logic-only. No findings.

### apps/web/app/(protected)/history/page.tsx · library/tracks/page.tsx
- Tailwind default: 4 (`text-gray-900`, `text-gray-500`, `text-gray-400`) · Literals: 1 (`text-white`)

### apps/web/app/(protected)/profile/contributions/page.tsx
- Tailwind default: 6 (`text-gray-900`, `text-gray-500`, `text-gray-700`, `text-gray-400`, `text-gray-300`) · Literals: 1 (`text-white`)

### apps/web/app/(protected)/profile/page.tsx
- Tailwind default: heavy (`border-gray-200`, `text-gray-500/400/900`, `divide-gray-100`, `border-gray-700`, `bg-gray-900/800`, `divide-gray-800`, `text-gray-600/300`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-xl`, `rounded-lg` · Shadows: `shadow-sm`

### apps/web/app/(protected)/settings/page.tsx
- Tailwind default: 6 (`text-gray-900/500/400`, `border-gray-200`, `divide-gray-200`, `border-gray-700`, `divide-gray-700`, `bg-gray-900`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-lg`

### apps/web/app/albums/page.tsx
- Tailwind default: 1 (`text-gray-900`) · Literals: 1 (`text-white`)

### apps/web/app/albums/loading.tsx
- Tailwind default: 2 (`bg-gray-200`, `bg-gray-700` dark) · Radii: `rounded`

### apps/web/app/albums/[slug]/page.tsx
- No color classes (all delegated).

### apps/web/app/albums/[slug]/loading.tsx
- Tailwind default: `bg-gray-200`, `bg-gray-700`, `divide-gray-100`, `divide-gray-800`, `border-gray-200`, `border-gray-700` · Radii: `rounded-lg`, `rounded`

### apps/web/app/reciters/page.tsx
- Tailwind default: 1 (`text-gray-900`) · Literals: 1 (`text-white`)

### apps/web/app/reciters/loading.tsx
- Tailwind default: 2 (`bg-gray-200`, `bg-gray-700`) · Radii: `rounded-lg`, `rounded-full`, `rounded`

### apps/web/app/reciters/[slug]/page.tsx
- No color classes (all delegated).

### apps/web/app/reciters/[slug]/loading.tsx
- Tailwind default: 2 (`bg-gray-200`, `bg-gray-700`) · Radii: `rounded-full`, `rounded`

### apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx
- No color classes (all delegated).

### apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/loading.tsx
- Tailwind default: 2 (`bg-gray-200`, `bg-gray-100`, `bg-gray-700` dark, `bg-gray-800`) · Radii: `rounded-lg`, `rounded`

### apps/web/app/contribute/layout.tsx
- Tailwind default: heavy (`text-gray-900/500/400/700/300`, `border-blue-200`, `bg-blue-50`, `border-blue-800`, `bg-blue-950`, `text-blue-900/100/700/300`) · Literals: 1 (`text-white`)
- Radii: `rounded-lg`

### apps/web/app/contribute/page.tsx
- Tailwind default: heavy (`text-gray-900/500/400/700/300`, `border-gray-200/400/700/500`, `ring-gray-400`, `bg-gray-800`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-lg`

### apps/web/app/contribute/album/new/page.tsx · reciter/new/page.tsx · track/new/page.tsx · edit/album/[...]/page.tsx · edit/reciter/[slug]/page.tsx · edit/track/[...]/page.tsx
- Each: Tailwind default: 3 (`text-gray-900`, `text-gray-500`, `text-gray-400`) · Literals: 1 (`text-white`)

### apps/web/app/mod/layout.tsx
- Tailwind default: heavy (`border-gray-200/700`, `bg-gray-50/900`, `text-gray-400/500/700/900/300/100`, `bg-gray-200/800`, `ring-gray-400`) · Radii: `rounded-md`

### apps/web/app/mod/page.tsx
- Tailwind default: heavy (`text-gray-900/500/400`, `border-gray-200/700`, `bg-gray-800`, `divide-gray-100`, `text-gray-700/300`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-xl`, `rounded-lg` · Shadows: `shadow-sm`

### apps/web/app/mod/audit/page.tsx
- Tailwind default: heavy (`text-gray-900/500/400`, `border-gray-200/700/100`, `bg-gray-800/50/700`, `text-gray-700/300`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-lg`

### apps/web/app/mod/queue/page.tsx
- Tailwind default: 5 (`text-gray-900/500/400`, `border-gray-200/700`, `bg-gray-800`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-lg`

### apps/web/app/mod/submissions/[id]/page.tsx
- Tailwind default: heavy (full gray ramp + `border-blue-200`, `bg-blue-50`, `border-blue-800`, `bg-blue-950`, `text-blue-500/400/900/100`, `divide-gray-100/700`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-lg`

### apps/web/app/mod/users/page.tsx
- Tailwind default: heavy (gray ramp incl. `bg-gray-50/700`, `border-gray-100`) · Literals: 2 (`bg-white`, `text-white`)
- Radii: `rounded-lg`

### apps/web/app/search/page.tsx
- Tailwind default: 2 (`text-gray-900`, `text-gray-600`, `text-gray-400`) · Literals: 1 (`text-white`)

### apps/web/app/search/error.tsx · sitemap.ts · robots.ts
- No color classes (data-only / logic-only files).

## apps/web/src/components/layout/ (Pass 02)

### page-layout.tsx
- Semantic: 0 · Ramped: 0 · Tailwind default: 0 · Literals: 0
- Spacing: `min-h-screen`, `flex-1` (no anomalies)

### container.tsx
- No color classes · Spacing: `px-4 md:px-8` (canonical)

### header.tsx
- Tailwind default: 14 — `border-gray-200` L36, `bg-white` L36, `dark:border-gray-700`, `dark:bg-gray-900`, `focus:bg-white/text-gray-900/ring-gray-900`, `dark:focus:*` counterparts, `text-gray-900 dark:text-white`, `bg-gray-900`, `hover:bg-gray-700`, `focus:ring-gray-900`
- Literals: 4 (`bg-white` L36 & L41, `text-white` L41 & L71)
- Radii: `rounded`, `rounded-md` · Shadows: none (uses static `border-b` — deliberate divergence from legacy `elevate-on-scroll`)

### nav-links.tsx
- Tailwind default: 10 — `focus:ring-gray-900`, `bg-gray-100`, `text-gray-900`, `dark:bg-gray-800`, `dark:text-white`, `text-gray-600`, `hover:bg-gray-100`, `hover:text-gray-900`, `dark:text-gray-300`, `dark:hover:bg-gray-800`, `dark:hover:text-white`
- Radii: `rounded`

### mobile-nav.tsx
- Tailwind default: ~28 across drawer header/links/sign-in pill (gray ramp + dark pairs)
- Literals: 3 (`bg-white` L86, `text-white` ×2)
- Radii: `rounded` ×3, `rounded-md` · Shadows: `shadow-md` L86

### user-menu.tsx
- Tailwind default: ~10 — `bg-gray-900 text-white` avatar, `focus:ring-gray-900`, `border-gray-100`, `dark:border-gray-700`, `text-gray-900/500` + dark counterparts
- Literals: 1 (`text-white` L51) · Radii: `rounded-full`

## apps/web/src/components/player/ (Pass 03)

### PlayerBar.tsx
- Semantic: 0 · Ramped: 0 · Tailwind default: ~40+ (`bg-gray-200/700/900/100/800`, `text-gray-900/400/500/700/300`, `text-white`, `border-gray-200/700`, `focus:ring-gray-900`, `accent-gray-900`, `accent-white`, `hover:bg-gray-700`, `dark:*` counterparts)
- Literals: `bg-white` L205, `text-white` L262/L320, arbitrary shadow `shadow-[0_-2px_8px_4px_rgba(0,0,0,0.16)]` + `rgba(0,0,0,0.40)` dark variant L209
- Radii: `rounded`, `rounded-full` · Shadows: custom upward cast (2.1d fix)

### PlayerBarLazy.tsx · PlayerBarSpacer.tsx · PlayerPanels.tsx
- Token-neutral (PlayerBarSpacer uses only `h-20`).

### MobilePlayerOverlay.tsx
- Tailwind default: ~30+ (mirrors PlayerBar: `bg-white`, `bg-gray-100/900/800/600`, `text-gray-900/500/300/600`, `focus:ring-gray-900` + full `dark:` pairs)
- Literals: `bg-white` L200, `text-white` L331
- Radii: `rounded-full`, `rounded-2xl` (L245 art placeholder), `rounded` · Shadows: `shadow-lg` on artwork placeholder

### QueuePanel.tsx
- Tailwind default: heavy (`bg-black/30` backdrop L187, `bg-white/gray-*`, `border-gray-*`, `text-gray-*`, full dark pairs)
- Literals: `bg-white` L206, `bg-black/30` L187
- Radii: `rounded`, `rounded-full` · Shadows: `shadow-xl` on panel
- Spacing anomaly: `h-[calc(100vh-65px)]` L204 — magic 65px for PlayerBar height

### track-play-button.tsx
- Tailwind default: `text-gray-500`, `hover:text-gray-900`, `focus:ring-gray-900`, `text-gray-400` · Radii: `rounded` · **No `dark:` variants**

### track-detail-play-button.tsx
- Tailwind default: `border-gray-200`, `bg-gray-50/900`, `text-white/700`, `hover:bg-gray-700`, `focus:ring-gray-900` · Radii: `rounded-lg`, `rounded-full` · **No `dark:` variants**

### play-all-button.tsx
- Tailwind default: `bg-gray-900`, `hover:bg-gray-700`, `text-white`, `focus:ring-gray-900` · Radii: `rounded-lg` · **No `dark:` variants**

## Content cards — cards / home / albums / reciters (Pass 04)

| File | Sem | Ramp | TW-default (gray/*) | Literals | Radii | Shadows |
|---|---|---|---|---|---|---|
| `cards/reciter-card.tsx` | 0 | 0 | 8 | 1 (`text-white`) | `rounded-lg`, `rounded-full` | none |
| `cards/album-card.tsx` | 0 | 0 | 7 | 1 | `rounded-lg` ×2 | none |
| `home/featured-reciters.tsx` | 0 | 0 | 2 | 1 | none | none |
| `home/recent-albums.tsx` | 0 | 0 | 2 | 1 | none | none |
| `home/popular-tracks.tsx` | 2 (via `<Card>`) | 0 | 5 | 1 | via `<Card>` | via `<Card>` |
| `albums/album-header.tsx` | 0 | 0 | 6 | 1 | `rounded-lg`, `rounded` | none |
| `albums/track-list.tsx` | 0 | 0 | 4 | 0 | `rounded-lg` | none |
| `albums/track-list-item.tsx` | 0 | 0 | **16+** | 1 | `rounded` | none |
| `albums/album-grid.tsx` (incl. `AlbumListCard`) | 0 | 0 | 6 (no dark variants) | 0 | `rounded-lg` | none |
| `reciters/reciter-grid.tsx` | 0 | 0 | 0 | 0 | none | none |
| `reciters/reciter-header.tsx` | 0 | 0 | 5 | 1 | `rounded-full` | none |
| `reciters/reciter-discography.tsx` | 0 | 0 | 2 | 1 | none | none |

Notes:
- Across 12 production files, **0** semantic tokens (except the one `<Card>` indirection), **0** ramped tokens, ~60+ Tailwind-default `gray-*` utilities, 8 `text-white` literals.
- No `shadow-*` use anywhere — even interactive cards are flat.
- Spacing: grids consistently `gap-4`; `reciter-card` uses `p-4` while `album-card` has no outer padding — hit-target inconsistency.

## Track surface — tracks + lyrics (Pass 05)

### track-header.tsx
- Tailwind default: 4 (`text-gray-900/700/500`, `hover:text-gray-900`) · Radii: bare `rounded` · `focus:ring-gray-900` hard-coded

### media-toggle.tsx
- Tailwind default: 10+ (`bg-gray-100/800`, `bg-white`, `text-gray-900/600/300`, `border-gray-200/700`, full `dark:` pairs) · Radii: `rounded-lg`, `rounded-md` · Shadows: `shadow-sm` on active tab

### track-actions.tsx
- Tailwind default: 1 (`hover:bg-gray-100` passed into `SaveButton`/`LikeButton`) · Anomaly: leaks styling across primitive boundary via `className`

### youtube-embed-slot.tsx
- Tailwind default: 1 (`bg-black`) · Radii: `rounded-lg`

### lyrics-display.tsx
- Ramped: 4 (`text-primary-700`, `border-primary-600`, `focus-visible:ring-primary-600` ×2) · Tailwind default: 5 (`text-neutral-900/800/700/500/200`, `border-neutral-200`)
- Anomaly: **only file mixing `neutral-*` (here) with `gray-*` (every other file in subtree)** — palette inconsistency to unify in 2.2
- Subfile literals: `text-[1.125rem]`, `leading-[1.8]`, `leading-[2.0]` — scoped typography escape hatches for Arabic/Urdu

## Forms — auth + contribute (Pass 06)

### auth-page-shell.tsx
- Semantic: 0 · Ramped: 2 (`bg-gray-50`, `dark:bg-gray-950`) · Literal: 0

### check-email-card.tsx
- Ramped: 9 (`bg-white`, `ring-gray-900/5`, `bg-gray-100`, `text-gray-700/900/600/500`, `text-red-600`) · Radii: `rounded-lg`, `rounded-full` · Shadows: `shadow-sm` + ring

### forgot-password-form.tsx
- Ramped: ~10 (same auth card pattern) · Radii: `rounded-lg`, `rounded-full` · Shadows: `shadow-sm` + ring

### login-form.tsx
- Inherits Card surface via `<Card>` · Ramped: ~6 (`text-gray-900/700/600`, `bg-red-50`, `text-red-700`) · Radii: `rounded-md` (error pill) · Only auth form using `<Card>`

### register-form.tsx · reset-password-form.tsx
- Re-inline the same card surface: `rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5` (no `<Card>`)

### social-buttons.tsx
- Ramped: many (`border-gray-300`, `bg-white`, `text-gray-700`, `hover:bg-gray-50`, `focus:ring-gray-500`, `focus:ring-offset-2`, `border-gray-200`, `text-gray-500`)
- **Literal brand hex fills** in SVG logos: `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`, `#1877F2`, `#F25022`, `#7FBA00`, `#00A4EF`, `#FFB900` + `bg-black` on Apple button
- Radii: `rounded-md` ×3 + `rounded-full` (Apple) — inconsistency

### form-field.tsx (contribute)
- Semantic: 2 (`border-destructive`, `focus-visible:ring-destructive`) — **only file in sub-tree using semantic tokens**
- Ramped: 4 pairs (`text-gray-700 dark:text-gray-300`, `text-gray-400 dark:text-gray-500`, `text-red-600 dark:text-red-400`, `text-red-500` asterisk)

### reciter-form.tsx · album-form.tsx · track-form.tsx
- Semantic via `<Button>` + `<Input>` (transitively) · Direct classes: only `text-red-600 dark:text-red-400` (server error) + `space-y-5` stack

### contribution-list.tsx
- Ramped: many (`gray-*`, `blue-*`, `orange-*`) with full dark pairing

### resubmit-form.tsx
- Heavy orange usage (`bg-orange-600 hover:bg-orange-700 ring-orange-600` etc.); full dark pairs
- Radii: `rounded-lg`, `rounded-md`
- Inline submit/cancel buttons fully hand-rolled

**Top-level form observations:** Four auth files repeat exactly `rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5` — the "card without `<Card>`" pattern.

## Lists — library + search + mod (Pass 07)

| File | Sem | Ramp | TW | Lit | Radii | Shadows |
|---|---|---|---|---|---|---|
| `library/library-tracks-list.tsx` | 0 | 0 | ~18 (`gray-*`, `bg-gray-900`, `divide-gray-100`) | 0 | `rounded-full`, `rounded-lg` | none |
| `search/search-bar.tsx` | 0 | 0 | ~20 (`bg-gray-50`, `text-gray-400`, `bg-yellow-100` mark) | 0 | `rounded-md` | `shadow-lg` dropdown |
| `search/mobile-search-overlay.tsx` | 0 | 0 | ~22 (`bg-white`, `text-gray-400`, `bg-yellow-100`) | 0 | `rounded` | none |
| `search/search-results-content.tsx` | 0 | 0 | ~35 (`text-gray-900`, `bg-gray-100`, `border-gray-900`) | 0 | `rounded-lg`, `rounded-full`, `rounded-md` | none |
| `mod/apply-button.tsx` | 0 | 0 | `bg-green-100 text-green-800`, `bg-blue-600 hover:bg-blue-700`, `text-red-600` | 0 | `rounded-md` | none |
| `mod/badges.tsx` | 0 | 0 | **9 hardcoded hue ramps × light+dark pairs** (blue/purple/green/emerald/amber/gray/yellow/red/orange) | 0 | `rounded-full` | none |
| `mod/field-diff.tsx` | 0 | 0 | ~12 (`bg-red-50 text-red-800`, `bg-green-50`, `bg-green-200 text-green-900`) | 0 | `rounded` | none |
| `mod/load-more-audit.tsx` | 0 | 0 | ~10 | 0 | `rounded-md` | none |
| `mod/load-more-queue.tsx` | 0 | 0 | ~8 | 0 | `rounded-md` | none |
| `mod/load-more-users.tsx` | 0 | 0 | ~8 | 0 | `rounded-md` | none |
| `mod/review-actions.tsx` | 0 | 0 | **3 hardcoded status hues on buttons** (`bg-green-600`, `bg-orange-500`, `bg-red-600`) + matching `focus:ring-<hue>` | 0 | `rounded-md` | none |
| `mod/role-button.tsx` | 0 | 0 | ~10 | 0 | `rounded-md` | none |
| `mod/submission-row.tsx` | 0 | 0 | ~6 | 0 | — (Card wraps) | none |

Hot spot: `mod/badges.tsx`, `mod/review-actions.tsx`, `mod/apply-button.tsx`, `mod/field-diff.tsx` hardcode semantic hues (green/amber/yellow/orange/red/emerald/blue/purple) for status/diff/CTA meaning. **~40+ distinct colour-class occurrences** — single largest axis-1 cluster in the codebase.

## Utility — theme / ui / providers / settings (Pass 08)

| File | Semantic | Ramped | TW default | Literal |
|---|---|---|---|---|
| `theme/ThemeProvider.tsx` | — | — | — | — (no markup) |
| `theme/ThemeToggle.tsx` | 0 | 0 | ~12 (`gray-600/100/900/400/800/100`) | 0 |
| `providers/audio-provider.tsx` | — | — | — | — |
| `settings/change-email-form.tsx` | 0 | 0 | ~11 (`gray-*`, `red-50/700`, `green-50/700`) | 0 |
| `settings/change-password-form.tsx` | 0 | 0 | ~11 | 0 |
| `settings/delete-account-section.tsx` | 0 | 0 | ~18 (`red-600/700/50`, `gray-*`, `black/50`) | 0 |
| `settings/notifications-section.tsx` | 0 | 0 | 6 | 0 |
| `ui/arabic-text.tsx` | 0 | 0 | 1 (`text-neutral-800`) | 2 (`text-[1.125rem]`, `leading-[1.8]`) |
| `ui/urdu-text.tsx` | 0 | 0 | 1 | 2 (`text-[1.125rem]`, `leading-[2.0]`) |
| `ui/empty-state.tsx` | 0 | 0 | 6 (paired dark) | 0 |
| `ui/image.tsx` | 0 | 0 | 0 | 0 |
| `ui/skeleton.tsx` | 0 | 0 | 2 (`bg-gray-200 dark:bg-gray-700`) | 0 |
| `ui/album-card-skeleton.tsx` | 0 | 0 | 0 | 0 |
| `ui/reciter-card-skeleton.tsx` | 0 | 0 | 0 | 0 |
| `ui/track-list-skeleton.tsx` | 0 | 0 | 2 (`divide-gray-100`, `border-gray-200` — no dark) | 0 |

Notes: settings forms × 3 carry the biggest token debt (raw `gray-*`/`red-*`/`green-*` + zero dark coverage). Delete modal uses `shadow-xl`. Arabic/Urdu wrappers intentionally carry literal arbitrary values for tashkeel layout.

## Top-level — SaveButton / LikeButton (Pass 09)

### SaveButton.tsx · LikeButton.tsx
Identical profile across both files:
- Semantic: 0 · Ramped: 10 Tailwind-palette classes (`text-gray-900/600/400/700`, `text-white`, `dark:text-white/gray-300/600/400`, `focus:ring-gray-900`)
- Literals: 0
- Radii: `rounded` (bare — rest of codebase trends `rounded-md`/`rounded-lg`)
- Spacing anomaly: `h-auto w-auto` deliberately overrides `size="icon"`; shrinks hit target — see accessibility doc

## Hooks (Pass 10)

`use-listening-history.ts` · `use-search-autocomplete.ts` — N/A (no style output). Recorded once; no per-file findings.

## Client lib (Pass 11)

Six in-scope files (`audio-engine.ts`, `auth-client.ts`, `jsonld.ts`, `metadata.ts`, `social-providers.ts`, `logger/client.ts`) — N/A across the board; no className or style emissions. (Server-only `email.ts` hardcodes inline HTML-email hex colours — intentional, not a client concern.)
