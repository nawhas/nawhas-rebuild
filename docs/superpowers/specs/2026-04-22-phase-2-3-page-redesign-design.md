# Phase 2.3 — Page-by-Page Redesign (Design)

**Status:** Design approved 2026-04-22 · Implementation plan not yet written
**Author:** Asif (brainstormed with Claude)
**Parent roadmap:** [`2026-04-21-rebuild-roadmap.md`](./2026-04-21-rebuild-roadmap.md), Phase 2.3
**Depends on:** Phase 2.1 audit, Phase 2.1d PlayerBar fixes, Phase 2.2 design-system foundation, Phase 2.1e complete frontend audit
**Parked dependency:** Phase 2.1c (lyrics sync research) — Track page ships visual/structural only; lyrics highlight+sync functionality is deferred until 2.1c resolves

## Context

Phase 2.2 shipped the token layer and 12 primitives. Phase 2.1e audited every frontend file across seven axes and produced the backlog: ~523 Tailwind-default color call sites with no token routing, most of `settings/*` / `library/*` / `search/*` / `auth/*` dark-mode-broken, ~30+ Button replacement candidates still outstanding, plus per-page legacy-affordance gaps (Home hero, Album vibrant backgrounds, AuthReason, etc.).

2.3 is where those gaps close. It's the last Phase 2 sub-project before launch prep (Phase 3). It takes the rebuild from "tokens declared but not consumed" to "whole app visibly matches the devotional-red aesthetic with full dark-mode coverage and no leftover hand-rolled primitives."

## Goals

1. **Token adoption across every page.** Replace Tailwind-default / hardcoded / literal color classes with semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.). When Phase 2.2's token flip didn't change the user-visible app, it's because nothing consumed the tokens. 2.3 fixes that, page by page.
2. **Dark-mode parity across every page.** Every Broken entry in `audit-complete/dark-mode.md` gets fixed during the page's workstream.
3. **Complete primitive adoption.** Every High-confidence entry in `audit-complete/primitives-replacement.md` gets swapped to the `@nawhas/ui` primitive during its page's workstream.
4. **Close critical legacy-parity gaps.** Home hero, Album vibrant backgrounds, Reciter load-more pagination, AuthReason contextual copy, Track Roboto-Slab titles — each ported with per-page design judgment.
5. **Fix Critical and Important a11y issues.** All Critical + Important entries in `audit-complete/accessibility.md` get addressed during their page's workstream.

## Non-Goals

- **No lyrics highlight + scroll-sync functionality.** Track page gets visual/structural primitives + token + dark-mode fixes. The actual timestamp-driven highlighting is parked for Phase 2.1c research.
- **No net-new features.** 2.3 closes gaps; it doesn't add playlists, topics, MP3 download, etc. (those are post-launch per roadmap).
- **No page-composition redesigns that diverge from legacy intent.** This is "redesign that matches legacy's devotional character" — not a rebrand or IA overhaul (IA decisions already resolved in 2.1).
- **No restored dormant features.** Stories, print-lyrics, legacy moderator routes stay excluded per roadmap non-goals.
- **No Storybook.** No visual-regression snapshot suite (that's 2.1b's deferred agenda).

## Approach

**One sub-project, pages redesigned in descending traffic order, each page end-to-end.** The 8 pages are:

1. Home
2. Reciter profile
3. Album
4. Track
5. Library + History
6. Search
7. Auth (6 routes)
8. Contribute + Mod

Each page runs the same 5-step workstream internally: **token sweep → dark-mode fixes → primitive adoption → legacy-gap port → a11y fixes**, though not every page has legacy-gap ports (Library / Search / Mod are rebuild-only or intentionally simpler per the 2.1 decisions).

**Hybrid per-page design philosophy** — port legacy literally where it's obviously good (AuthReason contextual copy, devotional-red aesthetic, Bellefair serif for hero quotes, Roboto Slab for hero titles), redesign where legacy feels dated (thin Roboto-200 slogan → Bellefair at contemporary weight; node-vibrant runtime → precomputed seed-time color), drop where explicitly excluded (Stories, print, dormant mod routes, "Website"/"Favorite" placeholder buttons on reciter profile).

**Commit cadence:** direct-to-main per user preference. ~3-4 commits per page, 8 pages = **~24-32 commits total** plus one closeout. Each page's commits land sequentially (token sweep → primitive adoption → legacy port → a11y); next page cannot start until the current page's CI is green.

## Per-page workstream

### 1. Home — `/`

**Files in scope:** `apps/web/app/page.tsx`, `apps/web/src/components/home/popular-tracks.tsx`, `apps/web/src/components/cards/reciter-card.tsx`, `apps/web/src/components/cards/album-card.tsx` (as they render on home), and any `layout/header.tsx` usage that's home-specific.

**Tokens + dark-mode:** consolidate `bg-gray-*` / `text-gray-*` / `bg-white` → `bg-background` / `bg-muted` / `bg-card` / `text-foreground` / `text-muted-foreground`.

**Primitive adoption:** `<Card>` on reciter-card / album-card (inner wrapper — keep outer `<Link>` for focus-ring), `<SectionTitle>` for "Top Reciters" / "Top Nawhas" / "Saved" section headings (currently ad-hoc `<h2>` classes), `<Button>` variants on any remaining inline submit / CTA markup.

**Legacy-gap ports (Home is the largest visible gap):**

- **Hero section.** Port the red-gradient background + slogan + inline search pill. Replace the legacy Roboto-200 64px thin-display with **Bellefair at ~56px (2.5rem) medium weight** for a contemporary devotional-serif look. Slogan copy preserved verbatim from legacy (`HomePage.vue` around lines 265-271 in `github.com/nawhas/nawhas@master`). Hero wraps the existing `<SearchBar>` in a larger display variant.
- **"Top Nawhas" numbered table.** Port with `<SectionTitle>` + `<ol>` list; styled with semantic tokens, no table semantics needed beyond the ordered-list number.
- **"Saved" strip for authenticated users.** Conditional on `useSession()`. Row of `<Card>` tiles (top-6 most-recently-saved tracks) above the "Top Nawhas" strip. Falls back to nothing when not signed in.
- **Hero-variant `<SearchBar>`** — the existing component gains a `variant="hero"` prop that enlarges padding + typography.

**Explicitly dropped:** Stories strip (legacy has a "Latest Stories" section on HomePage fed from `/stories` — out of scope per 2.1 non-goals).

**A11y:** heading hierarchy (hero h1, section titles h2), `aria-label` on hero search, skip-to-main-content link already present in `header.tsx` but verify it lands correctly once hero exists.

### 2. Reciter profile — `/reciters/[slug]`

**Files in scope:** `apps/web/app/reciters/[slug]/page.tsx`, `apps/web/src/components/reciters/reciter-header.tsx` (if exists; else inline in page), `apps/web/src/components/albums/album-grid.tsx`, `apps/web/src/components/cards/album-card.tsx`.

**Tokens + dark-mode:** sweep. `albums/album-grid.tsx::AlbumListCard` is flagged Broken in the audit — fix.

**Primitive adoption:** `<Card>` on album-grid children, `<Button>` on any remaining inline CTAs, `<SectionTitle>` on "Discography" / "Top Nawhas" headings.

**Legacy-gap ports:**

- **Hero title in Roboto Slab** at ~2.5rem. Uses `font-slab` token.
- **Load-more button for album list** (middle-ground modernization vs legacy's numbered-page pagination). Uses `<Button variant="outline">` + intersection-observer-optional trigger (start with manual click). Applies only when reciter has > 12 albums.
- **Remove non-functional placeholder buttons.** Legacy has "Website" and "Favorite" buttons on the reciter hero with no `@click` handlers (dead UI). Do not port.

**A11y:** heading hierarchy, `<h1>` for reciter name (once), album cards with accessible names.

### 3. Album — `/albums/[slug]`

**Files in scope:** `apps/web/app/albums/[slug]/page.tsx`, `apps/web/src/components/albums/album-header.tsx`, `apps/web/src/components/albums/track-list.tsx`, `apps/web/src/components/albums/track-list-item.tsx`.

**Tokens + dark-mode:** sweep. `track-list.tsx` flagged Broken.

**Primitive adoption:** `<Card>` on the album-header wrapper, `<Button>` for play-all / save / share, `<Badge>` where track metadata pills need it, `<SectionTitle>` for "Tracks" / "More from this reciter" headings.

**Legacy-gap ports:**

- **Vibrant hero background.** Port via **precomputed-at-seed-time** (not runtime). Migration adds `albums.vibrant_color text` column; seed / sync script extracts the dominant-muted color from the album image once (using a script that calls `node-vibrant` or `image-vibrance` in node at catalog-build time) and writes the hex to the DB. Album page renders `<div style={{ backgroundColor: album.vibrantColor ?? 'var(--color-muted)' }}>`. Fallback to `--color-muted` when column is null.
- **Hero title in Roboto Slab** at ~2rem.
- **Play controls + save + share** on the album hero as `<Button>` cluster.

**A11y:** `<h1>` album title, track rows accessible (aria-label per row; click to play already works; enter-key support where missing).

### 4. Track — `/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]`

**Files in scope:** `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx`, `apps/web/src/components/tracks/track-header.tsx`, `apps/web/src/components/tracks/track-actions.tsx`, `apps/web/src/components/tracks/media-toggle.tsx`, `apps/web/src/components/tracks/youtube-embed-slot.tsx`, `apps/web/src/components/tracks/lyrics-display.tsx`, `apps/web/src/components/tracks/track-detail-play-button.tsx` (via player subdir).

**Tokens + dark-mode:** sweep. `track-header.tsx` + `track-actions.tsx` + `lyrics-display.tsx` all flagged Broken.

**Primitive adoption:**

- **`<Tabs>` primitive for `MediaToggle`** (Listen / Watch). Currently hand-rolled — replace with Radix-backed Tabs.
- **`<Tabs>` primitive for `LyricsDisplay` language switcher** (AR / UR / EN / Romanized). Currently hand-rolled.
- **`<Button>` cluster** on track-actions (save, like, queue, download-if-any).
- **`<SectionTitle>` on "Lyrics"** section heading.
- **`<Card>` on the track-header shell** if not already present.

**Legacy-gap ports:**

- **Roboto Slab hero title** at ~2rem. 7 of legacy's hero titles used Roboto Slab per audit.
- **Auto-scroll on lyrics panel** — not in scope here. Deferred to 2.1c.
- **Highlight active timestamp** — not in scope. Deferred to 2.1c.

**Rules-of-Hooks fix:** `lyrics-display.tsx` has an early `return null` before `useState`/`useEffect` that violates React's rules (dormant because the parent mounts conditionally, but fragile). Reorder hooks-before-return as part of this workstream.

**A11y:**

- `<Tabs>` primitives provide correct ARIA automatically (Radix-backed).
- `aria-live` region for current-time display (nice-to-have).
- Keyboard arrow-key nav within each Tabs is given by Radix — verify.
- `sr-only` label on any remaining icon-only controls.

### 5. Library + History — `/library/tracks`, `/history`

**Files in scope:** `apps/web/app/(protected)/library/tracks/page.tsx`, `apps/web/app/(protected)/history/page.tsx`, `apps/web/src/components/library/library-tracks-list.tsx`, any track-row component shared.

**Tokens + dark-mode:** `library/` flagged completely Broken — fix every file.

**Primitive adoption:** `<Card>` / `<Button>` / `<Badge>` on list items + CTAs, `<SectionTitle>` for headings, empty-state already uses the `<EmptyState>` + `<Button>` pattern from Phase 2.2.

**Legacy-gap ports:** none (IA is intentional per 2.1 decisions — simpler one-route model kept, no anon-landing or dashboard restore).

**Optional:** a "Recently Saved" strip at the top of `/library/tracks` (top-6 saves mirroring the home strip). Evaluate when writing the implementation plan — include if the effort is < 30 minutes; skip if more.

**A11y:** list semantics (`<ul>` / `<ol>` vs `<div>`), empty-state copy, keyboard navigation.

### 6. Search — `/search`

**Files in scope:** `apps/web/app/search/page.tsx`, `apps/web/src/components/search/search-bar.tsx`, `apps/web/src/components/search/search-results-content.tsx`, `apps/web/src/components/search/mobile-search-overlay.tsx`.

**Tokens + dark-mode:** `search/` flagged completely Broken — fix.

**Primitive adoption:** `<Tabs>` on the results tabstrip (currently hand-rolled; already uses `role="tab"` correctly per audit, just needs the Radix version for keyboard + tabpanel ARIA). `<Button>` for any remaining inline CTAs.

**Legacy-gap ports:** none (IA decision kept — dual-entry header + page pattern, no reversion to dialog-only).

**A11y:** **Critical** — `search-results-content.tsx` carries `role="tab"` but has no `role="tabpanel"` / `aria-controls` wiring. Switching to the `<Tabs>` primitive fixes this automatically. `<mark>` elements in search hits already have reasonable contrast post-token-flip; verify.

### 7. Auth pages — `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/check-email`

**Files in scope:** `apps/web/app/login/page.tsx`, `apps/web/app/check-email/page.tsx`, `apps/web/app/(auth)/register/page.tsx`, `apps/web/app/(auth)/forgot-password/page.tsx`, `apps/web/app/(auth)/reset-password/page.tsx`, `apps/web/app/(auth)/verify-email/page.tsx`, `apps/web/src/components/auth/auth-page-shell.tsx`, `apps/web/src/components/auth/login-form.tsx`, `apps/web/src/components/auth/register-form.tsx`, `apps/web/src/components/auth/forgot-password-form.tsx`, `apps/web/src/components/auth/reset-password-form.tsx`, `apps/web/src/components/auth/check-email-card.tsx`, `apps/web/src/components/auth/social-buttons.tsx`.

**Tokens + dark-mode:** auth subtree flagged completely Broken — every file gets `dark:*` variants or (preferably) a swap to semantic tokens.

**Primitive adoption:**

- **`<Card>`** — four auth files (`check-email-card`, `forgot-password-form`, `register-form`, `reset-password-form`) hand-roll the identical card surface. Swap all four to the primitive.
- **`<Button>`** — `social-buttons.tsx` (N-per-provider) and `check-email-card.tsx` (1) still inline.

**Legacy-gap port (major):**

- **AuthReason contextual copy.** Legacy's login dialog customized copy per trigger ("to save a track, sign in"). Implementation:
  1. Add `?reason=save|like|library|contribute|comment` query param on redirects to `/login` from SaveButton, LikeButton, any auth-gated action.
  2. `auth-page-shell.tsx` reads the query param (client-side via `useSearchParams`), maps to a heading+sub-copy variant.
  3. Translation keys `auth.login.reasonHeading.<reason>` + `auth.login.reasonSubtext.<reason>` added to `apps/web/messages/en.json`.
  4. Default fallback (no `reason` param) renders the generic heading.
- **Reset-password expired-token detection** currently matches on translated error message string (fragile per audit). Switch to a structured error code. Scope-adjacent but worth doing while we're in the file.

**A11y:**

- Form labels properly associated with inputs (`htmlFor` / `id`) — verify.
- `aria-invalid` + `aria-describedby` linking each input to its error + hint text.
- Submit button accessible when disabled.

### 8. Contribute + Mod — `/contribute/*`, `/mod/*`

**Files in scope:** all `.tsx` under `apps/web/src/components/contribute/` and `apps/web/src/components/mod/`, plus corresponding `apps/web/app/contribute/` and `apps/web/app/mod/` page files.

**Tokens + dark-mode:**

- `mod/badges.tsx` + `mod/apply-button.tsx` + `mod/review-actions.tsx` — replace hardcoded `bg-green-*` / `bg-amber-*` / `bg-emerald-*` / `bg-orange-*` / `bg-yellow-*` badge/button colors with semantic tokens (`bg-success`, `bg-warning`, `bg-destructive` if we've declared them; or scope-narrow to Badge variants for badges, Button variants for buttons).
- Contribute subtree is mostly Good on dark-mode per audit; sweep for any gaps.

**Primitive adoption:**

- **`<Badge>`** — `mod/badges.tsx` is the flagship Badge-replacement target. Replace all four record-maps with `<Badge>` variants.
- **`<Button>`** — complete the Phase 2.2 Task 14 leftovers: `resubmit-form` (6 inline buttons), `contribution-list` (2), `check-email-card` (1), `social-buttons` (N), `mod/review-actions.tsx` (approve / request-changes / reject — use `<Button variant="default">` / `<Button variant="outline">` / `<Button variant="destructive">` respectively), plus `change-password-form`, `change-email-form`, `delete-account-section` from the settings subtree.
- **`<Select>`** — contribute forms need `<Select>` for reciter-picker / album-picker / language-picker. Currently these may be bare `<select>` or `<input type="text">` with autocomplete.
- **`<Dialog>`** — `delete-account-section` currently hand-rolls a modal; replace with `<Dialog>` primitive. Fixes the missing focus-trap / Escape / `inert` background audit flagged.

**Legacy-gap ports:** none — both `/contribute/*` and `/mod/*` are rebuild-only surfaces.

**i18n gap:** contribute + mod subtrees are not using `next-intl` (hardcoded English strings). Port strings to `apps/web/messages/en.json` with sensible key namespaces (`contribute.reciter.form.nameLabel`, `mod.queue.approveButton`, etc.).

**A11y (Critical from audit):**

- All four contribute forms render a visual `*` for required fields but don't set `required` / `aria-required` on the input. Add.
- Reset-password-like error linkage: link inputs to errors via `aria-describedby`.
- `mod/review-actions.tsx` confirm-dialog pattern (once `<Dialog>` is adopted) gets focus management for free.

### Cross-page shared work (applies across multiple page workstreams)

- **`<SectionTitle>` primitive adoption.** The primitive exists but is unused as of Phase 2.2 Task 13. Every page's section-heading `<h2 className="text-xl font-semibold mb-3">` or similar gets swapped.
- **Skeleton components (`apps/web/src/components/ui/*-skeleton.tsx`).** Tokens-only sweep (no primitive adoption — skeletons are their own shape).
- **`<EmptyState>`** — already uses `<Button>` per Phase 2.2. Token + dark-mode sweep per page.

## File Structure

No new shared files in 2.3. All work lives in existing `apps/web/app/` page files and `apps/web/src/components/` component files. Possible additions:

- `apps/web/src/components/home/hero-section.tsx` — new component for the Home hero (keeps page.tsx thin).
- `apps/web/src/lib/auth-reason.ts` — helper that maps `reason` query-param values to translation keys.
- `packages/db/drizzle/XXXX_add_vibrant_color.sql` — migration for `albums.vibrant_color` column.
- `apps/web/scripts/seed-vibrant-colors.ts` — optional one-shot script to extract + persist vibrant colors for existing albums (or bake into the existing sync flow).

## Verification gates

- **Per commit:** `./dev typecheck` + `./dev lint` green.
- **Per page:** `./dev qa` green (full typecheck + lint + test via turbo), plus a page-scoped e2e run where viable (`./dev test:e2e --grep <page-area>`).
- **Whole sub-project closeout:** manual 10-route smoke (the same list used in 2.1/2.2); dark-mode toggle check across all pages; `./dev test:e2e` full green; visual check that devotional-red aesthetic is visible on every page.

Port conflict on bcewhub-app's containers may block `./dev test` / `./dev test:e2e`; fall back to raw `pnpm --filter @nawhas/web test` + `pnpm --filter @nawhas/e2e test` where needed.

## Commit cadence

Direct-to-main per user preference. Per-page cadence (flexible; collapse adjacent commits if the diff is small):

1. `refactor(<page>): token + dark-mode sweep for <page> files`
2. `refactor(<page>): adopt <primitives> in <page>`
3. `feat(<page>): <legacy affordance port>` (if applicable — skip if none)
4. `fix(<page>): a11y — <critical + important fixes>` (if applicable)

Plus one sub-project-closeout commit updating the roadmap to mark 2.3 shipped.

Expected total: ~25-32 commits.

## Risks

- **Token sweep changes on the same file that primitive adoption also changes.** Per-page sequencing keeps them linear; each commit touches a well-scoped set.
- **Home hero design ≠ user expectation.** Bellefair at ~56px medium weight is a judgment call. Mitigation: write hero markup into the plan with exact font/size/weight tokens; if user wants a different treatment after seeing it, easy post-merge adjustment.
- **Album vibrant-color migration adds schema change.** Needs a migration + backfill. Scope-adjacent. If the backfill turns out non-trivial (requires downloading every album image once), we defer the vibrant port to a follow-up and ship Album with flat `bg-muted` in 2.3, noting in the closeout.
- **AuthReason query-param plumbing touches N callers** (SaveButton, LikeButton, any auth-gated action). Each caller needs to learn to append `?reason=...` on redirects. Mitigation: one helper (`apps/web/src/lib/auth-reason.ts`) exporting `buildLoginHref(reason)`; callers import it.
- **Track lyrics-display visual polish without sync functionality might feel unfinished.** Acceptable — the parked 2.1c research was user-driven scope. The polished-but-static LyricsDisplay is strictly better than the current unpolished static version.

## Open Questions

1. **Album vibrant color extraction** — precomputed at catalog-build is the plan, but **who runs the extraction**? Options: (a) one-shot script the user runs once locally / in CI; (b) added to the existing catalog-sync flow (runs each time an album is created or updated); (c) lazy-compute at request time + cache. My default for the plan: (a) one-shot script + manual trigger for existing albums, plus sync hook for new albums going forward.
2. **`<Select>` vs combobox for reciter-picker in contribute forms.** Short reciter lists (< 50) work with native `<Select>`. If reciter count grows, a searchable combobox may be needed — but shadcn doesn't ship a Combobox primitive we've generated yet. Default for the plan: `<Select>` today; flag as follow-up if reciter count exceeds threshold.

## What this document is *not*

This is a design for Phase 2.3 specifically. It does not enumerate concrete code changes (those belong in the implementation plan produced by `writing-plans` next). It does not decide the post-2.3 launch-prep steps — those are Phase 3 (data strategy + SEO parity + public beta cutover).
