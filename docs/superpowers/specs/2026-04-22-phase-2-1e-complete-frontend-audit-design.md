# Phase 2.1e — Complete Frontend Audit (Design)

**Status:** Design approved 2026-04-22 · Implementation plan not yet written
**Author:** Asif (brainstormed with Claude)
**Parent roadmap:** [`2026-04-21-rebuild-roadmap.md`](./2026-04-21-rebuild-roadmap.md), new sub-project between Phase 2.2 and Phase 2.3

## Context

Phase 2.1 produced a narrow audit: token tables comparing legacy Vuetify values against the rebuild's declared `@theme` tokens, and page-skeleton entries per live route. It never opened the application's Vue-equivalent React files to verify what tokens those files *actually consumed*.

That assumption failure bit Phase 2.2 directly: the token flip in `apps/web/app/globals.css` re-declared `--color-primary-*` / `--color-secondary-*` / `--color-neutral-*` ramps from green/amber/slate to red/zinc/orange, expecting the rebuild's existing components to "pick up the new values via the cascade." They did not. Grep of the web app's components turned up **zero** call sites of `bg-primary-*`, `bg-secondary-*`, or `bg-neutral-*`. Meanwhile there are 161 uses of `bg-gray-*`, 362 of `text-gray-*`, 46 of `bg-white` / `bg-black`, and ~15 hardcoded `bg-green-*` / `bg-amber-*` / `bg-emerald-*` / `bg-orange-*` / `bg-yellow-*` — none of which route through our token layer. Phase 2.2's visible impact was therefore limited to the ~30-40 surfaces that Tasks 14-17 swapped to primitives (which DO consume semantic tokens).

Phase 2.1e closes that gap by performing a **complete, file-by-file audit** of the frontend, across seven axes chosen to surface actionable work for Phase 2.3 (page redesigns) and for post-launch cleanup.

## Goals

1. **Definitive consumer map** of every design token, primitive, color utility, and hardcoded value the frontend uses today.
2. **Actionable backlog** organized so Phase 2.3's per-page specs can consume a single document per page without scanning the whole audit.
3. **Correctness self-correction** for Phase 2.1 — the per-file depth means future "the app should re-theme via cascade" claims can be verified before they're made.

## Non-Goals

- No fixing during the audit. Findings get recorded; remediation belongs in Phase 2.3 or follow-up sub-projects.
- No visual verification against production (that's Phase 2.1b — still deferred).
- No renaming files, moving files, or restructuring directories during the audit.
- No decisions about *which* primitives to prefer or *how* to refactor — just cataloguing current state.

## Approach

**Dispatched subagent-per-directory** with a standardized checklist. Seven directories of scope (each a natural subtree under `apps/web/src/components/`), plus `apps/web/app/` page files and `apps/web/src/lib/`. Each subagent produces partial per-axis findings which the controller merges into per-axis master documents.

**Methodology — static review, no runtime.** All audit is static: reading `.tsx` / `.ts` files, grepping for patterns. No browser, no dev server, no screenshots. Production visual verification is a separate pass (2.1b) that the audit output will help prioritize.

**Tooling:** ripgrep + file reads. The subagents do not execute code.

## Audit Axes

Each of the seven axes below becomes one master document under `docs/design/audit-complete/`. Findings attach to file paths; a given file appears in multiple axis documents if it has findings in multiple dimensions.

### 1. Token consumption (`tokens.md`)

**Inventory** every styling pattern each file uses. For each file, categorize its color/radius/shadow/spacing usage into:

- **Semantic tokens** — `bg-background`, `bg-primary`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`, etc.
- **Ramped palette tokens** — `bg-primary-500`, `bg-secondary-700`, `text-neutral-600`, etc. (our declared ramps)
- **Tailwind default palette** — `bg-gray-*`, `text-gray-*`, `bg-green-*`, `bg-amber-*`, `bg-emerald-*`, `bg-orange-*`, `bg-yellow-*`, `bg-red-*`, `bg-blue-*`, etc. (not going through our tokens)
- **Literal colors** — `bg-white`, `bg-black`, `text-white`, arbitrary hex / rgb / css-var values
- **Radii** — `rounded`, `rounded-md`, `rounded-lg`, `rounded-full`, `rounded-[Npx]`, or a radius utility from a primitive
- **Shadows** — `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-[...]`, or primitive-sourced
- **Spacing** — arbitrary `p-[Npx]` / `m-[Npx]` / gap-* values that fall off the 4px grid

Output is a table keyed by file path with one row per file and columns for each category (counts + sample class lists).

### 2. Dark-mode handling (`dark-mode.md`)

For each file, record:

- **Dark variant coverage** — does the file declare `dark:*` variants for its color classes?
- **Mode-agnostic via tokens** — does the file rely on semantic tokens that auto-flip in dark (`bg-background`, `text-foreground`) instead of explicit `dark:` variants?
- **Dark-mode broken or incomplete** — files that reference a light-mode color with no dark counterpart (e.g., `bg-white` with no `dark:bg-gray-900`) or declare a dark variant only for some properties but not others (e.g., `bg-white dark:bg-gray-900` but `text-gray-900` unchanged).
- **Dark-mode untested or bespoke** — files that were never written with dark mode in mind (probably pre-dark-mode era of the rebuild).

Output: three lists — Good / Mixed / Broken — with file paths and one-line explanations.

### 3. Responsive coverage (`responsive.md`)

For each file, record:

- **Breakpoint-adaptive patterns** — uses of `sm:`, `md:`, `lg:`, `xl:`, `2xl:` prefixes; patterns like `flex-col md:flex-row` or `hidden md:flex`.
- **Mobile-only / desktop-only** — `hidden md:flex` (desktop), `md:hidden` (mobile).
- **Genuinely responsive vs viewport-gated** — does the file actually rearrange layout at breakpoints, or just show/hide chunks?
- **Missing-breakpoint concerns** — files that use fixed widths / heights / grid-cols without responsive variants.

Output: table per file noting breakpoint coverage + any flagged concerns.

### 4. Primitive-replacement opportunities (`primitives-replacement.md`)

For each file, record:

- **Consumes a `@nawhas/ui` primitive** — imports `Button`, `Card`, `Dialog`, `Tabs`, `DropdownMenu`, `Tooltip`, `Sheet`, `Input`, `Select`, `Badge`, `SectionTitle`.
- **Reinvents a primitive** — renders a `<button className="rounded-md ...">` instead of `<Button>`; a card-shaped div instead of `<Card>`; a bare `<input>` instead of `<Input>`; a hand-rolled menu / popover / tooltip instead of the Radix-backed primitive.
- **Could use but doesn't** — primitive exists, file should use it but has ad-hoc markup.
- **No primitive applies** — file is genuinely novel or domain-specific and doesn't have a primitive fit.

Output: a prioritized replacement backlog keyed by primitive (Button replacements, Card replacements, etc.) with file paths and line numbers.

### 5. Accessibility (`accessibility.md`)

For each file, record:

- **ARIA coverage** — aria-label, aria-labelledby, aria-describedby, aria-expanded, aria-pressed, aria-hidden. Missing where expected.
- **Keyboard navigation** — tabindex, onKeyDown handlers, focus management. `div`-as-button anti-patterns.
- **Semantic HTML** — `<button>` vs `<div role="button">`; `<a>` vs `<span>`; list semantics (`<ul>` / `<ol>` / `<nav>`); heading hierarchy (`<h1>` / `<h2>`).
- **Focus-visible coverage** — files rendering interactive elements without explicit focus styling when the semantic-token focus-visible rule doesn't cover them.
- **Screen-reader text** — `sr-only` coverage for icon-only controls and visually-hidden labels.

Output: prioritized list of issues (Critical / Important / Nice-to-have) with file paths.

### 6. Legacy-parity gap (`legacy-gap.md`)

Compared against Phase 2.1's `layouts.md` entries (per-page skeletons) and production `nawhas.com` behavior:

- **Missing affordances** — interactions, UI regions, copy present in legacy but absent in rebuild (Home hero, per-album vibrant background, lyrics highlight sync, etc. — already known, plus any new findings).
- **Divergent patterns** — rebuild does something differently (e.g., search-as-route vs search-as-dialog) even if both are valid.
- **Copy or microcopy gaps** — legacy has specific wording the rebuild hasn't ported (AuthReason contextual copy, feedback link, etc.).

Output: per-page checklist that 2.3's per-page specs can consume directly.

### 7. Dead / suspect code (`dead-code.md`)

For each file, record:

- **TODO / FIXME / HACK comments** — with the surrounding context and a one-line recommendation.
- **Commented-out code** — remove or keep with explanation.
- **Unused exports** — type definitions, components, or utilities that no consumer imports.
- **Orphaned state / props** — state variables never read, props never used.
- **Components with no route that renders them** — candidates for deletion.

Output: list of files with one-line findings and a suggested action (delete / rework / investigate).

## Scope: files and directories covered

**In scope (every file under):**
- `apps/web/app/` — every `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts` (if any)
- `apps/web/src/components/` — every `.tsx` in every subdirectory (layout, player, cards, auth, contribute, mod, library, search, tracks, home, albums, lyrics, theme, ui, etc.)
- `apps/web/src/hooks/` — every hook file
- `apps/web/src/lib/` — client-relevant utilities (skip server-only modules unless they render markup)

**Out of scope:**
- `apps/web/src/server/` — server routers, tRPC handlers (back-end, no markup)
- `apps/web/src/__tests__/` — test files (test *subjects* are in scope; test code itself is not)
- `apps/web/src/i18n/` — translation infrastructure (messages in `apps/web/messages/*.json` are user-facing but audit can note copy-gap findings in axis 6, not per-file)
- `apps/web/e2e/` — Playwright specs (not user-facing)
- `apps/web/app/api/` — API route handlers (not user-facing)
- `packages/ui/src/components/` — primitives we just shipped; their internal classes are intentional

**Approximate file count to audit:** ~200 files across 12-15 subdirectories.

## Subagent Dispatch Plan

The audit is decomposed by subdirectory (11 subagent passes), each with a standardized checklist. Each subagent produces partial findings for all seven axes, written to per-axis shared docs (subagents append; controller can reconcile).

**Subagent passes** (one per subtree):

1. `apps/web/app/` — page-level files
2. `apps/web/src/components/layout/` — header, footer, mobile-nav, user-menu, container, page-layout, providers
3. `apps/web/src/components/player/` — PlayerBar, MobilePlayerOverlay, QueuePanel, track-play-button, PlayerPanels
4. `apps/web/src/components/{cards,home,albums,reciters}/` — content card + home-page component families
5. `apps/web/src/components/tracks/` + `apps/web/src/components/lyrics/` — Track-page surfaces
6. `apps/web/src/components/{auth,contribute}/` — form-driven components
7. `apps/web/src/components/{library,search,mod}/` — list-driven components
8. `apps/web/src/components/{theme,ui}/` — utility / helper components (ArabicText, UrduText, skeletons, empty-state, etc.)
9. `apps/web/src/components/` — any top-level components not in subdirectories (SaveButton, LikeButton, etc.)
10. `apps/web/src/hooks/` — hook files (less visual, more shape-checks for patterns / types)
11. `apps/web/src/lib/` — client utilities (only those with markup/styling implications)

**Controller responsibilities** between passes:
- Merge subagent findings into the seven per-axis docs without duplication.
- Spot-check at least one file per subtree to catch subagents that over/under-report.
- Track progress across the 11 passes.

**Expected time:** ~2-4 hours of subagent work total (roughly 15-20 min per subtree), plus controller merging.

## File Structure

```
docs/design/audit-complete/
  README.md            (index + methodology recap + cross-links)
  tokens.md            (axis 1)
  dark-mode.md         (axis 2)
  responsive.md        (axis 3)
  primitives-replacement.md  (axis 4)
  accessibility.md     (axis 5)
  legacy-gap.md        (axis 6)
  dead-code.md         (axis 7)
```

Eight files total. Each axis doc is organized by the dispatch-plan's subtree order so a 2.3 Home-page spec can read the Home + shared-layout sections across all seven axes quickly.

## Verification

No code changes → no CI gate. Sanity checks before marking the audit complete:

- Every in-scope file appears in at least one axis doc (each file must be read by at least one subagent and produce at least one finding — even "no issues" counts).
- Every axis doc has findings for every subtree (so no subagent silently skipped its assignment).
- README.md cross-links all seven axis docs and summarizes top-5 findings per axis.
- Spot-check sample: at least one file from each subtree is manually verified by the controller to confirm subagent findings match reality.

## Commit Cadence

One commit per subtree pass is overkill. Prefer:
- **One commit per axis doc** (seven commits) — after all 11 subagents finish, merge their findings into each axis doc and commit.
- **One closeout commit** — README.md + roadmap update.

So ~8 commits total. Direct to `main` per user preference.

## Risks

- **Subagent variance.** Eleven subagents each interpreting the checklist differently will produce inconsistent findings. Mitigation: every subagent gets the exact same checklist prompt template; controller spot-checks after each pass; per-axis merge step harmonizes format.
- **Scope creep into "fixing."** Subagents must not change code. Mitigation: explicit instruction in the dispatch prompt; verify no uncommitted changes after each pass.
- **Catalog fatigue.** A 200-file × 7-axis catalog is tedious to read. Mitigation: README provides a top-findings summary + cross-links; per-axis docs organized by subtree for localized consumption.
- **Overlap with previously-done Phase 2.1.** Some of this work was nominally in 2.1's scope. Mitigation: 2.1e supersedes 2.1's token-consumption claims specifically; other 2.1 outputs (layouts.md page skeletons) remain authoritative unless an axis finding contradicts them (and then 2.1e wins).

## Open Questions

None blocking. Two to flag for later:

1. Should axis 6 (legacy-parity gap) also open legacy `nawhas/nawhas@master` files to cross-check interaction patterns that didn't make it into Phase 2.1's `layouts.md`? Currently no — the audit trusts 2.1's layout entries as ground truth for legacy behavior, and cross-references rebuild code only.
2. Should the audit fold in `apps/web/messages/*.json` as a copy audit? Currently no — copy gaps land in axis 6 at the file level (which component uses which key), not in a standalone translations audit.

## What this document is *not*

This is a design for Phase 2.1e specifically. It does not dictate remediation order for findings (that's 2.3's call). It does not prescribe which primitive should replace which ad-hoc pattern (the audit describes current state; 2.3 specs make the replacement calls).
