# Phase 2.5 Pages — Wave 3: Contribute / Mod / Protected / Boundaries — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the final 19 routes + ~25 feature components to the POC design system, completing the Phase 2.5 Pages migration.

**Architecture:** Token-cascade (already shipped in Phase A); each row swaps shadcn semantic Tailwind classes (`text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-error-*`) for POC literals (`text-[var(--text)]`, `bg-[var(--card-bg)]`, `text-[var(--text-dim)]`, `border-[var(--border)]`, `bg-[var(--surface)]` / `--surface-2`, `text-[var(--color-error-*)]`) per `docs/design/visual-vocabulary.md`. Pages reuse Phase B primitives (TrackRow, CoverArt, ReciterAvatar, Footer, Container, Button, Input). Mod and Contribute landings + the submission detail need new vocab entries — added in the same row that ships them.

**Tech stack:** Next.js 16 / React 19 / Tailwind v4 / shadcn primitives wrapped under POC tokens. No new deps.

**Branch:** Continue on `phase-2.5-poc-reskin` (current branch). Do not branch.

**Hover-bg rule reminder:** Elements inside a `--card-bg` container (cards, list rows) MUST hover to `--surface-2`, not `--surface`. The latter collides at `#141416` in dark mode. Page-background-parented elements (`--bg`) hover to `--surface`. See `docs/design/visual-vocabulary.md`.

**QA gate per row:** `./dev qa` (lint + typecheck + unit tests) must pass before commit. Skip e2e per row — runs in Round 8.

---

## File map (which files each row touches)

### Row 10 — Boundaries
- Modify: `apps/web/app/error.tsx`
- Modify: `apps/web/app/not-found.tsx`
- Modify: `apps/web/app/albums/loading.tsx`
- Modify: `apps/web/app/albums/[slug]/loading.tsx`
- Modify: `apps/web/app/reciters/loading.tsx`
- Modify: `apps/web/app/reciters/[slug]/loading.tsx`
- Modify: `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/loading.tsx`

### Row 11 — Protected user surfaces
- Modify: `apps/web/app/(protected)/layout.tsx`
- Modify: `apps/web/app/(protected)/profile/page.tsx`
- Modify: `apps/web/app/(protected)/profile/contributions/page.tsx`
- Modify: `apps/web/app/(protected)/history/page.tsx`
- Modify: `apps/web/src/components/profile/avatar-upload.tsx`
- Modify: `apps/web/src/components/profile/display-name-edit.tsx`
- Modify: `apps/web/src/components/history/history-list.tsx`

### Row 12 — Settings
- Modify: `apps/web/app/(protected)/settings/page.tsx`
- Modify: `apps/web/src/components/settings/change-email-form.tsx`
- Modify: `apps/web/src/components/settings/change-password-form.tsx`
- Modify: `apps/web/src/components/settings/notifications-section.tsx`
- Modify: `apps/web/src/components/settings/delete-account-section.tsx`

### Row 13 — Contribute chrome + shared forms
- Modify: `apps/web/app/contribute/layout.tsx`
- Modify: `apps/web/app/contribute/page.tsx`
- Modify: `apps/web/src/components/contribute/contribution-list.tsx`
- Modify: `apps/web/src/components/contribute/form-field.tsx`
- Modify: `apps/web/src/components/contribute/slug-preview.tsx`
- Modify: `apps/web/src/components/contribute/parent-picker.tsx`
- Modify: `apps/web/src/components/contribute/image-upload.tsx`
- Modify: `apps/web/src/components/contribute/audio-upload.tsx`
- Modify: `apps/web/src/components/contribute/lyrics-tabs.tsx`
- Modify: `apps/web/src/components/contribute/reciter-form.tsx`
- Modify: `apps/web/src/components/contribute/album-form.tsx`
- Modify: `apps/web/src/components/contribute/track-form.tsx`
- Modify: `apps/web/src/components/contribute/resubmit-form.tsx`
- Modify: `docs/design/visual-vocabulary.md` (add Contribute landing + form section)

### Row 14 — Contribute new + edit wizards
- Modify: `apps/web/app/contribute/reciter/new/page.tsx`
- Modify: `apps/web/app/contribute/album/new/page.tsx`
- Modify: `apps/web/app/contribute/track/new/page.tsx`
- Modify: `apps/web/app/contribute/edit/reciter/[slug]/page.tsx`
- Modify: `apps/web/app/contribute/edit/album/[reciterSlug]/[albumSlug]/page.tsx`
- Modify: `apps/web/app/contribute/edit/track/[reciterSlug]/[albumSlug]/[trackSlug]/page.tsx`

### Row 15 — Mod chrome + queue/audit/users
- Modify: `apps/web/app/mod/layout.tsx`
- Modify: `apps/web/app/mod/page.tsx`
- Modify: `apps/web/app/mod/queue/page.tsx`
- Modify: `apps/web/app/mod/audit/page.tsx`
- Modify: `apps/web/app/mod/users/page.tsx`
- Modify: `apps/web/src/components/mod/load-more-queue.tsx`
- Modify: `apps/web/src/components/mod/load-more-audit.tsx`
- Modify: `apps/web/src/components/mod/load-more-users.tsx`
- Modify: `apps/web/src/components/mod/role-button.tsx`
- Modify: `docs/design/visual-vocabulary.md` (add Mod dashboard + listing pattern)

### Row 16 — Mod submission detail
- Modify: `apps/web/app/mod/submissions/[id]/page.tsx`
- Modify: `apps/web/src/components/mod/submission-row.tsx`
- Modify: `apps/web/src/components/mod/badges.tsx`
- Modify: `apps/web/src/components/mod/field-diff.tsx`
- Modify: `apps/web/src/components/mod/review-actions.tsx`
- Modify: `apps/web/src/components/mod/apply-button.tsx`
- Modify: `docs/design/visual-vocabulary.md` (add Submission diff/review pattern)

### Row 17 — End-of-wave QA
- Read-only verification + push + final review.

---

## Token swap cheatsheet (used by every row)

| Legacy (shadcn semantic)              | POC literal                             | Notes |
|---|---|---|
| `text-foreground`                     | `text-[var(--text)]`                    | |
| `text-muted-foreground`               | `text-[var(--text-dim)]`                | Stronger dim |
| `text-muted-foreground` (for captions) | `text-[var(--text-faint)]`              | If 13px metadata |
| `bg-background`                       | `bg-[var(--bg)]`                        | |
| `bg-card`                             | `bg-[var(--card-bg)]`                   | Card surfaces |
| `bg-muted`                            | `bg-[var(--surface)]` (page-bg parent) OR `bg-[var(--surface-2)]` (card-bg parent) | **Apply hover-bg rule** |
| `border-border`                       | `border-[var(--border)]`                | |
| `bg-error-50` / `bg-error-950`        | `bg-[var(--color-error-50)]` / `bg-[var(--color-error-950)]` | |
| `text-error-400` / `text-error-300`   | `text-[var(--color-error-500)]`         | Use 500 for both modes |
| `bg-foreground text-background` (CTA) | `bg-[var(--accent)] text-white`         | Per CTA Primary in vocab |
| `hover:bg-foreground/90` (CTA hover)  | `hover:bg-[var(--accent-soft)]`         | |
| `focus:ring-ring`                     | `focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2` | Match Wave 2 pattern |
| `font-semibold` on h1                 | `font-serif` weight 500                 | Per Typography in vocab |

If a row's spot-check finds a class not in this table, follow the spirit of the vocab: text colors → `--text` / `--text-dim` / `--text-faint`; backgrounds on cards → `--card-bg`; backgrounds on hovered list rows inside cards → `--surface-2`; primary CTAs → `--accent`.

---

## Row 10 — Boundaries (warmup)

**Files:**
- Modify: `apps/web/app/error.tsx`
- Modify: `apps/web/app/not-found.tsx`
- Modify: `apps/web/app/albums/loading.tsx`
- Modify: `apps/web/app/albums/[slug]/loading.tsx`
- Modify: `apps/web/app/reciters/loading.tsx`
- Modify: `apps/web/app/reciters/[slug]/loading.tsx`
- Modify: `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/loading.tsx`

- [ ] **Step 1: Re-skin `app/error.tsx`** to match the **Error boundaries** vocab section.
  - The "500" badge: `bg-[var(--color-error-50)]` light / `bg-[var(--color-error-950)]` dark with `text-[var(--color-error-500)]` (replace `bg-error-50 text-error-400 dark:bg-error-950 dark:text-error-300`). Either keep dual classes via `dark:` or use a token if vocab provides one — vocab does not, so dual classes stay.
  - Heading: `font-serif text-[36px] font-medium text-[var(--text)]` (replace `text-2xl font-semibold text-foreground`). Per vocab, error boundaries use **display-serif heading 36px**.
  - Body: `text-base text-[var(--text-dim)]` (replace `text-base text-muted-foreground`).
  - "Try again" button (primary): `bg-[var(--accent)] text-white hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 rounded-[8px] px-5 py-2.5 text-sm font-medium transition-colors` — replace the `bg-foreground text-background hover:bg-foreground/90 focus:ring-*` chain.
  - "Go to home" link (secondary CTA): `bg-[var(--input-bg)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 rounded-[8px] px-5 py-2.5 text-sm font-medium transition-colors` — replace the `border border-border bg-card ... hover:bg-muted` chain.
  - Padding the main wrapper: bump from `py-20` to `py-16 px-6` (vocab says padding 64px = 16 in Tailwind 4px-grid).

- [ ] **Step 2: Re-skin `app/not-found.tsx`** identically.
  - "404" badge: change `bg-muted text-muted-foreground` to `bg-[var(--surface)] text-[var(--text-dim)]` (page-bg parent — no card wrapper, so `--surface` is correct per hover-bg rule).
  - Heading: same serif 36px treatment.
  - Both CTAs ("Go to home", "Browse reciters"): home is primary, browse is secondary — use the same vocab classes as error.tsx.

- [ ] **Step 3: Re-skin `app/albums/loading.tsx`**.
  - Replace `bg-muted` skeleton placeholders with `bg-[var(--surface)] animate-pulse rounded-[8px]` per vocab **Skeleton placeholder**.
  - Any wrapper card surface that uses `bg-card border-border` → `bg-[var(--card-bg)] border-[var(--border)]`.
  - Container padding stays as-is.

- [ ] **Step 4: Apply the same skeleton swap to the remaining 4 loading.tsx files.**
  - `app/albums/[slug]/loading.tsx`
  - `app/reciters/loading.tsx`
  - `app/reciters/[slug]/loading.tsx`
  - `app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/loading.tsx`
  - For the track-level loading skeleton, the artwork-block placeholder should use `bg-[var(--surface)] animate-pulse rounded-[16px]` to match CoverArt rounding.

- [ ] **Step 5: Run `./dev qa` and verify it passes.**

- [ ] **Step 6: Manual visual smoke** — run `./dev web` and visit `/this-page-does-not-exist` (not-found), force throw in a server component for error.tsx (skip if cumbersome — code review of CSS swap is sufficient), and reload `/albums` / `/reciters/[slug]` to flash the skeleton during cold cache. Verify no semantic-token holdouts visible (no `bg-muted` greys, no `bg-card` literal greys).

- [ ] **Step 7: Commit.**
```bash
git add apps/web/app/error.tsx apps/web/app/not-found.tsx apps/web/app/albums/loading.tsx apps/web/app/albums/\[slug\]/loading.tsx apps/web/app/reciters/loading.tsx apps/web/app/reciters/\[slug\]/loading.tsx 'apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/loading.tsx'
git commit -m "feat(boundaries): re-skin error/not-found/loading to POC system"
```

---

## Row 11 — Protected user surfaces (profile + history)

**Files:**
- Modify: `apps/web/app/(protected)/layout.tsx` (verify chrome only)
- Modify: `apps/web/app/(protected)/profile/page.tsx`
- Modify: `apps/web/app/(protected)/profile/contributions/page.tsx`
- Modify: `apps/web/app/(protected)/history/page.tsx`
- Modify: `apps/web/src/components/profile/avatar-upload.tsx`
- Modify: `apps/web/src/components/profile/display-name-edit.tsx`
- Modify: `apps/web/src/components/history/history-list.tsx`

- [ ] **Step 1: Audit `(protected)/layout.tsx`**. Read the file. If it contains a chrome-styling class (background, text, border) using legacy tokens, swap per cheatsheet. If it's only a server-side auth guard with no UI, leave it.

- [ ] **Step 2: Re-skin `profile/page.tsx`** — 18 legacy-token instances (highest in Wave 3).
  - **Profile header card** (line 67): `border border-border bg-card p-6 shadow-sm` → `border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm rounded-[16px]`. Vocab says cards use radius 16px / padding 32px — bump from `p-6` (24px) to `p-8` (32px).
  - **Display-name edit subtree** (`<DisplayNameEdit>` component) handled in Step 7 below.
  - **Email + "change in settings" link** (lines 78–86): swap `text-muted-foreground` → `text-[var(--text-dim)]`; swap `text-xs text-muted-foreground hover:text-foreground` → `text-xs text-[var(--text-faint)] hover:text-[var(--text)] hover:underline`.
  - **Joined date** (line 87): `text-xs text-muted-foreground` → `text-xs text-[var(--text-faint)]`.
  - **Stat cards** (lines 97–123): wrappers `border border-border bg-card p-5 shadow-sm` → `border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm rounded-[16px]`. Stat number `text-3xl font-bold text-foreground` → `text-3xl font-serif font-medium text-[var(--text)]`. Sub-label `text-sm text-muted-foreground` → `text-sm text-[var(--text-dim)]`. "View library / View history" link → `text-xs text-[var(--text-faint)] hover:text-[var(--text)] hover:underline`.
  - **Recent history section heading** (line 128): `text-lg font-semibold text-foreground` → `text-2xl font-serif font-medium text-[var(--text)]` per vocab Section heading h2.
  - **"See all" link**: `text-sm text-muted-foreground hover:text-foreground hover:underline` → `text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:underline`.
  - **Empty state**: `py-6 text-center text-sm text-muted-foreground` → `py-12 text-center text-sm text-[var(--text-dim)]` (vocab says empty state = `var(--text-dim)` body copy; bump padding to `py-12` for breathing room).
  - **Track list** (lines 142–166): wrapper `divide-y divide-border rounded-lg border border-border bg-card` → `divide-y divide-[var(--border)] rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)]`. Each row's title `text-sm font-medium text-foreground` → `text-sm font-medium text-[var(--text)]`; date `text-xs text-muted-foreground` → `text-xs text-[var(--text-faint)]`. Add `hover:bg-[var(--surface-2)]` to each `<li>` (card-bg parent → surface-2 per hover-bg rule).
  - **NOTE (carryover task #22):** The recent-history list is rolling its own layout instead of using `<TrackRow>`. This is the kind of duplication noted in Wave 1+2 follow-up debt. Inline the `<TrackRow>` swap **only if** it's a 5-line change (`<TrackRow slug={entry.track.slug} title={entry.track.title} reciter={entry.track.reciter} reciterSlug={entry.track.reciterSlug} duration={entry.track.duration} />`); if it requires DTO changes, leave as-is and the swap stays in task #22.

- [ ] **Step 3: Run** `./dev qa` to confirm profile/page.tsx changes still typecheck and lint cleanly. (No unit tests for this page — visual smoke happens in Step 8.)

- [ ] **Step 4: Re-skin `profile/contributions/page.tsx`** — apply cheatsheet to all `text-muted-foreground` / `bg-card` / `border-border` instances. Heading should be serif per Typography. Use `<ContributionList>` component output if already styled; if not, that swap happens in Row 13 (contribution-list is in Row 13's file list).

- [ ] **Step 5: Re-skin `history/page.tsx`** — apply cheatsheet. Page heading `font-serif` weight 500. Empty state and list wrapper match the Profile recent-history treatment from Step 2.

- [ ] **Step 6: Re-skin `components/history/history-list.tsx`** — token swaps per cheatsheet. List rows use `--surface-2` hover (rows live inside the card wrapper).

- [ ] **Step 7: Re-skin `components/profile/avatar-upload.tsx` and `components/profile/display-name-edit.tsx`** — these are interactive client components. Token swaps per cheatsheet for backgrounds, borders, text. Buttons: secondary CTA classes from vocab.

- [ ] **Step 8: Run `./dev qa`** and verify pass.

- [ ] **Step 9: Manual visual smoke** — `./dev web`, log in, visit `/profile`, `/profile/contributions`, `/history`. Confirm POC palette + serif headings. Confirm hover delta is visible on history rows in **dark mode** specifically (the surface vs surface-2 collision lives in dark only).

- [ ] **Step 10: Commit.**
```bash
git add apps/web/app/\(protected\)/layout.tsx apps/web/app/\(protected\)/profile apps/web/app/\(protected\)/history apps/web/src/components/profile apps/web/src/components/history
git commit -m "feat(protected): re-skin profile + history surfaces to POC system"
```

---

## Row 12 — Settings

**Files:**
- Modify: `apps/web/app/(protected)/settings/page.tsx`
- Modify: `apps/web/src/components/settings/change-email-form.tsx`
- Modify: `apps/web/src/components/settings/change-password-form.tsx`
- Modify: `apps/web/src/components/settings/notifications-section.tsx`
- Modify: `apps/web/src/components/settings/delete-account-section.tsx`

- [ ] **Step 1: Re-skin `settings/page.tsx`** — apply cheatsheet. Page heading `font-serif` weight 500 36–48px. Each settings section (account, notifications, danger zone) is a card per vocab Surfaces — `bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-8`. Section h2 → `font-serif text-2xl font-medium text-[var(--text)]`. Subtle helper copy → `text-sm text-[var(--text-dim)]`.

- [ ] **Step 2: Re-skin `change-email-form.tsx`** per Forms vocab.
  - Field stack vertical, gap 24px (`space-y-6`).
  - Labels: `text-[13px] font-medium text-[var(--text-dim)] mb-2` (Inter 13px / weight 500 / mb 8px = `mb-2`).
  - Inputs: `bg-[var(--input-bg)] border border-[var(--border)] rounded-[8px] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2`.
  - Error message `role="alert" text-[13px] text-[var(--color-error-500)] mt-2`.
  - Help text `text-[13px] text-[var(--text-faint)] mt-2`.
  - Primary submit CTA per vocab (accent bg, white text, accent-soft hover).

- [ ] **Step 3: Re-skin `change-password-form.tsx`** identically.

- [ ] **Step 4: Re-skin `notifications-section.tsx`** — toggles should keep their existing accessible markup. Visual chrome only: card surface, label color, focus ring on the switch.

- [ ] **Step 5: Re-skin `delete-account-section.tsx`** — danger zone card. Use **Destructive CTA**: `bg-[var(--color-error-600)] text-white rounded-[8px] px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-error-700)] focus-visible:outline-2 focus-visible:outline-[var(--color-error-500)] focus-visible:outline-offset-2 transition-colors`.
  - Card border: subtle accent on the border to telegraph danger — `border border-[var(--color-error-500)]/30 bg-[var(--card-bg)]`. (If `--color-error-500` doesn't have an `/30` opacity-modifier-friendly definition in the token system, fall back to `border-[var(--color-error-200)]` for light, `border-[var(--color-error-900)]` for dark via `dark:` classes.)

- [ ] **Step 6: Run `./dev qa`** and confirm pass.

- [ ] **Step 7: Manual visual smoke** — log in, visit `/settings`. Confirm all four sections display POC chrome. Confirm input focus ring is the accent color, not the legacy ring color.

- [ ] **Step 8: Commit.**
```bash
git add apps/web/app/\(protected\)/settings apps/web/src/components/settings
git commit -m "feat(settings): re-skin /settings + nested forms to POC system"
```

---

## Row 13 — Contribute chrome + shared forms

**Files:** see file map above.

This row is the largest in line count (touches 13 files). The plan: chrome first, shared form primitives next, the three entity forms last (they consume the primitives).

- [ ] **Step 1: Add Contribute landing pattern to `docs/design/visual-vocabulary.md`.** Append a new section before the Lighthouse canary block:
  ```markdown
  ## Contribute landing (`/contribute`)

  - Centered single column, `Container` width.
  - Page heading: `font-serif` 36–48px weight 500 — "Contribute".
  - Sub-copy: `text-[var(--text-dim)] text-base mb-8` — one paragraph.
  - **"Create new" grid:** 3 cards in a `grid grid-cols-1 sm:grid-cols-3 gap-4`. Each card is `bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-6 hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 transition-colors block`. Inside each card: 24px icon (color `var(--accent)`), serif h3 24px weight 500, body copy `text-[var(--text-dim)]`.
  - **"Recent contributions" section:** below the grid, h2 serif 24px, then `<ContributionList>`.

  ## Form layout (contribute wizards)

  - **Page wrapper:** `Container size="md"` for the form viewport (max-width ~720px).
  - **Breadcrumb:** Inter 13px `text-[var(--text-dim)]`, separator `/` in `text-[var(--text-faint)]`. Current page name in `text-[var(--text)]`.
  - **Page heading:** serif 36px weight 500. Subtitle below: `text-base text-[var(--text-dim)]`.
  - **Form card:** `bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-8 mt-6`.
  - **Field stack, labels, inputs, errors, help text:** per existing Forms vocab.
  - **Action row:** sticky-bottom or fixed at form end, `flex items-center justify-end gap-3`. Cancel = secondary CTA, Submit = primary CTA.
  - **Image / audio uploaders:** dropzone is `border-2 border-dashed border-[var(--border)] rounded-[12px] p-8 text-center text-[var(--text-dim)] hover:border-[var(--accent)] transition-colors`. Selected-file preview keeps existing thumb but swaps wrapper to `bg-[var(--surface-2)] rounded-[8px] p-3`.
  - **Lyrics tabs:** tab strip `border-b border-[var(--border)]`, each tab `px-4 py-2 text-sm text-[var(--text-dim)] data-[state=active]:text-[var(--text)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent)]`.
  ```

- [ ] **Step 2: Re-skin `contribute/layout.tsx`.** Read the file; if it provides chrome (top nav for the contribute hub), apply cheatsheet swaps. Container width should match the wizard target (size=`md` for forms, size=`lg` for landing).

- [ ] **Step 3: Re-skin `contribute/page.tsx` (landing).** Apply the new vocab section from Step 1. Three cards: "Add reciter" (`/contribute/reciter/new`), "Add album" (`/contribute/album/new`), "Add track" (`/contribute/track/new`). Below: ContributionList of the user's recent submissions.

- [ ] **Step 4: Re-skin `contribute/contribution-list.tsx`.** Each row sits inside a card-bg container in the landing page → use `--surface-2` for hover. List wrapper `divide-y divide-[var(--border)] rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)]`. Status badges (pending/approved/rejected) use `bg-[var(--color-warning-50)] text-[var(--color-warning-700)]` / accent-soft / error-* per state — keep the existing semantic split, just swap to POC tokens.

- [ ] **Step 5: Re-skin `contribute/form-field.tsx`** per Forms vocab — wraps a label + input + optional error/help. Label `text-[13px] font-medium text-[var(--text-dim)] mb-2`, `*` for required is `text-[var(--color-error-500)]`. Input adopts the vocab Input classes via the wrapped `<Input>` shadcn primitive — verify the wrapper isn't applying overriding bg / border classes.

- [ ] **Step 6: Re-skin `contribute/slug-preview.tsx`** — small inline preview chip. Use `text-[13px] text-[var(--text-faint)]`. The preview value itself in `text-[var(--text-dim)]` with `font-mono`.

- [ ] **Step 7: Re-skin `contribute/parent-picker.tsx`** — search-as-you-type combobox. Listbox surface `bg-[var(--card-bg)] border border-[var(--border)] rounded-[8px] shadow-lg`. Each option `px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]` (the listbox is a card-bg surface, so hover uses surface-2). Highlighted/active option `bg-[var(--surface-2)]`.

- [ ] **Step 8: Re-skin `contribute/image-upload.tsx`** per the Image uploader pattern in the new vocab section. Dropzone `border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)]`. Preview thumb wrapper `bg-[var(--surface-2)]`.

- [ ] **Step 9: Re-skin `contribute/audio-upload.tsx`** identically (same dropzone treatment).

- [ ] **Step 10: Re-skin `contribute/lyrics-tabs.tsx`** per the Lyrics tabs pattern in the new vocab. Active tab gets `border-[var(--accent)]` underline. Inactive `text-[var(--text-dim)]`. Tab content area is `pt-4`.

- [ ] **Step 11: Re-skin `contribute/reciter-form.tsx`, `album-form.tsx`, `track-form.tsx`, `resubmit-form.tsx`.** These are composers — they import form-field, image-upload, etc. Per-file work is mostly: action-row buttons (Cancel + Submit) per vocab CTA classes; spacing between sections (`space-y-8`); section headings (h3 → `font-sans text-base font-semibold text-[var(--text)] mb-4`).

- [ ] **Step 12: Run `./dev qa`** and confirm pass.

- [ ] **Step 13: Run `./dev test apps/web` for any contribute unit tests** if they exist (`grep -rln "contribute" apps/web/src/__tests__ apps/web/src/components/contribute/__tests__ 2>&1`). If none, skip.

- [ ] **Step 14: Manual visual smoke** — log in, visit `/contribute`. Click into "Add reciter" → form should already display correctly because the form lives inside the page chrome that Row 14 will polish. Verify form-field, image-upload, lyrics-tabs all show POC tokens.

- [ ] **Step 15: Commit.**
```bash
git add docs/design/visual-vocabulary.md apps/web/app/contribute/layout.tsx apps/web/app/contribute/page.tsx apps/web/src/components/contribute
git commit -m "feat(contribute): re-skin landing + chrome + shared form primitives to POC system"
```

---

## Row 14 — Contribute new + edit wizards (page chrome)

**Files:** 6 wizard route files (see file map).

These pages already render Row 13's reskinned forms, so they only need page chrome: breadcrumb, page heading, container, surrounding layout per the new Form layout vocab section.

- [ ] **Step 1: Re-skin `contribute/reciter/new/page.tsx`.**
  - Wrap in `<Container size="md">`.
  - Breadcrumb: `Contribute / New reciter` per vocab.
  - Heading: `<h1 className="font-serif text-4xl font-medium text-[var(--text)]">New reciter</h1>`.
  - Subtitle: `<p className="text-base text-[var(--text-dim)] mt-2">...</p>`.
  - Form card wrapper: `<div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-8 mt-6"><ReciterForm /></div>`.

- [ ] **Step 2: Re-skin `contribute/album/new/page.tsx` and `contribute/track/new/page.tsx`** identically — same chrome, different breadcrumb text + form component.

- [ ] **Step 3: Re-skin `contribute/edit/reciter/[slug]/page.tsx`.** Same chrome, breadcrumb is `Contribute / Edit reciter / [name]`. Form is `<ReciterForm initialData={...} mode="edit" />` (or whatever the existing prop pattern is — preserve unchanged).

- [ ] **Step 4: Re-skin `contribute/edit/album/[reciterSlug]/[albumSlug]/page.tsx` and `contribute/edit/track/[reciterSlug]/[albumSlug]/[trackSlug]/page.tsx`** identically.

- [ ] **Step 5: Run `./dev qa`** and confirm pass.

- [ ] **Step 6: Manual visual smoke** — visit each of the 6 wizard routes (you may have to bypass auth via login for `/contribute/*`). Confirm breadcrumb, heading, form card chrome match the vocab.

- [ ] **Step 7: Commit.**
```bash
git add apps/web/app/contribute/reciter apps/web/app/contribute/album apps/web/app/contribute/track apps/web/app/contribute/edit
git commit -m "feat(contribute): re-skin new + edit wizard page chrome to POC system"
```

---

## Row 15 — Mod chrome + queue/audit/users

**Files:** see file map.

- [ ] **Step 1: Add Mod dashboard pattern to `docs/design/visual-vocabulary.md`.** Append before the Lighthouse canary block:
  ```markdown
  ## Mod dashboard + listings (`/mod`, `/mod/{queue,audit,users}`)

  - **Page heading:** serif 36–48px weight 500.
  - **Sub-nav:** horizontal row of `Link`s under the heading, `text-[14px] text-[var(--text-dim)] data-[active]:text-[var(--text)] data-[active]:font-medium`. Separator: 12px gap.
  - **Stat cards (`/mod` landing):** `grid grid-cols-2 sm:grid-cols-4 gap-4`. Each card: `bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-6`. Stat number `font-serif text-3xl font-medium text-[var(--text)]`. Sub-label `text-sm text-[var(--text-dim)] mt-1`.
  - **Listing tables (`/mod/queue`, `/mod/audit`, `/mod/users`):** per existing Tables vocab. Container is the `--card-bg` card (`rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden`); rows use `--surface-2` hover.
  - **Filters / search bar above the table:** `bg-[var(--input-bg)]` input per Forms; secondary-CTA buttons per CTA vocab.
  - **Role buttons (in users table):** Use the **Secondary CTA** classes for default, swap to **Primary CTA** classes for the active role. Active state visually persistent (no hover-only).
  ```

- [ ] **Step 2: Re-skin `mod/layout.tsx`.** This is shared chrome: heading + sub-nav. Apply the vocab pattern from Step 1.

- [ ] **Step 3: Re-skin `mod/page.tsx` (landing dashboard).** Apply the stat cards pattern. Each card links to its sub-route.

- [ ] **Step 4: Re-skin `mod/queue/page.tsx`.** Table per vocab. Header row `text-[13px] font-semibold text-[var(--text-dim)] px-4 py-3 border-b border-[var(--border-strong)]`. Body rows `text-sm text-[var(--text)] px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--surface-2)]`. Filter bar above table per Step 1.

- [ ] **Step 5: Re-skin `mod/audit/page.tsx`** identically.

- [ ] **Step 6: Re-skin `mod/users/page.tsx`** identically. Role buttons use the role-button component from Step 8.

- [ ] **Step 7: Re-skin `components/mod/load-more-{queue,audit,users}.tsx`.** These should already pass through the `LoadMore` Phase B primitive (which was reskinned in Wave 1). Token-swap any custom chrome around them.

- [ ] **Step 8: Re-skin `components/mod/role-button.tsx`** per vocab. Default state: secondary CTA classes. Active state (current role): `bg-[var(--accent)] text-white border border-[var(--accent)]`. Disabled state: `opacity-50 cursor-not-allowed`.

- [ ] **Step 9: Run `./dev qa`** and confirm pass.

- [ ] **Step 10: Manual visual smoke** — log in as a mod user, visit `/mod`, `/mod/queue`, `/mod/audit`, `/mod/users`. Confirm stat cards, table chrome, sub-nav active state.

- [ ] **Step 11: Commit.**
```bash
git add docs/design/visual-vocabulary.md apps/web/app/mod/layout.tsx apps/web/app/mod/page.tsx apps/web/app/mod/queue apps/web/app/mod/audit apps/web/app/mod/users apps/web/src/components/mod/load-more-queue.tsx apps/web/src/components/mod/load-more-audit.tsx apps/web/src/components/mod/load-more-users.tsx apps/web/src/components/mod/role-button.tsx
git commit -m "feat(mod): re-skin dashboard + queue/audit/users + role-button to POC system"
```

---

## Row 16 — Mod submission detail (review workspace)

**Files:** see file map.

The submission detail page is the largest single file in Wave 3 (333 lines). It composes a diff view, action panel, and metadata sidebar — needs a dedicated vocab entry.

- [ ] **Step 1: Add Submission review pattern to `docs/design/visual-vocabulary.md`.** Append before the Lighthouse canary block:
  ```markdown
  ## Submission review (`/mod/submissions/[id]`)

  - **Two-column layout:** `grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8`. Main column = diff + actions. Right column = metadata sidebar.
  - **Page heading:** serif 28px weight 500 — "Submission #ID" (or "Reviewing submission for [entity]").
  - **Status badge** (top of header): per Status badges below.
  - **Diff card:** `bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-8`. Each field row: label `text-[13px] font-medium text-[var(--text-dim)] mb-2`, two stacked values:
    - Old: `bg-[var(--color-error-50)] text-[var(--text)] dark:bg-[var(--color-error-950)]/40 px-3 py-2 rounded-[6px] line-through opacity-70`
    - New: `bg-[var(--color-success-50)] text-[var(--text)] dark:bg-[var(--color-success-950)]/40 px-3 py-2 rounded-[6px] mt-1`
    - If only one side present (add or remove), render only that side.
  - **Status badges:** pill `px-2 py-0.5 rounded-full text-[12px] font-medium`. Pending: `bg-[var(--color-warning-50)] text-[var(--color-warning-700)]`. Approved: `bg-[var(--color-success-50)] text-[var(--color-success-700)]`. Rejected: `bg-[var(--color-error-50)] text-[var(--color-error-700)]`. Dark variants via `dark:` classes — use the corresponding `-950` / `-300` tokens.
  - **Action panel (in main column, below diff):** `flex items-center justify-end gap-3 mt-6`. Approve = primary CTA. Reject = destructive CTA. Defer/skip = secondary CTA.
  - **Metadata sidebar:** `bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-6 sticky top-24 self-start`. Each meta row: label `text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1`, value `text-sm text-[var(--text)]`.
  - **Field-diff component:** consumed inside the diff card; uses the old/new pill treatment above.
  - **Apply button** (visible only when status is approved-but-not-applied): primary CTA, separate row at bottom of main column.
  ```

- [ ] **Step 2: Re-skin `app/mod/submissions/[id]/page.tsx`.** Apply the new vocab pattern from Step 1. The 333-line page splits into: header (status + heading), diff card, action panel, metadata sidebar. Replace each `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted` per cheatsheet. The diff card section's old/new colors per Step 1's spec.

- [ ] **Step 3: Re-skin `components/mod/submission-row.tsx`.** This row appears in `/mod/queue` listing — apply Tables vocab + status badge from Step 1. Make sure hover uses `--surface-2` (row sits inside card-bg table).

- [ ] **Step 4: Re-skin `components/mod/badges.tsx`** to use the Status badges spec from Step 1. This is the canonical badge component — submission-row, queue-row, audit-row should all consume it.

- [ ] **Step 5: Re-skin `components/mod/field-diff.tsx`** to render the old/new pill treatment from Step 1. The component receives `old: string | null` and `new: string | null` (verify actual prop names by reading the file). Render only the side(s) present. Multi-line values wrap.

- [ ] **Step 6: Re-skin `components/mod/review-actions.tsx`** — Approve / Reject / Defer buttons per the action-panel spec. Approve = primary CTA, Reject = destructive CTA, Defer = secondary CTA. Confirm dialogs (if any) use the existing `dialog.tsx` Phase B component (already reskinned).

- [ ] **Step 7: Re-skin `components/mod/apply-button.tsx`** — primary CTA + spinner state during application. Loading state: `disabled:opacity-50 disabled:cursor-wait` plus the Phase B `Spinner` icon if available.

- [ ] **Step 8: Run `./dev qa`** and confirm pass. The `field-diff.test.tsx` unit test must still pass (no semantic changes — just CSS classes).

- [ ] **Step 9: Manual visual smoke** — visit `/mod/submissions/[id]` for a real pending submission (use seeded data from `./dev seed` if no real submissions exist). Confirm diff card pills, action buttons, metadata sidebar.

- [ ] **Step 10: Commit.**
```bash
git add docs/design/visual-vocabulary.md 'apps/web/app/mod/submissions/[id]/page.tsx' apps/web/src/components/mod/submission-row.tsx apps/web/src/components/mod/badges.tsx apps/web/src/components/mod/field-diff.tsx apps/web/src/components/mod/review-actions.tsx apps/web/src/components/mod/apply-button.tsx
git commit -m "feat(mod): re-skin submission review workspace + badges/field-diff to POC system"
```

---

## Row 17 — End-of-wave QA + push + final review

- [ ] **Step 1: Run the full QA gate.**
```bash
./dev qa
```
Must pass. If any test breaks, fix before proceeding.

- [ ] **Step 2: Spot-check for missed legacy tokens.**
```bash
grep -rln "text-foreground\|text-muted-foreground\|bg-card\|bg-muted\|border-border\|bg-background" apps/web/app apps/web/src/components/contribute apps/web/src/components/mod apps/web/src/components/profile apps/web/src/components/settings apps/web/src/components/history 2>&1
```
Expected: empty (or only references inside test files / mocks). If any production file still matches, swap per cheatsheet and add to the most-recent commit.

- [ ] **Step 3: Run e2e in background to catch regressions.**
```bash
./dev e2e
```
(If using `run_in_background`, monitor for completion. If the test suite was flaky pre-Wave-3, accept the same baseline level of failures — only new failures are blockers.)

- [ ] **Step 4: Push the branch.**
```bash
git push origin phase-2.5-poc-reskin
```

- [ ] **Step 5: Dispatch the final code-reviewer subagent** over the full Wave 3 commit range (from `08d8c1d`..HEAD). Brief: re-skin to POC system, no functional changes, hover-bg rule must be honored on all card-bg-parented hovers. Expected output: ✅ approved, or a list of Important/Nit issues to address before merge.

- [ ] **Step 6: Update `docs/superpowers/specs/2026-04-24-poc-design-port-design.md` and the project roadmap doc** to mark Wave 3 as shipped.

- [ ] **Step 7: Mark task #34 (this row) and the parent Wave 3 set complete** via TaskUpdate.

- [ ] **Step 8: Surface remaining Wave 1+2 follow-up debt (task #22) to the user** as the next likely follow-up — re-adopt TrackRow in home/popular-tracks + top-nawhas-table, consolidate album cards, extract formatDuration, etc.

---

## Self-review checklist

- [x] Spec coverage: every page in Wave 3's scope has a row.
- [x] No placeholders ("TBD", "implement later") in any task body.
- [x] Token mapping cheatsheet covers every shadcn semantic class found by the audit grep.
- [x] Hover-bg rule called out where it matters (Row 11 history rows, Row 13 parent-picker listbox, Row 15 mod tables).
- [x] Vocab doc extensions are written inline as part of the rows that ship them (Row 13, 15, 16) — not deferred.
- [x] Each row commits independently with focused message.
- [x] Final QA + push + review row exists (Row 17).
