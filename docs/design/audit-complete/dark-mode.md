# Phase 2.1e — Axis 2: Dark-mode Handling

Organised by status bucket (Good / Mixed / Broken / Not applicable) so that "show me the broken files" is a single read. Findings consolidated from 11 subtree audit passes.

## Summary

| Bucket | Count |
|---|---|
| **Good** — semantic tokens or full `dark:` pair coverage | ~24 files |
| **Mixed** — dark pairs present but on raw gray ramp, or one-off gaps (focus ring, single surface) | ~27 files |
| **Broken** — no `dark:` variants at all, or a high-traffic surface missing pairs | ~20 files |
| **Not applicable** — no colour classes, pure logic/layout, or delegates fully to children | ~56 files |

The auth subtree is dark-mode-broken almost wholesale (6 of 7 auth components have zero dark variants). Library + Search (4 files) and the three settings forms are **completely light-locked**. The `mod/` subtree is dark-mode-ready except where CTA buttons rely on solid-colour contrast. Everything that already uses the `<Card>` / `<Button>` / `<Input>` primitives inherits correct dark behaviour.

## Priority fix list — Broken files on high-traffic routes

These are the user-visible dark-mode regressions (ordered by estimated traffic):

1. **Track page (`/reciters/[slug]/albums/[slug]/tracks/[slug]`):**
   - `tracks/track-header.tsx` — title + meta row will be invisible on dark
   - `tracks/lyrics-display.tsx` — tabs, labels, and all language panels (AR/UR/EN/romanized) light-only
   - `tracks/track-actions.tsx` — hover style `hover:bg-gray-100` leaked across primitive boundary with no dark counterpart
   - `player/track-play-button.tsx` · `player/track-detail-play-button.tsx` · `player/play-all-button.tsx` — all three buttons zero dark variants
2. **Search (`/search` + header `SearchBar`):**
   - `search/search-bar.tsx`, `search/mobile-search-overlay.tsx`, `search/search-results-content.tsx` — every list/filter surface light-locked (35+ colour classes, none dark-aware)
3. **Library (`/library/tracks`):**
   - `library/library-tracks-list.tsx` — zero `dark:` variants on buttons, rows, empty state
4. **Home (`/`):**
   - `albums/album-grid.tsx` (`AlbumListCard` local component) — all `bg-gray-100 text-gray-900/700/600/500/400` unpaired; will render as a white card on the dark `/albums` listing
   - `albums/track-list.tsx` outer container — border, divider, heading text have no dark counterparts
5. **Auth (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/check-email`):**
   - `auth/check-email-card.tsx` · `auth/forgot-password-form.tsx` · `auth/register-form.tsx` · `auth/reset-password-form.tsx` · `auth/social-buttons.tsx` — all broken (card surface + typography + divider + provider pills light-only)
   - `app/(auth)/verify-email/page.tsx` — success card branch has no `dark:bg-*` override (error card is Mixed)
   - `auth/login-form.tsx` — Mixed (Card handles surface, but `text-gray-900/700/600` + `bg-red-50 text-red-700` error pill unreadable on dark)
6. **Settings (`/profile/settings`):**
   - `settings/change-email-form.tsx` · `settings/change-password-form.tsx` · `settings/delete-account-section.tsx` · `settings/notifications-section.tsx` — all four forms + destructive modal are completely light-only
7. **Global chrome:**
   - `contribute/page.tsx` — card tiles have `dark:bg-gray-800` but `border-gray-400` hover has no dark partner

---

## Good

Files where dark mode works correctly today — either via semantic tokens, full pair coverage, or because colour is delegated to a primitive.

- `apps/web/app/layout.tsx` — N/A↔Good boundary; structural only
- `apps/web/app/(protected)/layout.tsx` — Logic only
- `apps/web/src/components/layout/page-layout.tsx` — Structural
- `apps/web/src/components/layout/container.tsx` — Layout only
- `apps/web/src/components/cards/reciter-card.tsx` — every `bg-*`/`text-*` paired
- `apps/web/src/components/cards/album-card.tsx` — artwork placeholder + metadata paired
- `apps/web/src/components/home/featured-reciters.tsx` — only `<h2>` colour, dual-variant
- `apps/web/src/components/home/recent-albums.tsx` — same
- `apps/web/src/components/home/popular-tracks.tsx` — `<Card>` primitive + divide + text paired
- `apps/web/src/components/albums/album-header.tsx` — every colour utility paired
- `apps/web/src/components/albums/track-list-item.tsx` — ~16 classes all with `dark:` pair
- `apps/web/src/components/reciters/reciter-header.tsx` — avatar + name + count paired
- `apps/web/src/components/reciters/reciter-discography.tsx` — heading + empty-state paired
- `apps/web/src/components/tracks/media-toggle.tsx` — full `dark:` pair coverage on gray ramp (only Track-surface file that pairs)
- `apps/web/src/components/auth/auth-page-shell.tsx` — `bg-gray-50 dark:bg-gray-950` paired
- `apps/web/src/components/contribute/form-field.tsx` — every ramped class has a `dark:` counterpart (plus semantic `destructive`)
- `apps/web/src/components/contribute/reciter-form.tsx` · `album-form.tsx` · `track-form.tsx` — delegate surface to parent; own only `text-red-600 dark:text-red-400`
- `apps/web/src/components/contribute/contribution-list.tsx` — dark variants on every colour class incl. hover states
- `apps/web/src/components/contribute/resubmit-form.tsx` — orange-tinted panel fully paired
- `apps/web/src/components/mod/badges.tsx` — every entry in `TYPE_CLASSES` / `ACTION_CLASSES` / `STATUS_CLASSES` / `ROLE_CLASSES` pairs light+dark
- `apps/web/src/components/mod/field-diff.tsx` — `dark:bg-red-950`, `dark:bg-green-950`, etc. throughout
- `apps/web/src/components/mod/load-more-audit.tsx` · `load-more-queue.tsx` · `load-more-users.tsx` — dark hovers/borders on buttons + Card wrap
- `apps/web/src/components/mod/role-button.tsx` — `dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200`
- `apps/web/src/components/mod/submission-row.tsx` — `dark:text-white/gray-500/hover:bg-gray-700`
- `apps/web/src/components/theme/ThemeToggle.tsx` — hover pairs present (resting state falls through but is readable)
- `apps/web/src/components/ui/empty-state.tsx` — every colour paired
- `apps/web/src/components/ui/skeleton.tsx` — `bg-gray-200 dark:bg-gray-700`

## Mixed

Dark pairs present but applied on the raw `gray-*` ramp rather than semantic tokens, or with a specific one-off gap (focus ring, single element).

- `apps/web/app/error.tsx` — has `dark:` pairs for text+bg but `bg-red-50 / text-red-300` error badge has no dark variant
- `apps/web/app/not-found.tsx` — all paired except `focus:ring-gray-900` (shared)
- `apps/web/app/(auth)/reset-password/page.tsx` — error card ring/text paired; `bg-red-100 + text-red-600` icon tile has no dark counterpart
- `apps/web/app/(protected)/history/page.tsx` · `library/tracks/page.tsx` — headers paired; rest delegated
- `apps/web/app/(protected)/profile/contributions/page.tsx` — title + link paired
- `apps/web/app/(protected)/profile/page.tsx` · `settings/page.tsx` — each card has `dark:` pairs; consistent
- `apps/web/app/albums/page.tsx` · `reciters/page.tsx` — h1 paired; rest delegated
- `apps/web/app/albums/loading.tsx` · `albums/[slug]/loading.tsx` · `reciters/loading.tsx` · `reciters/[slug]/loading.tsx` · `tracks/[trackSlug]/loading.tsx` — all `bg-gray-200` skeleton fills paired with `dark:bg-gray-700/800`
- `apps/web/app/contribute/layout.tsx` — all pairs present; heavy reliance on `text-blue-*` for the info card
- `apps/web/app/mod/layout.tsx` — sidebar `bg-gray-50 dark:bg-gray-900` paired; `ring-gray-400` focus has no dark partner
- `apps/web/app/mod/page.tsx` · `audit/page.tsx` · `queue/page.tsx` · `submissions/[id]/page.tsx` · `users/page.tsx` — comprehensive `dark:` pairing but raw `gray-*`/`white` rather than semantic tokens
- `apps/web/app/search/page.tsx` — h1 + italic span paired
- `apps/web/src/components/layout/header.tsx` — raw gray ramp with `dark:*`; sign-in pill L71 has no `dark:` (same `bg-gray-900` both modes)
- `apps/web/src/components/layout/nav-links.tsx` — consistent pairs but `focus:ring-gray-900` L37 has no `dark:` counterpart (near-invisible ring)
- `apps/web/src/components/layout/mobile-nav.tsx` — paired throughout; sign-in link L125 lacks dark override; hamburger focus ring lacks dark
- `apps/web/src/components/layout/user-menu.tsx` — avatar `bg-gray-900 text-white` L51 has no dark variant
- `apps/web/src/components/player/PlayerBar.tsx` · `MobilePlayerOverlay.tsx` · `QueuePanel.tsx` — full `dark:` pair coverage on gray ramp; zero semantic tokens (scrim `bg-black/30` unpaired, acceptable)
- `apps/web/src/components/auth/login-form.tsx` — `<Card>` handles surface, but `text-gray-900/700/600` + `bg-red-50 text-red-700` error pill unreadable on dark
- `apps/web/src/components/mod/apply-button.tsx` — dark variants on applied badge + error text; primary CTA `bg-blue-600 hover:bg-blue-700` has no dark adjustment
- `apps/web/src/components/mod/review-actions.tsx` — dark variants on textarea/cancel/labels/errors; Approve/Request-Changes/Reject solid buttons have no dark variants (relying on white-on-green/orange/red contrast)
- `apps/web/src/components/ui/arabic-text.tsx` · `urdu-text.tsx` — `text-neutral-800` has no dark counterpart — Arabic/Urdu text nearly-black on dark background
- `apps/web/src/components/ui/track-list-skeleton.tsx` — `divide-gray-100`, `border-gray-200` unpaired — borders disappear on dark
- `apps/web/src/components/SaveButton.tsx` · `LikeButton.tsx` — all colour pairs present but `focus:ring-gray-900` has no `dark:` counterpart (invisible keyboard focus on dark surfaces)

## Broken

Files with no `dark:` variants at all, or high-traffic surfaces missing critical pairs.

- `apps/web/app/(auth)/verify-email/page.tsx` — success card (L68) is `bg-white` with no `dark:bg-*` override; error card is Mixed; `bg-red-100`/`bg-green-100` icon tiles have no dark variant
- `apps/web/app/contribute/page.tsx` — card tiles at L39 have `dark:bg-gray-800` but `border-gray-400` hover has no dark partner; second section card L55 same
- `apps/web/src/components/player/track-play-button.tsx` — zero `dark:` variants; light-gray text on a dark row fails parity with surrounding track-list
- `apps/web/src/components/player/track-detail-play-button.tsx` — zero `dark:` variants; bright card on a dark page
- `apps/web/src/components/player/play-all-button.tsx` — zero `dark:` variants
- `apps/web/src/components/albums/track-list.tsx` — `border-gray-200`, `text-gray-900`, `divide-gray-100`, `text-gray-500` unpaired (L20/L25/L29); outer border + heading stay light-grey
- `apps/web/src/components/albums/album-grid.tsx` — entire `AlbumListCard` (L20–79) has zero `dark:` classes; all gray ramp unpaired
- `apps/web/src/components/tracks/track-header.tsx` — `text-gray-900/700/500` with zero `dark:` variants
- `apps/web/src/components/tracks/lyrics-display.tsx` — tabs + labels + `text-primary-700` + `border-neutral-200` + body blocks with no `dark:` variants
- `apps/web/src/components/tracks/track-actions.tsx` — `hover:bg-gray-100` hardcoded without dark pair
- `apps/web/src/components/auth/check-email-card.tsx` — card surface + typography all zero `dark:` variants
- `apps/web/src/components/auth/forgot-password-form.tsx` — same; broken in both success and form states
- `apps/web/src/components/auth/register-form.tsx` — re-inlines card surface without `<Card>`; zero dark variants
- `apps/web/src/components/auth/reset-password-form.tsx` — same
- `apps/web/src/components/auth/social-buttons.tsx` — divider, "or continue with" label, every provider button (`bg-white border-gray-300 text-gray-700 hover:bg-gray-50`) unpaired
- `apps/web/src/components/library/library-tracks-list.tsx` — zero `dark:` variants throughout (buttons, rows, empty state)
- `apps/web/src/components/search/search-bar.tsx` — no `dark:` variants; dropdown/input/highlight bar light-locked
- `apps/web/src/components/search/mobile-search-overlay.tsx` — no `dark:` variants; overlay `bg-white` with light-only text
- `apps/web/src/components/search/search-results-content.tsx` — 35+ colour classes, none dark-aware; tabs/cards/pagination/empty state all light-only
- `apps/web/src/components/settings/change-email-form.tsx` — zero `dark:` classes; labels/inputs/button/alerts all light-only
- `apps/web/src/components/settings/change-password-form.tsx` — same
- `apps/web/src/components/settings/delete-account-section.tsx` — modal `bg-white` + body text in `text-gray-*` without dark; destructive button surrounded by light-locked surfaces; cancel hover `hover:bg-gray-100` no dark pair
- `apps/web/src/components/settings/notifications-section.tsx` — disabled checkboxes/labels/heading zero dark coverage

## Not applicable

Files without colour classes (logic, data, hooks, lib utilities, providers, structural wrappers, skeletons that inherit from `<Skeleton>`).

Includes: `apps/web/app/page.tsx`, `login/page.tsx`, `check-email/page.tsx`, `(auth)/layout.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `(protected)/layout.tsx`, `albums/[slug]/page.tsx`, `reciters/[slug]/page.tsx`, `tracks/[trackSlug]/page.tsx`, all contribute `new`/`edit` subroutes (delegate to forms), `search/error.tsx`, `sitemap.ts`, `robots.ts`, `PlayerBarLazy.tsx`, `PlayerBarSpacer.tsx`, `PlayerPanels.tsx`, `providers/audio-provider.tsx`, `theme/ThemeProvider.tsx`, `ui/image.tsx`, `ui/album-card-skeleton.tsx`, `ui/reciter-card-skeleton.tsx`, `youtube-embed-slot.tsx` (iframe mode-agnostic), `reciters/reciter-grid.tsx`, both files under `hooks/`, all six in-scope `lib/` files.
