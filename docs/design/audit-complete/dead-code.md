# Phase 2.1e — Axis 7: Dead / Suspect Code

Organised by finding type so a cleanup sprint can pick up one bucket at a time. Findings consolidated from 11 subtree audit passes.

## Summary

| Bucket | Count |
|---|---|
| TODO / FIXME / HACK comments | 3 |
| Commented-out blocks | 0 |
| Unused exports | 3 |
| Orphan state / empty placeholders | 4 |
| Unrouted components | 1 (`SiteHeaderStatic`) |
| Duplication hot spots | 10 |
| i18n / hard-coded-English gaps | 15+ files |
| Suspect heuristics / fragile code | 6 |

No file was found to be fully dead (orphaned without consumers). The highest-signal cleanup items are (1) consolidating `AlbumListCard` into `cards/album-card.tsx` (fixes a dark-mode regression at the same time), (2) extracting an `<AuthStatusCard>` shared between `reset-password` / `verify-email`, and (3) a sweep of hard-coded English strings across the contribute and mod subtrees.

---

## TODO / FIXME / HACK comments

- **`apps/web/app/(protected)/settings/page.tsx:24`** — `const user = sessionData!.user;` non-null assertion. Comment says "Session guaranteed by (protected) layout" (true), but `?.user` + early return would be safer.
- **`apps/web/app/mod/users/page.tsx:27`** — comment `"Search is not wired to URL params for M6 (no form submission)"` — acknowledged incomplete feature (M6 milestone marker).
- **`apps/web/src/components/settings/notifications-section.tsx`** — JSDoc says `"M4 placeholder; preference persistence is implemented in M5."` Acceptable TODO; flag for M5 follow-up to wire real state.

No `FIXME`/`XXX`/`HACK` markers found elsewhere.

## Commented-out blocks

None found in any of the 127 audited production files.

## Unused exports

- **`apps/web/src/components/layout/header.tsx`** — Both `SiteHeaderStatic` and `SiteHeaderDynamic` exported; `SiteHeaderStatic` appears unused by the app layout (only `SiteHeaderDynamic` is mounted at `apps/web/app/layout.tsx:118`). No consumers outside `components/layout/__tests__/header.test.tsx`. **Candidate orphan export.**
- **`apps/web/src/components/mod/field-diff.tsx`** — `DataPreview` exported (L71); worth verifying whether it has consumers beyond the scratch grep. **Potentially unused export.**
- **`apps/web/src/lib/logger/client.ts`** — `clientLogger.debug/info/warn` exported but **only `.error` is called** anywhere in `apps/web/`. Either keep as a documented API surface or trim.

## Orphan state / empty placeholders

- **`apps/web/src/components/player/PlayerBar.tsx`** L265-267 — empty `<p aria-hidden="true"/>` with code comment `"Reciter name not available in TrackDTO — placeholder for future"`. No-op that still takes vertical layout space. Remove or conditionally omit until wired.
- **`apps/web/src/components/player/MobilePlayerOverlay.tsx`** L256 — same empty reciter `<p>` placeholder.
- **`apps/web/src/components/contribute/reciter-form.tsx`** — **unused prop `submissionId`** (declared in interface L28; never destructured). Either wire through to `createReciterSubmission` or remove from props.
- **`apps/web/src/components/ui/empty-state.tsx`** — inline SVG comment labels icon as `"Icon placeholder"` — either rename comment or add optional `icon` prop (suggests intent never materialised).

## Unrouted components

- **`apps/web/src/components/layout/header.tsx::SiteHeaderStatic`** — see Unused exports. Not mounted by the app layout; test coverage only.

## Duplication hot spots

- **`apps/web/src/components/albums/album-grid.tsx::AlbumListCard`** (L10-79, local / not exported) duplicates ~90% of `cards/album-card.tsx`. Divergences: uses `AlbumListItemDTO` (has `reciterName`, `trackCount`), links to nested `/reciters/[slug]/albums/[slug]` instead of `/albums/[slug]`, shows reciter name + trackCount rows, **lacks all `dark:` variants**. Single largest consolidation opportunity — sharing via a variant prop eliminates ~60 duplicated lines and fixes the dark-mode regression in one change.
- **Route inconsistency:** `albums/album-grid.tsx` links to `/reciters/[slug]/albums/[slug]` while `cards/album-card.tsx` links to `/albums/[slug]` (flat). Both routes exist; verify one is canonical.
- **`apps/web/src/components/cards/reciter-card.tsx` L16-20 + `reciters/reciter-header.tsx` L14-18** — identical initials-derivation logic. Extract `getInitials(name)` util.
- **`apps/web/src/components/albums/track-list-item.tsx`** inline `AddToQueueIcon` (L10-16) + `album-card.tsx` L39-53 + `album-grid.tsx` L42-56 — nearly identical music-note placeholder SVGs. Extract to shared `icons/` module.
- **`apps/web/app/(auth)/verify-email/page.tsx`** L67-95 — the success-card branch hand-rolls essentially the same markup as the error-card branch (L22-65). 40 duplicated lines — extract to `<AuthStatusCard variant="success|error">`.
- **`apps/web/app/(auth)/reset-password/page.tsx`** L27-68 — error-card markup duplicates the `verify-email/page.tsx` pattern. Same extraction opportunity.
- **`apps/web/src/components/auth/check-email-card.tsx` + `auth/forgot-password-form.tsx`** — identical envelope SVG (same `d` path, same dimensions). Extract to an icon helper.
- **Four auth card surfaces** (`check-email-card.tsx`, `forgot-password-form.tsx`, `register-form.tsx`, `reset-password-form.tsx`) all repeat exactly `rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5` — the "card without `<Card>`" pattern. Consolidation = swap to `<Card>` primitive.
- **`apps/web/src/components/mod/load-more-queue.tsx::getLabel`** (L87) duplicates `apps/web/src/components/mod/submission-row.tsx::getSubmissionLabel` (L6). Consolidate into `mod/_utils.ts` or `mod/badges.tsx`.
- **`apps/web/src/components/mod/load-more-users.tsx`** local `User` interface (L8) duplicates fields that may already exist in a DTO; verify against `@nawhas/types`.
- **Close-icon SVG** duplicated across `PlayerBar.tsx` / `MobilePlayerOverlay.tsx` / `QueuePanel.tsx`.
- **Search icon SVGs** — two nearly-identical inlined in `mobile-search-overlay.tsx` (trigger + header).
- **`apps/web/src/components/SaveButton.tsx` / `LikeButton.tsx`** — useEffect guard, `handleClick` optimistic-update+rollback pattern, and entire `className` merge pipeline copy-pasted between the two. Candidate: `useOptimisticToggle(trackId, { get, set, unset })` hook + shared `<ToggleIconButton/>` primitive.
- **`apps/web/src/components/contribute/resubmit-form.tsx`** — three per-type `Fields` components each repeat state/validation/submit logic + same orange-panel chrome. Candidate: shared internal helper or consolidating into one typed component.
- **`apps/web/app/mod/submissions/[id]/page.tsx` L177-254** — `SubmissionFields` has two near-duplicate branches per entity type (FieldDiff vs DataPreview). Refactor opportunity.

## i18n / hard-coded-English gaps

These are not strictly "dead code" but were surfaced by the audit and deserve a single sweep.

- **`apps/web/app/contribute/layout.tsx`** L40-51 — blue info-card copy ("How to become a contributor") hard-coded English; not i18n'd like the rest of auth pages.
- **`apps/web/app/contribute/page.tsx` + all `contribute/*/new/page.tsx` + all `contribute/edit/*/page.tsx`** — every English string not going through `useTranslations` / `getTranslations`. Gap vs. `/login`, `/history`, `/library/tracks`, `/search`, `error.tsx`, `not-found.tsx`.
- **`apps/web/app/mod/**` (all pages)** — same English hard-coded strings; no i18n. May be intentional for moderator-only copy.
- **`apps/web/src/components/contribute/reciter-form.tsx`** — placeholder strings, labels, `'Submitting…'`, `'Submit for review'`, `'Submission failed. Please try again.'` all hard-coded.
- **`apps/web/src/components/contribute/album-form.tsx`** — same.
- **`apps/web/src/components/contribute/track-form.tsx`** — same.
- **`apps/web/src/components/contribute/contribution-list.tsx`** — "No submissions yet. Start contributing above.", "Moderator notes", "Submission ID:", "Edit and resubmit" hard-coded.
- **`apps/web/src/components/contribute/resubmit-form.tsx`** — all labels, placeholders, buttons hard-coded English.
- **`apps/web/src/components/player/track-play-button.tsx`** — `aria-label` hard-coded `` `Pause ${track.title}` `` / `` `Play ${track.title}` `` (L67).
- **`apps/web/src/components/player/track-detail-play-button.tsx`** — `statusText` (L79) and `label` (L75-77) hard-coded; `aria-label` English.
- **`apps/web/src/components/player/play-all-button.tsx`** — "Play All" (L37) hard-coded.

## Suspect heuristics / fragile code

- **`apps/web/src/components/auth/reset-password-form.tsx`** L36-39 — `isExpired` detected by `status === 400` OR `message.includes('expired')` OR `message.includes('invalid')`. Brittle string matching; if the auth library changes error messages, the "request new link" CTA silently disappears. Move detection to a typed error code from the auth layer.
- **`apps/web/src/components/auth/reset-password-form.tsx`** L84-89 — same issue: the "request new link" link is rendered only when `error.includes('expired') || error.includes('invalid')` — pattern-matches on the translated string; silently breaks on i18n changes.
- **`apps/web/src/components/auth/social-buttons.tsx`** L118 — `t(labelKey as Parameters<typeof t>[0])` casts the translation key to fight the dynamic-lookup type system. Fragile if new providers are added without corresponding translation keys.
- **`apps/web/src/components/contribute/contribution-list.tsx`** L128 — `as unknown as Record<string, unknown>` double-cast indicates `SubmissionDTO.data` type is too narrow/wide. Consider a discriminated-union narrowing by `submission.type`.
- **`apps/web/src/components/tracks/lyrics-display.tsx`** — `useEffect(() => …, [])` with empty deps reads `availableLanguages` from closure. ESLint `react-hooks/exhaustive-deps` would warn; suspect-fragile (breaks if `lyrics` prop identity ever changed mid-lifecycle).
- **`apps/web/src/components/tracks/lyrics-display.tsx`** — early return `if (lyrics.length === 0) return null;` placed **before** `useState` / `useEffect` calls — violates Rules of Hooks. Currently gated externally by parent `track.lyrics.length > 0 && <LyricsDisplay/>` so never fires, but real dead-hazard code.
- **`apps/web/src/components/tracks/track-detail-play-button.tsx`** — `lyrics` prop threads through to `setCurrentLyrics` in two places (effect + click handler) with slightly different trigger conditions (L55-59, L69-71). Duplicate intent; consolidate into a single effect keyed on `isActive && isPlaying`.
- **`apps/web/src/components/player/QueuePanel.tsx`** L204 — `h-[calc(100vh-65px)]` magic 65px duplicates PlayerBar visual height. If PlayerBar changes, calc goes stale. Should be a CSS variable (`--player-bar-height`).
- **`apps/web/src/components/player/MobilePlayerOverlay.tsx`** — spacer `<div className="w-9" aria-hidden="true" />` (L348) as layout-balancer for the shuffle button; brittle if control sizes change.
- **`apps/web/src/components/mod/apply-button.tsx`** — `import { useState } from 'react'` on L7 duplicates the alias already imported on L3 (`useTransition`). Two statements should merge.
- **`apps/web/src/components/search/search-bar.tsx`** — `Spinner` SVG path `d="M4 12a8 8 0 018-8V0C5.373 0 3 12 3 12h1z"` has oddly duplicated segment (`3 12 3 12`). Renders, but `d` attribute looks malformed.
- **`apps/web/src/components/search/search-results-content.tsx`** — `groupHits` uses `groups[hit.type]!` non-null assertion (safe: keys pre-populated); `findLyricsHighlight` casts via both `.find((h): h is ...)` and trailing `as …` — `as` is redundant after the type guard.
- **`apps/web/src/components/mod/review-actions.tsx`** — `handleAction` early-return (`if (action !== 'approved' && !expanded) { setExpanded(action); return }`) is subtle: Approve submits directly; Reject/Request-Changes expands the comment form first. Intentional but **under-commented**.
- **`apps/web/src/components/mod/role-button.tsx`** — comment L62 `Show moderator as non-selectable option when user already has that role` — option only renders if current user is already a moderator; guard L33 (`if (newRole === 'moderator') return`) ensures UI cannot promote to moderator. Consistent but deserves a clearer inline comment.
- **`apps/web/app/mod/submissions/[id]/page.tsx`** L137-175 — `fetchCurrentValues` helper pulls tables directly via drizzle rather than via a router. Mild architectural suspect (matches the pattern in `sitemap.ts`).
- **`apps/web/app/(protected)/profile/page.tsx`** L44-45, 47, 49 — `caller.library.count()` called without try/catch; if it throws, the page 500s.
- **`apps/web/app/search/error.tsx`** — entire file returns `null`; only effect is logging. Clarify whether this should render a user-visible fallback.
- **`apps/web/src/hooks/use-search-autocomplete.ts`** — `handleChange`'s `useCallback` dep array is `[]` despite the callback referencing setters (all stable React setters so correct); `eslint-plugin-react-hooks` strict mode may flag.
- **`apps/web/src/lib/audio-engine.ts`** — `console.error` calls intentional for load/play errors but bypass `clientLogger` — minor inconsistency; route through `clientLogger.error` for uniform structured logs.

## Other clean / low-signal observations

- `apps/web/src/hooks/use-listening-history.ts` and `use-search-autocomplete.ts` — live, clean, all imports accounted for; no TODOs, no orphan exports.
- `apps/web/src/lib/auth-client.ts`, `social-providers.ts`, `metadata.ts`, `jsonld.ts` — all exports consumed; clean.
- `apps/web/src/lib/jsonld.ts::formatIsoDuration` — used internally by `buildTrackJsonLd` only; acceptable as a private helper but could be un-exported.
- Test coverage is **thin** in the content-cards subtree — only `reciters/__tests__/reciter-grid.test.tsx` exists; no tests for `AlbumGrid`, `AlbumCard`, `ReciterCard`, `TrackListItem`, `AlbumHeader`, `PopularTracks`. Not dead code but suspect for regression (especially given the dark-mode break in `album-grid.tsx`).
- `apps/web/app/sitemap.ts` L74-77 — catch-all fallback returns static routes only on DB failure — intentional, commented.
