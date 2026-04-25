# Visual Vocabulary — Routes Without a POC Reference

This document captures the visual rules for re-skinning routes in Phase 2.5
that the [`nawhas/new-design-poc`](https://github.com/nawhas/new-design-poc)
prototype does not cover. Phase C (Pages) treats this as the authority
for those routes; per-PR debates settle here, not on the PR thread.

Routes covered: `(auth)/*` (login, register, forgot-password, reset-password,
verify-email, check-email), `(protected)/profile`, `(protected)/settings`,
`(protected)/library/history`, `/search`, `/mod/queue`, `/mod/audit`,
`/mod/users`, `/contribute/edit/*`, every `error.tsx` / `not-found.tsx` /
`loading.tsx` boundary.

## Surfaces

- **Page background:** `var(--bg)` — `#0a0a0b` dark, `#ffffff` light.
- **Content card:** `var(--card-bg)` with `1px solid var(--border)`, radius 16px, padding 32px.
- **Form input background:** `var(--input-bg)` with `1px solid var(--border)`, radius 8px, padding 12px 16px.

### Hover-bg rule (avoid the dark-mode collision)

`--card-bg` and `--surface` resolve to **the same value** in dark mode (`#141416`). An element with `bg-[var(--card-bg)]` parent that hovers to `--surface` produces zero visual delta in dark mode — a common drift that surfaced repeatedly across Wave 1 / Wave 2 (LoadMore primitive, LibraryTrackRow, top-nawhas-table, search pagination).

The rule:

- Element sits **on the page background** (`--bg` parent, no card wrapper) → `hover:bg-[var(--surface)]` is correct.
- Element sits **inside a `--card-bg` container** (cards, list rows) → use `hover:bg-[var(--surface-2)]` for visible delta in both themes.

`--surface-2` is `#1a1a1d` dark / `#f4f4f5` light — one step deeper than `--surface` in both themes.

## Typography

- **Page heading (h1):** `font-serif` (Fraunces), 36–48px, weight 500, color `var(--text)`.
- **Section heading (h2):** `font-serif`, 24–28px, weight 500.
- **Subheading (h3):** `font-sans` (Inter), 16px, weight 600, color `var(--text)`.
- **Body:** Inter 15px / line-height 1.6 / color `var(--text)`.
- **Secondary body:** color `var(--text-dim)`.
- **Captions / metadata:** Inter 13px, color `var(--text-faint)`.

## CTAs

- **Primary:** `bg-[var(--accent)] text-white hover:bg-[var(--accent-soft)]`, radius 8px, padding 10px 20px, weight 500, transition colors.
- **Secondary:** `bg-[var(--input-bg)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-strong)]`, radius 8px, padding 10px 20px.
- **Destructive:** `bg-[var(--color-error-600)] text-white`, radius 8px.
- **Ghost / icon-only:** `text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--input-bg)]`, radius 6px, padding 8px.

## Empty / loading / error states

- **Skeleton placeholder:** `bg-[var(--surface)] animate-pulse rounded-[8px]`.
- **Empty state:** centered, `var(--text-dim)` body copy, accent CTA below.
- **Error state:** centered, `var(--color-error-500)` 24px icon + `var(--text)` heading + `var(--text-dim)` body + accent CTA to retry.
- **Auth-gate redirect:** match `(auth)/*` card treatment — centered card on `var(--surface)`, accent CTA labelled with the contextual `AuthReason` copy.

## Forms

- **Field stack:** vertical, gap 24px between fields.
- **Label:** Inter 13px weight 500 color `var(--text-dim)`, mb 8px.
- **Input:** see Surfaces.
- **Error message:** Inter 13px color `var(--color-error-500)`, role `alert`, mt 8px.
- **Help text:** Inter 13px color `var(--text-faint)`, mt 8px.
- **Required asterisk:** rendered via `aria-required` on the input + visible `*` in `var(--color-error-500)` after the label (already shipped in Phase 2.3).

## Tables

- **Header:** Inter 13px weight 600 color `var(--text-dim)`, padding 12px 16px, border-bottom `var(--border-strong)`.
- **Cell:** Inter 14px color `var(--text)`, padding 12px 16px, border-bottom `var(--border)`.
- **Hover row:** background `var(--surface)`.

## Modals (`packages/ui/src/components/dialog.tsx` — already shipped)

- Background overlay: `bg-[var(--bg)]/80 backdrop-blur-sm`.
- Dialog surface: `var(--card-bg)` with `1px solid var(--border)`, radius 16px, max-width 480px.
- Title: serif 24px weight 500.
- Action row: right-aligned at bottom, primary CTA on the right.

## Auth surfaces (`(auth)/*`)

- Centered card, max-width 400px, vertically centered in viewport.
- Card on `var(--surface)`, padding 40px, radius 16px, `1px solid var(--border)`.
- Page heading: serif 28px weight 500.
- Form fields per Forms above.
- "Switch flow" link (e.g. "Don't have an account? Sign up") below CTA, Inter 13px color `var(--text-dim)` with accent on hover.
- AuthReason contextual copy (resolved in Phase 2.1 audit) renders above the form, Inter 14px color `var(--text-dim)`.

## Loading boundaries (`loading.tsx`)

- Full-page: render the page's expected skeleton (e.g. for `/reciter/[slug]`, render skeleton avatar + name + 4-6 skeleton track rows).
- In-component: use the skeleton placeholder pattern.

## Error boundaries (`error.tsx`, `not-found.tsx`)

- Centered, padding 64px.
- Display-serif heading 36px.
- Body copy `var(--text-dim)` 16px.
- Accent CTA: "Go home" / "Try again".

---

This vocabulary is intentionally narrow. Anything not specified above defaults to the corresponding Phase B component or POC reference. If a Phase C row needs a treatment that this doc does not cover, extend this doc as part of that row's commit.

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

## Mod dashboard + listings (`/mod`, `/mod/{queue,audit,users}`)

- **Page heading:** serif 36–48px weight 500.
- **Sub-nav:** horizontal row of `Link`s under the heading, `text-[14px] text-[var(--text-dim)] data-[active]:text-[var(--text)] data-[active]:font-medium`. Separator: 12px gap.
- **Stat cards (`/mod` landing):** `grid grid-cols-2 sm:grid-cols-4 gap-4`. Each card: `bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-6`. Stat number `font-serif text-3xl font-medium text-[var(--text)]`. Sub-label `text-sm text-[var(--text-dim)] mt-1`.
- **Listing tables (`/mod/queue`, `/mod/audit`, `/mod/users`):** per existing Tables vocab. Container is the `--card-bg` card (`rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden`); rows use `--surface-2` hover.
- **Filters / search bar above the table:** `bg-[var(--input-bg)]` input per Forms; secondary-CTA buttons per CTA vocab.
- **Role buttons (in users table):** Use the **Secondary CTA** classes for default, swap to **Primary CTA** classes for the active role. Active state visually persistent (no hover-only).

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

---

## Lighthouse canary — Phase B end (2026-04-24)

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Performance | 0.98 | ≥ 0.8 | PASS |
| Accessibility | 0.97 | ≥ 0.95 | PASS |
| FCP | 1600ms | ≤ 2000ms | PASS |
| LCP | 1600ms | ≤ 2500ms | PASS |
| CLS | 0.063 | ≤ 0.1 | PASS |

Result: PASS — all five thresholds cleared on the median of 3 runs against the prod-like Docker stack (`docker-compose.yml` + `docker-compose.ci.yml`, `next start -p 3100`) at `http://localhost:3100/`. Phase C cleared to begin: Y.

Fix-forwards applied during the canary (folded into the same B.4 commit):

1. **Dropped the Fraunces `axes: ['opsz']` declaration in `apps/web/app/layout.tsx`.** Next.js 16 / Turbopack rejects `axes` whenever `weight` is specified ("Axes can only be defined for variable fonts when the weight property is nonexistent or set to `variable`"). Pinned weights (300/400/500/600) are load-bearing across every heading and brand surface, so we kept the weight list and dropped the optical-size axis rather than swap to `weight: 'variable'`. The build failed before this fix; the axis itself had no measurable perf cost because the build wouldn't complete with it on.
2. **Forced `next start -p 3100` in `docker-compose.web-prod.yml`.** The base compose publishes `3100:3100` and the container healthcheck plus `.lighthouserc.json` both target `:3100`, but `next start` defaults to PORT 3000 and never read `INTERNAL_LISTEN_PORT` (that env is only consumed by the Edge middleware proxy). Without `-p 3100` the container came up but never passed its healthcheck. This was a latent bug in the CI overlay — the GH Actions `lighthouse` job has `continue-on-error: true`, which is why nobody had noticed.
