# Phase 2.1e — Axis 4: Primitive-Replacement Backlog

Organised by target primitive so that Phase 2.3 (page redesign) can pick up a single-primitive sweep per sprint. Findings consolidated from 11 subtree audit passes.

## Summary — counts per primitive

| Primitive | High-confidence | Lower-confidence | Files already using |
|---|---|---|---|
| **Button** | 22 | 4 | 15 |
| **Card** | 12 | 6 | 8 |
| **Dialog** | 3 | 1 | 0 |
| **Sheet** | 2 | 0 | 0 |
| **Tabs** | 2 | 1 | 0 |
| **DropdownMenu** | 0 | 0 | 1 |
| **Tooltip** | ≥8 (wraps icon buttons) | 0 | 0 |
| **Input** | 7 | 0 | 10 |
| **Select** / **Combobox** | 3 | 2 | 0 |
| **Badge** | 2 (plus `mod/badges.tsx` wholesale) | 2 | 0 |
| **SectionTitle** | 4 | 2 | 1 |
| **Alert / Callout** (net-new) | 2 | 1 | 0 |
| **Textarea** (net-new) | 1 | 0 | 0 |
| **Checkbox** (net-new) | 1 | 0 | 0 |

---

## Button

### High-confidence

- `apps/web/app/error.tsx` — L56 and L63 (primary + secondary, inline `rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:ring-2`)
- `apps/web/app/not-found.tsx` — L46 and L52 (primary + secondary)
- `apps/web/app/(auth)/reset-password/page.tsx` — L55 (anchor styled as button) → `<Button asChild>`
- `apps/web/app/(auth)/verify-email/page.tsx` — L51 and L88 → `<Button asChild>`
- `apps/web/src/components/layout/header.tsx` — L69-75 sign-in link `<Button asChild><Link>`
- `apps/web/src/components/layout/mobile-nav.tsx` — hamburger trigger L48-78, Sign Out L113-119, Sign In L122-129
- `apps/web/app/mod/layout.tsx` — sidebar nav buttons (`rounded-md px-3 py-2 text-sm`) → `Button variant="ghost" asChild`
- `apps/web/src/components/player/PlayerBar.tsx` — 7 icon-only controls (shuffle / previous / play / next / queue / volume-cluster trigger / track-info expand) → `<Button variant="ghost" size="icon">` wrapped in `<Tooltip>`
- `apps/web/src/components/player/MobilePlayerOverlay.tsx` — chevron + X close affordances; shuffle/previous/play/next identical to PlayerBar
- `apps/web/src/components/player/QueuePanel.tsx` — close button + per-track move-up/move-down/remove → `<Button variant="ghost" size="icon">` + Tooltip
- `apps/web/src/components/player/track-detail-play-button.tsx` — inner 40×40 play button
- `apps/web/src/components/player/play-all-button.tsx` — whole primary button
- `apps/web/src/components/albums/album-header.tsx` — reciter-name `<Link>` → `<Button variant="link">` (focus ring + underline token unified)
- `apps/web/src/components/albums/track-list-item.tsx` — inline add-to-queue `<button>` L85-96 → `<Button variant="ghost" size="icon">`
- `apps/web/src/components/tracks/media-toggle.tsx` — bare `<button>` tab triggers
- `apps/web/src/components/tracks/lyrics-display.tsx` — tab triggers (same pattern)
- `apps/web/src/components/auth/check-email-card.tsx` — resend button L60 (could stay `<button>` or `<Button variant="link">`)
- `apps/web/src/components/contribute/contribution-list.tsx` — "Edit and resubmit" CTA L100 → `<Button variant="outline">`
- `apps/web/src/components/contribute/resubmit-form.tsx` — **six** hand-rolled buttons (per-type submit + cancel × reciter/album/track) with literal orange colours → `<Button>` + `<Button variant="ghost">`
- `apps/web/src/components/library/library-tracks-list.tsx` — "Browse Albums" empty-state CTA (currently `<Link>` styled as button) → `<Button asChild>`
- `apps/web/src/components/mod/apply-button.tsx` — CTA already wraps `<Button>` but passes bespoke `bg-blue-600 text-white hover:bg-blue-700`; should collapse to `variant="default"` once brand-red ships
- `apps/web/src/components/mod/load-more-audit.tsx` / `load-more-queue.tsx` / `load-more-users.tsx` — hand-rolled `rounded-md border border-gray-300 px-5 py-2 hover:bg-gray-100` → `<Button variant="outline">`
- `apps/web/src/components/mod/review-actions.tsx` — Approve (`bg-green-600`) / Request Changes (`bg-orange-500`) / Reject (`bg-red-600`) / Cancel buttons → variant="default"/variant="secondary"/variant="destructive"/variant="outline"
- `apps/web/src/components/settings/change-email-form.tsx` — raw submit button `bg-gray-900` → `<Button>`
- `apps/web/src/components/settings/change-password-form.tsx` — same
- `apps/web/src/components/settings/delete-account-section.tsx` — trigger, destructive submit, and cancel (3 buttons total)

### Lower-confidence

- `apps/web/app/contribute/page.tsx` — three `<Link>`-as-card tile grid + second-section CTA; `Card` doesn't currently cover the interactive-link pattern
- `apps/web/src/components/contribute/contribution-list.tsx` — the disclosure button L58 is arguably a disclosure pattern; `<button aria-expanded>` may be correct as-is
- `apps/web/src/components/auth/social-buttons.tsx` — four provider buttons with per-provider brand chrome (Apple pill, Google outlined white); would need a `variant="social"` case or custom composition
- `apps/web/src/components/SaveButton.tsx` · `LikeButton.tsx` — both already `Uses`; **caveat:** stack custom `transition-all` + `focus:ring-*` that overrides the primitive's built-ins (the ghost variant already emits a transition). Consider dropping the extra `transition-all` and replacing `focus:ring-gray-900` with the primitive's `focus-visible:ring-ring`.

## Card

### High-confidence

- `apps/web/app/(auth)/reset-password/page.tsx` — L27 wrapper `rounded-lg bg-white px-8 py-10 shadow-sm ring-1`
- `apps/web/app/(auth)/verify-email/page.tsx` — L23 and L68 (two copies of the same pattern)
- `apps/web/app/(protected)/profile/page.tsx` — L69 (profile section), L97 + L110 (stats), L144 (recent-history list wrapper); all match `rounded-xl border bg-white shadow-sm` / `rounded-lg border bg-white`
- `apps/web/app/(protected)/settings/page.tsx` — L34 outer `rounded-lg border bg-white` wrapper
- `apps/web/app/mod/page.tsx` — L46 stat card + L78 activity list
- `apps/web/app/mod/audit/page.tsx` / `queue/page.tsx` / `users/page.tsx` — wrappers around tables/lists (audit L41, queue L42 empty-state, users L46)
- `apps/web/app/mod/submissions/[id]/page.tsx` — L106 notes box + L118 fields section
- `apps/web/src/components/albums/album-header.tsx` — artwork tile (hand-rolled) → `<Card>` with `p-0`
- `apps/web/src/components/albums/track-list.tsx` — outer `<ol>` with `divide-y divide-gray-100 rounded-lg border border-gray-200` is exactly the `<Card>` surface shape; matches `popular-tracks.tsx`'s pattern
- `apps/web/src/components/player/track-detail-play-button.tsx` — outer wrapper `rounded-lg border` → `<Card>`
- `apps/web/src/components/auth/check-email-card.tsx` — re-inlines `rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5`
- `apps/web/src/components/auth/forgot-password-form.tsx` — same re-inlined card (in both success + form states)
- `apps/web/src/components/auth/register-form.tsx` — same re-inlined card
- `apps/web/src/components/auth/reset-password-form.tsx` — same re-inlined card

### Lower-confidence

- `apps/web/app/contribute/layout.tsx` — L44 blue-tinted info tile; could use `Card` with a `variant="info"` if extended; borderline
- `apps/web/app/contribute/page.tsx` — three tile-grid cards at L38-44 and CTA L53 (`<Link>`-as-card — `Card` doesn't currently cover interactive link pattern)
- `apps/web/src/components/cards/reciter-card.tsx` — outer is `<Link>` for focus ring (intentional); a `<Card>` as **inner** wrapper would unify surface/radius/shadow tokens
- `apps/web/src/components/cards/album-card.tsx` — same pattern; artwork tile `rounded-lg bg-gray-100 dark:bg-gray-800` is a card surface
- `apps/web/src/components/albums/album-grid.tsx` — `AlbumListCard` is a near-duplicate of `cards/album-card.tsx` (see `dead-code.md`); same outer `<Link>` + inner `<Card>` pattern applies
- `apps/web/src/components/player/PlayerBar.tsx` — whole `aria-region` bar could be a `Card`-less surface; low priority

## Dialog

### High-confidence

- `apps/web/src/components/player/MobilePlayerOverlay.tsx` — **strong Dialog candidate** (current hand-rolled `role="dialog" aria-modal="true"` + focus management + Escape wiring); shadcn Dialog matches the focus-trap already implemented locally
- `apps/web/src/components/search/mobile-search-overlay.tsx` — hand-rolled full-screen `role="dialog" aria-modal="true"` + focus-trap + Escape. Classic Dialog territory
- `apps/web/src/components/settings/delete-account-section.tsx` — hand-rolled destructive confirm modal (current `role="dialog"` markup with **no focus trap, no Escape, no focus return**); strong candidate

### Lower-confidence

- `apps/web/app/mod/submissions/[id]/page.tsx` / other confirm flows — no inline dialog yet, but replacing inline review sections with Dialog could unify affordance

## Sheet

### High-confidence

- `apps/web/src/components/layout/mobile-nav.tsx` — entire drawer (open/close state, Escape handling L32-37, backdrop-less absolute panel) reimplements Sheet; legacy used Vuetify `v-navigation-drawer`, Sheet (Radix Dialog-backed) is the correct parity pick
- `apps/web/src/components/player/QueuePanel.tsx` — `role="dialog"` + backdrop + right-side slide is a strong Sheet candidate (`side="right"`) — would replace ~40 lines of hand-rolled focus-trap + backdrop (L103-156)
- `apps/web/src/components/player/MobilePlayerOverlay.tsx` — also a Sheet candidate (`side="bottom"` matches the swipe-up mobile pattern); Dialog vs Sheet is a judgement call — either works

## Tabs

### High-confidence

- `apps/web/src/components/tracks/media-toggle.tsx` — manual `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected` / `aria-controls`; strongest Tabs candidate in the Track subtree
- `apps/web/src/components/tracks/lyrics-display.tsx` — second manual tablist/tab/tabpanel in the same subtree (AR/UR/EN/Romanized); consolidating MediaToggle + LyricsDisplay onto one Tabs primitive is the highest-value primitive extraction in the Track surface

### Lower-confidence

- `apps/web/src/components/search/search-results-content.tsx` — uses `role="tablist"` + `role="tab"` on `<Link>` elements (URL-driven tabs). If tabs are kept URL-driven we may want a `NavTabs` variant; alternatively simplify to `<nav>` of links

## DropdownMenu

No replacement opportunities — already fully adopted.

### Files already consuming

- `apps/web/src/components/layout/user-menu.tsx` — uses DropdownMenu / Trigger / Content / Item / Separator correctly

## Tooltip

All the icon-only buttons flagged under `Button > High-confidence` need a `<Tooltip>` wrapper to surface the `aria-label` text. Concretely:

- `apps/web/src/components/player/PlayerBar.tsx` — 7 controls
- `apps/web/src/components/player/MobilePlayerOverlay.tsx` — close controls + transport
- `apps/web/src/components/player/QueuePanel.tsx` — close + per-track move/remove

## Input

### High-confidence

- `apps/web/src/components/settings/change-email-form.tsx` — raw `<input type="email">` → `<Input>`
- `apps/web/src/components/settings/change-password-form.tsx` — two raw password inputs
- `apps/web/src/components/settings/delete-account-section.tsx` — raw password `<input>`

### Files already consuming

- All auth forms (login-form, register-form, reset-password-form, forgot-password-form)
- All contribute forms via `form-field.tsx` wrapper (transitively ~31 consumer call sites)

### Notes

No bare `<input>`s found in `auth/` or `contribute/` subtrees outside the primitive pipeline. `<Input type="url">`, `<Input type="number">`, `<Input type="email">`, `<Input type="password">` all routed through the primitive.

## Select / Combobox

### High-confidence

- `apps/web/src/components/contribute/album-form.tsx` — `reciterId` as raw UUID `<Input type="text">` → `<Select>` / typeahead `<Combobox>`
- `apps/web/src/components/contribute/track-form.tsx` — `albumId` same pattern
- `apps/web/src/components/mod/role-button.tsx` — native `<select>` with manual Tailwind styling → shadcn Select primitive (not yet shipped; long-term home)

### Lower-confidence

- `apps/web/src/components/search/search-bar.tsx` — inline autocomplete with listbox + option ARIA is a Combobox reinvention. Per task brief: keep unless Combobox ships
- `apps/web/src/components/search/mobile-search-overlay.tsx` — same inner Combobox pattern

## Badge

### High-confidence

- `apps/web/src/components/mod/badges.tsx` — **Primary Phase 2.2 target**. All 4 exports (`SubmissionTypeBadge`, `SubmissionActionBadge`, `SubmissionStatusBadge`, `RoleBadge`) are hand-rolled pills. Status maps become variant selections (`variant="success"` / `"warning"` / `"destructive"` / `"info"`)
- `apps/web/src/components/mod/apply-button.tsx` — applied badge (`bg-green-100 text-green-800`) → `<Badge variant="success">`

### Lower-confidence

- `apps/web/src/components/player/PlayerBar.tsx` — `aria-pressed` active state on shuffle/queue currently encoded via text-colour swap; could use Badge-style chip
- `apps/web/src/components/player/QueuePanel.tsx` — `t('trackCount')` chip in header L216-218 (small count bubble)
- `apps/web/src/components/search/search-results-content.tsx` — tab count badges (hand-rolled pills)

## SectionTitle

Primitive exists at `packages/ui/src/components/section-title.tsx`.

### High-confidence

- `apps/web/src/components/home/featured-reciters.tsx` — raw `<h2>` section header
- `apps/web/src/components/home/recent-albums.tsx` — same
- `apps/web/src/components/home/popular-tracks.tsx` — already uses `<Card>`; could additionally use `<SectionTitle>`
- `apps/web/src/components/reciters/reciter-discography.tsx` — raw `<h2>` section header
- `apps/web/src/components/tracks/lyrics-display.tsx` — `<h2 id="lyrics-heading">Lyrics`
- `apps/web/src/components/tracks/track-header.tsx` — `h1` + meta row (repeated shape across Reciter/Album/Track pages; strong candidate for a dedicated `PageHeader` primitive built on `SectionTitle`)

### Lower-confidence

- Album + Reciter headers (Axis 6 is the stronger driver — they have bigger legacy-parity gaps than a simple `SectionTitle` swap can solve)

## Alert / Callout (net-new primitive opportunity)

### High-confidence

- `apps/web/src/components/auth/login-form.tsx` and `register-form.tsx` — repeated `bg-red-50 text-red-700 rounded-md px-3 py-2` error block
- `apps/web/src/components/contribute/contribution-list.tsx` — `bg-blue-50` moderator-notes block

### Lower-confidence

- `apps/web/app/contribute/layout.tsx` — blue info-card L44

## Textarea (net-new)

- `apps/web/src/components/mod/review-actions.tsx` — hand-rolled `<textarea>` → shadcn Textarea primitive if shipped

## Checkbox (net-new)

- `apps/web/src/components/settings/notifications-section.tsx` — two raw `<input type="checkbox">` → `<Checkbox>` if primitive ships

## Files already consuming primitives

Completeness check — files that correctly use `@nawhas/ui` primitives today. These should serve as reference patterns.

**`<Button>`:**
- `apps/web/src/components/SaveButton.tsx` — correct usage caveats listed above
- `apps/web/src/components/LikeButton.tsx` — same
- `apps/web/src/components/auth/login-form.tsx` · `register-form.tsx` · `reset-password-form.tsx` · `forgot-password-form.tsx`
- `apps/web/src/components/contribute/reciter-form.tsx` · `album-form.tsx` · `track-form.tsx`
- `apps/web/src/components/library/library-tracks-list.tsx` (Play All)
- `apps/web/src/components/ui/empty-state.tsx` (`<Button asChild>`)
- `apps/web/src/components/mod/apply-button.tsx` (wraps primitive but overrides variant)

**`<Card>`:**
- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/components/home/popular-tracks.tsx`
- `apps/web/src/components/mod/load-more-queue.tsx`
- `apps/web/src/components/mod/submission-row.tsx`

**`<Input>`:**
- All auth form files (4)
- `apps/web/src/components/contribute/form-field.tsx` (wrapper; propagates to ~31 contribute call sites)

**`<DropdownMenu>`:**
- `apps/web/src/components/layout/user-menu.tsx`

**`<SectionTitle>`:**
- Not yet consumed anywhere in `apps/web/src/` despite being shipped (opportunity above)

**`<Dialog>` / `<Sheet>` / `<Tabs>` / `<Tooltip>` / `<Badge>` / `<Select>`:**
- Not yet consumed anywhere in `apps/web/src/`. Entire Phase 2.3 sweep.
