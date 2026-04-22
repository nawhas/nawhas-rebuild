# Phase 2.1e — Axis 5: Accessibility

Organised by severity so that "what do we fix first?" is a single read. Findings consolidated from 11 subtree audit passes.

## Summary

| Severity | Count |
|---|---|
| **Critical** | 4 |
| **Important** | ~30 |
| **Nice-to-have** | ~20 |

The most urgent cluster is focus management on hand-rolled modals (MobilePlayerOverlay has no focus trap despite `aria-modal="true"`; DeleteAccount modal has no trap / no Escape / no focus return) and the wide population of hard-coded English `aria-label` strings on transport buttons (play-all, save, like, track-detail-play, track-play). The Tabs primitive ships with proper keyboard nav; two Track-surface components and one Search component currently hand-roll tablist semantics and miss the Left/Right arrow affordance.

---

## Critical

- **`apps/web/src/components/player/MobilePlayerOverlay.tsx`** — `role="dialog" aria-modal="true"` present, but **no focus trap**. Tab escapes to the underlying page (PlayerBar controls remain focusable behind the overlay). The `aria-modal` promise is violated.
- **`apps/web/src/components/player/play-all-button.tsx`** — **no `aria-label`**; accessible name is solely visible hard-coded English `"Play All"` (L37). Non-English locales hear English. Also no `aria-busy` during state transition.
- **`apps/web/src/components/settings/delete-account-section.tsx`** — modal has `role="dialog" + aria-modal + aria-labelledby` but **no focus trap, no Escape-key handler, no focus return to trigger on close, no `inert` on background**. Destructive flow; `aria-describedby` not wired to description `<p>`.
- **`apps/web/src/components/search/search-results-content.tsx`** — tab strip uses `role="tablist"` + `role="tab"` on `<Link>` elements, but **no `role="tabpanel"`** wraps the results grid and the panel is not associated via `aria-controls`. Screen readers announce "tab" but lose the panel relationship. Either drop tab ARIA (treat as `<nav>` of links) or complete the pattern.

## Important

- **`apps/web/app/(auth)/reset-password/page.tsx:55`** — `<a href>` styled as primary button missing visible focus-ring consistency with real buttons; use `<Button asChild>`.
- **`apps/web/app/(auth)/verify-email/page.tsx:51,88`** — same `<Link>`-as-button pattern; use `<Button asChild>` or provide matching `focus-visible` ring.
- **`apps/web/app/(protected)/history/page.tsx:49` + `library/tracks/page.tsx:49`** — both use `<main id="main-content">` and so does the layout's `PageLayout`; risk of duplicate `main` landmarks. Confirm `PageLayout` wraps with something other than `<main>` or drop the nested one here.
- **`apps/web/app/(auth)/verify-email/page.tsx`** — success card L68 only `bg-white` with no `dark:` override; dark-mode users see a white card on a dark page.
- **`apps/web/app/contribute/page.tsx:36`** — tile grid `<Link>` uses `focus:ring-gray-400` instead of `focus-visible:ring-*`; focus ring appears on mouse click. Prefer `focus-visible`.
- **`apps/web/src/components/layout/mobile-nav.tsx:81-87`** — Custom dropdown uses `role="navigation"` but has no focus trap and no auto-focus of first link on open; Escape handler only restores focus to trigger. Without a focus trap, Tab escapes into the underlying page while the menu is visible.
- **`apps/web/src/components/layout/mobile-nav.tsx:80-87`** — Menu is conditionally mounted; no `aria-hidden`/exit transition; screen readers lose context.
- **`apps/web/src/components/layout/mobile-nav.tsx:47`** — Outer wrapper `md:hidden` hides the menu on ≥md using CSS but leaves the node in DOM and focusable on desktop keyboards if `open===true` at breakpoint change.
- **`apps/web/src/components/layout/nav-links.tsx:37`** — `focus:ring-gray-900` ring invisible in dark mode (no `dark:focus:ring-white`).
- **`apps/web/src/components/player/PlayerBar.tsx`** — time display `aria-live="off"` (L340) is intentional anti-spam but leaves no alternative announcement surface; sighted-SR user gets no seek feedback beyond the range input value. Consider an off-screen `aria-live="polite"` firing on coarse-grained position changes (~5s).
- **`apps/web/src/components/player/PlayerBar.tsx`** — keyboard shortcut handler (Space / ←/→) is a global window listener; bails on input/textarea/contentEditable but **not** `role="textbox"` elements and not `aria-expanded` dropdowns.
- **`apps/web/src/components/player/PlayerBar.tsx`** — Track-info button's accessible name uses `t('openFullPlayer', { trackTitle })` — good — but on `md+` the button is `cursor-default` (L250) yet still interactive; keyboard users activate it and see nothing happen.
- **`apps/web/src/components/player/MobilePlayerOverlay.tsx`** — two buttons (chevron-down + X) both invoke `closeMobileOverlay` with different `aria-label`s; SR users hear two "close-ish" affordances side by side.
- **`apps/web/src/components/player/QueuePanel.tsx`** — keyboard reorder buttons inside an `opacity-0 group-hover:opacity-100 focus-within:opacity-100` wrapper — keyboard users only see them after tabbing in; discoverability low.
- **`apps/web/src/components/player/QueuePanel.tsx`** — drag-and-drop pattern is mouse-only; keyboard users fall back to up/down arrow buttons. Not parity with native `role="listbox" aria-grabbed`.
- **`apps/web/src/components/player/track-play-button.tsx`** — `aria-label` hard-coded English `` `Pause ${track.title}` `` / `` `Play ${track.title}` `` (L67); should use `useTranslations`.
- **`apps/web/src/components/player/track-play-button.tsx`** — hover-swap hidden/shown via `group-hover:hidden`/`group-hover:block`; keyboard focus state doesn't trigger the swap (icon never appears when Tab-focused). Consider `group-focus-within:` counterparts.
- **`apps/web/src/components/player/track-detail-play-button.tsx`** — `aria-label` hard-coded English (L75-77); same i18n gap.
- **`apps/web/src/components/albums/track-list-item.tsx`** — row is not whole-clickable; clicking empty space does nothing despite visual hover highlight. Legacy treated row as clickable.
- **`apps/web/src/components/albums/track-list-item.tsx`** — dot indicator uses `aria-label` on a `<span>`; should be `role="img"` or `sr-only` text.
- **`apps/web/src/components/tracks/media-toggle.tsx`** — **no keyboard arrow-key nav between Listen/Watch tabs** (WAI-ARIA APG). Tab works but moves focus off the tablist.
- **`apps/web/src/components/tracks/lyrics-display.tsx`** — same APG gap with 4 tabs (AR/UR/EN/Romanized); more noticeable.
- **`apps/web/src/components/tracks/lyrics-display.tsx`** — `handleTabChange` does not move focus to the activated tab; activation is on-click only (no manual vs automatic activation distinction).
- **`apps/web/src/components/tracks/lyrics-display.tsx`** — active-timestamp highlighting parked per 2.1c; when implemented, active-line needs `aria-live="polite"` on a wrapper or `aria-current="true"` toggled per line + `role="log"` semantics.
- **`apps/web/src/components/auth/check-email-card.tsx`** — resend button's loading state sets `disabled` + reads `resendSending` text but has no `aria-live`/`aria-busy`.
- **`apps/web/src/components/auth/forgot-password-form.tsx`** — success state has no `role="status"`/`aria-live`; the page-swap after submit is silent to AT.
- **`apps/web/src/components/auth/login-form.tsx`** — password field does not receive `aria-describedby` linking to the shared error (only email does); both fields should link.
- **`apps/web/src/components/auth/register-form.tsx`** — same: only `email` has `aria-describedby="register-error"`; `name` and `password` should share; and client-side validation errors do not mark the erroring field as `aria-invalid`; focus is not moved to the errored field.
- **`apps/web/src/components/auth/reset-password-form.tsx`** — no `aria-invalid` on password field when client-side min-length fails.
- **`apps/web/src/components/auth/social-buttons.tsx`** — when one provider is `loadingProvider`, all buttons become `disabled`; no `aria-busy` on the loading one specifically.
- **`apps/web/src/components/contribute/form-field.tsx`** + `reciter-form` / `album-form` / `track-form` / `resubmit-form` — visual asterisks appear for required fields but `<Input required>` is not set; SR doesn't announce "required"; browsers don't enforce; focus management doesn't move to the error pill on server errors.
- **`apps/web/src/components/contribute/contribution-list.tsx`** — disclosure row contains `<time>` and badges inside the button. Fine. But: expanded panel is not associated via `aria-controls` with the disclosure.
- **`apps/web/src/components/search/search-bar.tsx`** — full combobox ARIA present (very well done), **but** `role="presentation"` on section headers with `aria-label` — `aria-label` on a presentation role is ignored by most SRs; use `role="group" aria-label` or nest under labelled groups.
- **`apps/web/src/components/search/search-results-content.tsx`** — track-result link `aria-label` reads `"Play {title} from {album} by {reciter}"`, but the link navigates to the track page; it does not play. Misleading copy.
- **`apps/web/src/components/mod/field-diff.tsx`** — `<ins>` and `line-through` `<p>` used for visual diff, but no ARIA describes the change to SR; a moderator using a SR cannot easily tell "added" vs "unchanged". Add `aria-label` to the columns ("Current value", "Proposed value with changes").
- **`apps/web/src/components/settings/change-email-form.tsx`** — error `<p role="alert">` renders after the field, but input has no `aria-invalid` / `aria-describedby` link.
- **`apps/web/src/components/settings/change-password-form.tsx`** — two password inputs lack `aria-invalid` / `aria-describedby`; hint text is visually associated but not programmatically tied.
- **`apps/web/src/components/SaveButton.tsx`** — focus ring `focus:ring-gray-900` invisible in dark mode (no `dark:` counterpart); keyboard users lose focus indicator.
- **`apps/web/src/components/LikeButton.tsx`** — same.
- **`apps/web/src/components/theme/ThemeToggle.tsx`** — `aria-label` reflects next action ("Switch to dark") but no `aria-describedby` exposes current theme name to VO users; the 3-state cycle is ambiguous without context.

## Nice-to-have

- **`apps/web/app/mod/audit/page.tsx:42`** — large `<table>` lacks a `<caption>`; add `<caption className="sr-only">Audit log entries</caption>`.
- **`apps/web/app/mod/users/page.tsx:47`** — same; add `<caption className="sr-only">User list</caption>`.
- **`apps/web/app/error.tsx` / `not-found.tsx`** — big `500`/`404` tile has `aria-hidden="true"`; heading could duplicate the number via `sr-only` for heading-filter users (edge case).
- **`apps/web/src/components/layout/header.tsx:33-37`** — `className="relative sticky ..."` has both `relative` and `sticky`; `sticky` already establishes the context.
- **`apps/web/src/components/layout/header.tsx:39-44`** — skip link is outside `<Container>` and uses `focus:left-4 focus:top-4` which may collide with translated hero sections on some pages.
- **`apps/web/src/components/layout/user-menu.tsx:50`** — `aria-label={"Account menu for ${user.name ?? user.email}"}` reads out full email on every focus; consider "Account menu" + visually hidden description.
- **`apps/web/src/components/layout/mobile-nav.tsx:57-77`** — inline SVG has `aria-hidden="true"` (correct); add `focusable="false"` for IE11 safety (low priority).
- **`apps/web/src/components/player/PlayerBar.tsx`** — empty `<p aria-hidden="true">` reciter placeholder (L266) is harmless but dead markup.
- **`apps/web/src/components/player/MobilePlayerOverlay.tsx`** — seek-bar SR coverage identical to PlayerBar; OK.
- **`apps/web/src/components/player/QueuePanel.tsx`** — full focus trap implemented (superior to MobilePlayerOverlay). Keep as reference.
- **`apps/web/src/components/player/track-detail-play-button.tsx`** — `aria-live="polite"` on status label OK.
- **`apps/web/src/components/albums/album-header.tsx`** — `focus:ring-offset` relies on light-background assumption (no dark offset colour).
- **`apps/web/src/components/albums/album-grid.tsx`** — `AlbumListCard` `aria-label` is descriptive. LCP priority not set on first item (unlike `recent-albums`).
- **`apps/web/src/components/auth/social-buttons.tsx`** — "or continue with" divider uses a `<div>` with inline label; no `role="separator"` applied.
- **`apps/web/src/components/auth/login-form.tsx`** — disabled submit button removes from tab order by default; consider `aria-disabled` to allow keyboard focus + hear submitting state.
- **`apps/web/src/components/auth/forgot-password-form.tsx`** — no explicit `aria-required` (browsers map `required` → `aria-required="true"` but explicit is best practice).
- **`apps/web/src/components/auth/login-form.tsx`** — "Forgot password?" link inside field-row not programmatically associated with password field via `aria-describedby` (not strictly required).
- **`apps/web/src/components/contribute/contribution-list.tsx`** — "Edit and resubmit" button has no `aria-describedby` linking to moderator-notes block above.
- **`apps/web/src/components/contribute/resubmit-form.tsx`** — submit + cancel buttons without `aria-busy` during submission.
- **`apps/web/src/components/mod/apply-button.tsx`** — `role="alert"` on error; applied badge has no `aria-live` — state change "Apply" → "Applied" not announced.
- **`apps/web/src/components/mod/badges.tsx`** — badges are decorative pills with visible text, no `aria-label`/role. For a moderator triaging rapidly, context is usually adjacent — flagged only.
- **`apps/web/src/components/mod/load-more-audit.tsx` / `load-more-queue.tsx` / `load-more-users.tsx`** — load-more buttons lack `aria-busy` during pending state.
- **`apps/web/src/components/mod/review-actions.tsx`** — no live region announces success; page refresh handles it implicitly.
- **`apps/web/src/components/mod/role-button.tsx`** — `"Saving…"` helper text has no `aria-live`; transition silent.
- **`apps/web/src/components/library/library-tracks-list.tsx`** — empty-state "Browse Albums" is a `<Link>` visually styled as a button — SR gets "link", not "button"; acceptable since it navigates.
- **`apps/web/src/components/library/library-tracks-list.tsx`** — duration is `aria-hidden="true"`; could be made available.
- **`apps/web/src/components/search/mobile-search-overlay.tsx`** — focus-trap query selector includes `textarea, select` even though overlay has neither — harmless future-proofing.
- **`apps/web/src/components/settings/notifications-section.tsx`** — `<fieldset>` has both `aria-label` and `<legend class="sr-only">`; duplication may double-announce on some AT.
- **`apps/web/src/components/settings/delete-account-section.tsx`** — cancel button uses `focus:ring-gray-500` (low contrast on white) vs delete button's `focus:ring-red-600`; both pass AA but cancel is close to the 3:1 floor.
- **`apps/web/src/components/ui/empty-state.tsx`** — `role="status"` + `aria-live="polite"` on a wrapper that may contain a `<Button>`; SRs may re-announce on mount/remount.
- **`apps/web/src/components/ui/arabic-text.tsx` / `urdu-text.tsx`** — `dir` + `lang` set correctly.
- **`apps/web/src/components/SaveButton.tsx` / `LikeButton.tsx`** — hit target ~24×24 (icon + `p-1`), below WCAG 2.5.5 AAA (44×44) and Apple/Material guidelines. `opacity-0` pre-load window still focusable (Tab stop lands on invisible control). `aria-busy` missing during pending state.
- **`apps/web/src/components/tracks/lyrics-display.tsx`** — inline `<p>` for English/Romanized missing `lang` attribute (AR/UR subfiles set `lang` correctly).
- **`use-search-autocomplete.ts` (Pass 10)** — exposes `listboxId`/`activeOptionId` correctly; consumer must render option ids matching the pattern. Verified in `search-bar.tsx` / `mobile-search-overlay.tsx`.
- **`jsonld.ts` (Pass 11)** — escapes `<>&` for safe inline `<script>` injection; no AT impact.
