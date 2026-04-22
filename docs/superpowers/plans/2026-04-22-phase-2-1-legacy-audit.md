# Phase 2.1 — Legacy Visual Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce three comparative reference docs under `docs/design/` (`README.md`, `tokens.md`, `layouts.md`) that capture legacy `nawhas.com`'s design tokens and page layouts side-by-side with the current rebuild's, serving as the source of truth for Phase 2.2 and 2.3.

**Architecture:** Code-first static audit of `github.com/nawhas/nawhas@master` performed entirely via `gh api` — no clone, no running instance. Every value carries a `nawhas/nawhas:<path>#Lx-y` provenance citation. Values that can't be extracted code-first are marked `deferred: visual verify` rather than guessed. Three commits direct to `main`, in order tokens → layouts → README (per user's commit-to-main preference for this repo).

**Tech Stack:** `gh` CLI, markdown, the engineer's own eyes. No code execution required.

---

## Pre-flight

This plan does not run code or open a dev server. It reads files on GitHub via `gh api` and writes markdown locally.

**Smoke-check your `gh` access:**

```bash
gh api repos/nawhas/nawhas --jq '.default_branch'
# Expected output: master
```

If that fails, authenticate (`gh auth status`) before proceeding. Everything else in this plan assumes `gh api` works.

**Create the docs directory:**

```bash
mkdir -p /home/asif/dev/nawhas/nawhas-rebuild/docs/design
```

**Keep this spec open for reference while executing:** `docs/superpowers/specs/2026-04-22-phase-2-1-legacy-audit-design.md`. Every task below references sections of that spec by number.

**Working-notes scratchpad:** Several tasks in Phase A produce raw notes (file inventories, route lists) that are inputs to later tasks but not committed. Keep them in session context or a local `.audit-notes.md` that you do not commit — it is superseded by the final `README.md`.

---

## Phase A — Discovery (no commits)

### Task 1: Inventory the legacy repo's theme surface area

**Why this comes first:** Every subsequent tokens task cites a file and line range. If those files are misidentified, every citation is wrong. This task resolves the authoritative source-of-truth ladder for each token family before anyone writes a row.

**Files:**
- Read (remote, via `gh api`): `nuxt/vuetify.options.ts`, `nuxt/nuxt.config.js`, `nuxt/assets/` tree, `nuxt/package.json`
- Create (local, scratch): `docs/design/.audit-notes.md` — git-ignored working file

- [ ] **Step 1: Confirm the frontend is at `nuxt/`**

```bash
gh api repos/nawhas/nawhas/contents/ --jq '.[] | select(.type=="dir") | .name'
```

Expected: output includes `nuxt` (already confirmed during brainstorming, this is a sanity check).

- [ ] **Step 2: Fetch the Vuetify theme config**

```bash
gh api repos/nawhas/nawhas/contents/nuxt/vuetify.options.ts --jq '.content' | base64 -d > /tmp/vuetify.options.ts
wc -l /tmp/vuetify.options.ts
```

Expected: a non-empty TypeScript file. Read it end-to-end. Note: theme colors, dark-mode overrides, icons, any Vuetify component defaults.

- [ ] **Step 3: Fetch the Nuxt config**

```bash
gh api repos/nawhas/nawhas/contents/nuxt/nuxt.config.js --jq '.content' | base64 -d > /tmp/nuxt.config.js
```

Read end-to-end. Note: Google Fonts modules, global SCSS imports, CSS modules setup, any theme overrides.

- [ ] **Step 4: List the SCSS assets tree**

```bash
gh api repos/nawhas/nawhas/contents/nuxt/assets --jq '.[] | "\(.type)\t\(.name)"'
```

If `assets/` contains subdirectories (likely `scss/`, `css/`, `fonts/`), recurse into each with the same call. Capture the full flat list of SCSS file paths.

- [ ] **Step 5: Fetch every SCSS file under `nuxt/assets/`**

For each file identified in Step 4, fetch it:

```bash
gh api repos/nawhas/nawhas/contents/nuxt/assets/<path>.scss --jq '.content' | base64 -d > /tmp/legacy-<name>.scss
```

Read each. Make a one-line note per file on what it owns (palette, type, spacing, etc.) and which token families it contributes to.

- [ ] **Step 6: Record the source-of-truth ladder in `.audit-notes.md`**

Write a short note (bullets) with:
- Palette source file(s) + line ranges
- Typography source file(s) + line ranges
- Spacing source file(s) + line ranges
- Border radius source file(s) + line ranges
- Shadows / elevation source file(s) + line ranges
- Motion source file(s) + line ranges

If a family has no code-first source, write `code-first: none — defer entirely to visual verify`.

**No commit.** `.audit-notes.md` is scratch and should be added to `.gitignore` if needed, but since `docs/design/` is new we will just avoid `git add`-ing it.

### Task 2: Liveness sweep — enumerate shipped-in-production pages

**Why this comes first:** §2b scope is "pages actually live on production `nawhas.com`", not "every route in `nuxt/pages/`". The roadmap's non-goals explicitly exclude stories, draft-lyrics diff viewer, print-lyrics, and unreleased mod tooling. This task separates live from dormant so the layout audit doesn't accidentally document dead code.

**Files:**
- Read (remote): `nuxt/pages/` tree, `nuxt/middleware/`, `nuxt/store/`, `nuxt/nuxt.config.js` (feature flags), any env vars referenced in route guards
- Write (local, scratch): append "live pages" and "excluded pages" sections to `docs/design/.audit-notes.md`

- [ ] **Step 1: List all route files**

```bash
gh api repos/nawhas/nawhas/contents/nuxt/pages --jq '.[] | "\(.type)\t\(.name)"'
```

Recurse into any subdirectories. Map each file path to the Nuxt route it implements (Nuxt 2 convention: `pages/reciters/_slug/index.vue` → `/reciters/:slug`).

- [ ] **Step 2: Read every top-level page file to spot feature-flag gates**

For each route file, fetch via `gh api` and look for:
- `if (process.env.FEATURE_X)` guards in `asyncData` / `fetch` hooks
- `middleware: ['feature-flag']` directives
- redirects to `/404` on certain conditions
- `head` / `meta` that suggests draft or WIP status

A route that unconditionally redirects, or is guarded by an env var not set in production, is **dormant** and does not go in the layout audit.

- [ ] **Step 3: Cross-reference against `nuxt.config.js` module/plugin gates**

Already fetched in Task 1. Search it for any route-related feature toggles.

- [ ] **Step 4: Record findings in `.audit-notes.md`**

Under a `## Liveness sweep` heading, write two lists:

```markdown
### Live in production
- `/` (home) — `nuxt/pages/index.vue`
- `/reciters` — `nuxt/pages/reciters/index.vue`
- [...one bullet per live route]

### Excluded (dormant / out of scope)
- `/stories` — reason: unshipped feature per roadmap non-goals
- [...one bullet per excluded route, with reason]
```

If any route is **ambiguous** (looks live but gated by something you can't verify code-first), put it under a third list `### Needs visual verify` and it lands in `README.md`'s "verify before porting" section at the end.

**No commit.**

---

## Phase B — Tokens (single commit at Task 8)

### Task 3: Scaffold `docs/design/tokens.md`

**Files:**
- Create: `docs/design/tokens.md`

- [ ] **Step 1: Write the scaffold with all six section headers and empty comparative tables**

Create `docs/design/tokens.md` with exactly this shape (content for each table comes in Tasks 4–7):

```markdown
# Design Tokens — Legacy vs Rebuild Audit

> **Source of truth:** this document compares legacy `nawhas.com` tokens (extracted code-first from `github.com/nawhas/nawhas@master` via `gh api`) with the current rebuild's tokens (from `apps/web/app/globals.css` and related files). Every legacy value carries a provenance citation `nawhas/nawhas:<path>#Lx-y`. Values that could not be extracted code-first are marked `deferred: visual verify` — see `README.md` for the agenda.
>
> **Action column:**
> - `keep` — rebuild value already matches legacy intent
> - `replace with <value>` — rebuild must adopt the legacy value in Phase 2.2
> - `add` — legacy has this, rebuild does not, must be added in 2.2
> - `drop` — rebuild has this, legacy doesn't, and 2.2 should remove (rare; only if it actively conflicts)

## Palette

| Role | Legacy value | Rebuild value (`globals.css`) | Action |
|---|---|---|---|

## Typography

| Role | Legacy value | Rebuild value | Action |
|---|---|---|---|

## Spacing

| Scale step | Legacy value | Rebuild value | Action |
|---|---|---|---|

## Border radius

| Component | Legacy value | Rebuild value | Action |
|---|---|---|---|

## Shadows / elevation

| Level | Legacy value | Rebuild value | Action |
|---|---|---|---|

## Motion

| Kind | Legacy value | Rebuild value | Action |
|---|---|---|---|
```

**No commit yet.** Tokens commits as one atomic unit at the end of Phase B (Task 8).

### Task 4: Fill Palette section

**Files:**
- Modify: `docs/design/tokens.md` (Palette section only)
- Read: `/tmp/vuetify.options.ts` (from Task 1, or re-fetch), any palette SCSS from Task 1's list, `apps/web/app/globals.css`

- [ ] **Step 1: Extract legacy palette**

From `vuetify.options.ts`, find the `theme.themes.light` (and `.dark` if present) color object. Vuetify 2 typically has `primary`, `secondary`, `accent`, `error`, `info`, `success`, `warning`, `anchor`, and optional named shades.

For each key, record:
- The role name exactly as Vuetify declares it
- The hex value
- The line range in the source file

If any colors are imported from SCSS `$variables`, follow the chain and cite the terminal SCSS file as the source.

- [ ] **Step 2: Extract rebuild palette from `apps/web/app/globals.css`**

```bash
grep -n "^  --color-" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app/globals.css
```

Note the full Tailwind 4 `@theme` palette (primary-*, secondary-*, neutral-*, error-*, plus any others).

- [ ] **Step 3: Align the two by role and fill the table**

One row per legacy role (not per shade). Where the rebuild has a 50–950 ramp and legacy has a single value, the legacy value is cited on the "base" row (e.g., role `primary` → legacy value X → rebuild `primary-500 #22c55e`, action `replace ramp with X-derived scale (delegated to 2.2)`).

Add a note under the table for any rebuild palette entry that has no legacy equivalent — that row uses action `drop` only if clearly wrong; otherwise `add` is inverted as "rebuild-only (verify intent in 2.2)".

- [ ] **Step 4: Self-check**

Every row has: (a) a non-empty Legacy value column with provenance citation or `deferred: visual verify`, (b) a non-empty Rebuild value column, (c) an Action. If not, fix it now.

### Task 5: Fill Typography section

**Files:**
- Modify: `docs/design/tokens.md` (Typography section)
- Read: `/tmp/nuxt.config.js` (from Task 1) for Google Fonts modules, `/tmp/vuetify.options.ts` for `theme.typography` or similar, any typography SCSS from Task 1's list; `apps/web/app/globals.css` for rebuild type stack

- [ ] **Step 1: Extract legacy font families**

From `nuxt.config.js`, find the `@nuxtjs/google-fonts` module config (or equivalent). Record each family + its weights as declared.

From `vuetify.options.ts`, find any `theme.defaults.global.style` / `defaultTheme` font overrides. Vuetify 2 usually inherits `Roboto`; overrides may alias `$body-font-family` in SCSS instead.

- [ ] **Step 2: Extract legacy type scale**

Typical Vuetify 2 type roles: `display-4..1`, `headline`, `title`, `subheading`, `body-2`, `body-1`, `caption`, `overline`. For each role, find:
- Font size (rem/px)
- Line height
- Font weight
- Letter spacing

These may live in Vuetify defaults (cite as `vuetify@2.x default: <role>`) or be overridden in SCSS (cite the override).

- [ ] **Step 3: Extract rebuild typography**

```bash
grep -n "font-" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app/globals.css
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/app/layout.tsx | head -40
```

Note the Inter / Noto Naskh Arabic / Noto Nastaliq Urdu stacks + any defined type-scale utilities. If the rebuild doesn't yet declare a type scale (just font-families), record that explicitly — the Rebuild column becomes `no explicit scale` and the Action becomes `add`.

- [ ] **Step 4: Fill the table, one row per type role**

Rows: `font-family:body`, `font-family:display`, `font-family:arabic`, `font-family:urdu`, then the scale roles (display/headline/title/body etc.) in descending size.

- [ ] **Step 5: Self-check** (same 3-column completeness gate as Task 4 Step 4)

### Task 6: Fill Spacing section

**Files:**
- Modify: `docs/design/tokens.md` (Spacing section)
- Read: Vuetify options + SCSS spacing partials; `apps/web/app/globals.css` (Tailwind 4 spacing scale is implicit unless overridden)

- [ ] **Step 1: Extract legacy spacing scale**

Vuetify 2 uses a 4px base (`$spacer: 4px`) with utility classes `.ma-0..16`. If legacy overrides the base, cite the override. Record:
- Base unit
- Any named container widths (`$container-max-widths` from Bootstrap/Vuetify)
- Section gutters if declared globally

- [ ] **Step 2: Extract rebuild spacing**

```bash
grep -n "spacing\|--spacing" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app/globals.css
```

Tailwind 4's default spacing scale (`0, 0.5, 1, 1.5, ...`) is implicit. Note any overrides; otherwise the rebuild value is "Tailwind 4 default (0.25rem base)".

- [ ] **Step 3: Fill the table**

Suggested rows: `base unit`, `container-sm`, `container-md`, `container-lg`, `container-xl`, `section gutter`, `page padding`.

- [ ] **Step 4: Self-check**

### Task 7: Fill Border radius, Shadows, and Motion sections

**Why these are grouped:** Each is likely thin code-first (2–6 rows) because Vuetify defaults dominate. Grouping keeps the task from being a 10-line wrapper.

**Files:**
- Modify: `docs/design/tokens.md` (three sections)
- Read: Vuetify options + component SCSS; rebuild's `globals.css` + any shadcn/ui primitives in `packages/ui/src/` if they exist yet

- [ ] **Step 1: Fill Border radius**

Vuetify 2 has `$border-radius-root` (default 4px) and per-component radii. Rows: `button`, `card`, `chip`, `input`, `dialog`. Where a value is the Vuetify default (not overridden), cite as `vuetify@2.x default` and value as `4px`.

Rebuild column: check `apps/web/app/globals.css` for `--radius-*` tokens; if absent, "none declared, Tailwind default applies" — Action becomes `add`.

- [ ] **Step 2: Fill Shadows / elevation**

Vuetify 2 declares 25 elevation levels (`elevation-0` through `elevation-24`). Code-first, record the Vuetify declared level for each common UI component (card, dialog, menu, appbar) as `vuetify-elevation-<n>` and mark actual rendered rgba values `deferred: visual verify` in a note under the table.

Rebuild column: whatever `globals.css` / `packages/ui` declares today (likely none yet).

- [ ] **Step 3: Fill Motion**

Vuetify 2 default transition duration is 0.3s with `cubic-bezier(0.25, 0.8, 0.5, 1)`. Record:
- Default duration + easing
- Any overrides in component SCSS
- Known interaction patterns (hover lift, dialog in/out, menu slide)

Values that depend on component-specific CSS that you can't confidently extract statically → `deferred: visual verify`.

Rebuild column: any `transition-*` tokens / `motion-*` utility usage; if none, Action is `add`.

- [ ] **Step 4: Self-check all three sections**

### Task 8: Self-review and commit `tokens.md`

**Files:**
- Modify: `docs/design/tokens.md` (final polish)

- [ ] **Step 1: Verify provenance coverage**

```bash
grep -c "nawhas/nawhas:" /home/asif/dev/nawhas/nawhas-rebuild/docs/design/tokens.md
grep -c "deferred: visual verify" /home/asif/dev/nawhas/nawhas-rebuild/docs/design/tokens.md
```

Sum should equal the number of populated Legacy-value cells. Spot-check a handful of citations by actually opening those lines on GitHub.

- [ ] **Step 2: Verify three-column completeness**

Visually scan the file. Every row must have Legacy, Rebuild, and Action columns populated (or an explicit deferred marker in Legacy). No blank cells.

- [ ] **Step 3: Commit**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git add docs/design/tokens.md
git commit -m "$(cat <<'EOF'
docs(design): add legacy-vs-rebuild token audit (Phase 2.1)

Six-family comparative audit (palette, typography, spacing, border
radius, shadows, motion) of legacy nawhas.com against the current
rebuild's globals.css. Every legacy value carries a
nawhas/nawhas:<path>#Lx-y provenance citation or an explicit
'deferred: visual verify' marker. The Action column (keep / replace /
add / drop) scopes Phase 2.2 as discrete per-row migration tickets.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1-legacy-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — Layouts (single commit at Task 14)

### Task 9: Scaffold `docs/design/layouts.md`

**Files:**
- Create: `docs/design/layouts.md`

- [ ] **Step 1: Write scaffold with shared-chrome section + per-page sections**

Page list per §2b of the spec, in Phase 2.3 redesign order. Use the live-page list from Task 2 — if the liveness sweep excluded any of these, note that inline and drop the section.

Create `docs/design/layouts.md`:

```markdown
# Page Layouts — Legacy vs Rebuild Audit

> **Source of truth:** per-page skeletons and shared-chrome structure for production `nawhas.com`, extracted code-first from `github.com/nawhas/nawhas@master` via `gh api`. Each entry compares legacy against the rebuild's equivalent route in `apps/web/app/`. Skeleton-level only — detailed component specs belong in Phase 2.3.
>
> **Shared chrome** (header, footer, persistent player bar if applicable) is documented once up front and referenced by each page entry.

## Shared chrome

### Global header
### Global footer
### Persistent player bar
(if applicable — fill or remove based on findings)

## Pages

### Home — `/`
### Reciter profile — `/reciters/:slug`
### Album — `/reciters/:slug/albums/:albumSlug`
### Track — `/reciters/:slug/albums/:albumSlug/tracks/:trackSlug`
### Library / History / Saved / Liked — `/library/*`
### Search results — `/search`
### Auth — `/login`, `/register`
### Contribute + Mod — `/contribute`, `/mod/*`
```

Each `###` section gets filled with this internal shape in subsequent tasks:

```markdown
**Legacy route file:** `nuxt/pages/<path>.vue#Lx-y`
**Legacy layout wrapper:** `nuxt/layouts/<name>.vue` (if non-default)
**Rebuild route file:** `apps/web/app/<path>/page.tsx`

**Purpose:** one sentence.

**Legacy skeleton:**
```
(ASCII tree of major regions)
```

**Legacy key components:** bulleted list with paths

**Interactions:** bulleted list of notable patterns

**Rebuild equivalent:** ASCII tree + component paths

**Delta:** bulleted list of structural differences
```

**No commit yet.**

### Task 10: Document shared chrome

**Files:**
- Modify: `docs/design/layouts.md` (Shared chrome section)
- Read (remote): `nuxt/layouts/default.vue`, anything referenced from it (header component, footer component, player bar if persistent)
- Read (local): `apps/web/app/layout.tsx` and its siblings, any persistent-nav / player-bar components

- [ ] **Step 1: Fetch legacy default layout**

```bash
gh api repos/nawhas/nawhas/contents/nuxt/layouts --jq '.[] | "\(.type)\t\(.name)"'
gh api repos/nawhas/nawhas/contents/nuxt/layouts/default.vue --jq '.content' | base64 -d > /tmp/legacy-layout-default.vue
```

Read it. Note every component reference and which chrome region it owns.

- [ ] **Step 2: Fetch each referenced chrome component**

For each referenced component (header, footer, persistent nav, player bar), fetch it the same way and read enough to describe its regions.

- [ ] **Step 3: Fetch the rebuild's root layout**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app/layout.tsx
```

Identify rebuild's chrome counterparts.

- [ ] **Step 4: Fill the three Shared chrome subsections**

For each of Global header, Global footer, Persistent player bar: ASCII skeleton of legacy, ASCII skeleton of rebuild, one-sentence delta. If a section doesn't apply (e.g., no persistent player bar on legacy), say so explicitly and leave the subsection as a one-liner `not applicable: <reason>`.

### Task 11: Document Home, Reciter, Album pages

**Files:**
- Modify: `docs/design/layouts.md` (three page sections)
- Read (remote, via `gh api`): `nuxt/pages/index.vue`, `nuxt/pages/reciters/_slug/index.vue`, `nuxt/pages/reciters/_slug/albums/_album/index.vue` (exact paths may differ; use Task 2's liveness list as the authority)
- Read (local): corresponding `apps/web/app/` files

For each of the three pages, follow this same three-step loop:

- [ ] **Step 1: Fetch the legacy route file + referenced components**

Using the paths from the liveness sweep. Read enough of each to describe the major regions (hero, content grid, sidebar, CTA, etc.) and the notable components used.

- [ ] **Step 2: Read the rebuild equivalent**

```bash
find /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app -type d -name "reciters" -o -name "albums"
```

Read the `page.tsx` (and `layout.tsx` if present) for each rebuild route.

- [ ] **Step 3: Fill the page entry using the shape from Task 9 Step 1**

Hard cap: ~30 lines per page section (skeleton + components + interactions + delta combined). Anything bigger, push detail to 2.3's per-page spec and leave a pointer.

Repeat for all three pages.

### Task 12: Document Track page (the key surface)

**Why this is its own task:** the roadmap explicitly calls Track "the key surface (audio + lyrics + metadata)". It is the most complex page and deserves focused attention — the 30-line cap from Task 11 may need to stretch to ~45 here.

**Files:**
- Modify: `docs/design/layouts.md` (Track section)
- Read (remote): `nuxt/pages/reciters/_slug/albums/_album/tracks/_track/index.vue` (exact path per liveness list) + lyrics viewer component + audio player component
- Read (local): `apps/web/app/(reciters)/.../track/page.tsx` or equivalent + `LyricsViewer`, `AudioPlayer` components

- [ ] **Step 1: Fetch legacy track page + key components**

Identify and fetch: the page component, the lyrics-display component, the audio player component, any language-switcher or transliteration toggle.

- [ ] **Step 2: Read the rebuild's track surface**

```bash
grep -r "TrackPlayer\|Lyrics\|AudioPlayer" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/ /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app/ --include="*.tsx" -l | head -20
```

Read the key components end-to-end.

- [ ] **Step 3: Fill the Track entry**

Use the shape from Task 9 Step 1. Expected stretch up to ~45 lines. Include: audio controls layout, lyrics panel layout, metadata panel layout, language switching interaction, scroll/highlight sync between audio and lyrics (if either stack has it).

### Task 13: Document Library, Search, Auth, Contribute + Mod pages

**Why these are grouped:** lower traffic / simpler layouts / often stacked in a single tabbed shell. Combining keeps the plan concise.

**Files:**
- Modify: `docs/design/layouts.md` (four page sections)
- Read (remote): `nuxt/pages/library/*`, `nuxt/pages/search/*`, `nuxt/pages/login.vue` + `register.vue`, `nuxt/pages/contribute/*`, `nuxt/pages/mod/*` (exact paths per liveness list; any that the sweep excluded as dormant get dropped from the doc)
- Read (local): same paths under `apps/web/app/`

- [ ] **Step 1: Library / History / Saved / Liked**

If legacy has a unified tabbed shell for these four, document the shell once and note each tab as a sub-region. If they are separate routes, document each briefly (they likely share skeleton). Hard cap ~30 lines total for all four, not per tab.

- [ ] **Step 2: Search results**

Skeleton, key components (result card, filter panel if present, empty state). ~20 lines.

- [ ] **Step 3: Auth**

Login + Register. Very likely share a shell. Document once, note the form differences. ~15 lines.

- [ ] **Step 4: Contribute + Mod**

Document each if either is live per the sweep. Often these are form-heavy / tabbed; skeleton + key components only. Drop entirely with a note if the sweep excluded them. ~30 lines combined.

### Task 14: Self-review and commit `layouts.md`

**Files:**
- Modify: `docs/design/layouts.md` (final polish)

- [ ] **Step 1: Liveness coverage check**

Every page on Task 2's "live" list must appear in `layouts.md`. Every page in `layouts.md` must be on the "live" list. Any mismatch gets reconciled now.

- [ ] **Step 2: Provenance check**

```bash
grep -c "nuxt/pages/" /home/asif/dev/nawhas/nawhas-rebuild/docs/design/layouts.md
```

Every page entry must cite a legacy route file. Every rebuild-equivalent entry must cite an `apps/web/app/` path.

- [ ] **Step 3: Cap check**

Page entries (excluding Track) should be ≤ ~30 lines each. Track ≤ ~45 lines. If one has blown past the cap, either trim it or add a `→ detail deferred to Phase 2.3 spec for this page` pointer and cut.

- [ ] **Step 4: Commit**

```bash
git add docs/design/layouts.md
git commit -m "$(cat <<'EOF'
docs(design): add legacy-vs-rebuild layout audit (Phase 2.1)

Page-level skeletons for production nawhas.com, extracted code-first
from nuxt/pages/ and nuxt/components/ on github.com/nawhas/nawhas@master,
compared against the rebuild's equivalent routes under apps/web/app/.
Shared chrome (header, footer, player bar) documented once and
referenced by page entries. Skeleton-level only; component-level detail
is deferred to Phase 2.3 per-page specs.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1-legacy-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — Index and roadmap update

### Task 15: Write `docs/design/README.md`

**Files:**
- Create: `docs/design/README.md`
- Read: `.audit-notes.md` (scratch) for deferred + "needs visual verify" lists, the two committed docs for final cross-link targets

- [ ] **Step 1: Draft the README**

Create `docs/design/README.md`:

```markdown
# Design Audit — Legacy `nawhas.com` vs Rebuild

This directory is the output of Phase 2.1 of the rebuild roadmap. Two companion docs compare legacy production `nawhas.com` against the current rebuild, row-by-row for tokens and page-by-page for layouts, with the goal of scoping Phase 2.2 (primitives) and Phase 2.3 (page redesigns) as concrete, traceable work.

## Contents

- **[tokens.md](./tokens.md)** — six comparative token tables (palette, typography, spacing, border radius, shadows, motion) with a legacy value, rebuild value, and per-row action.
- **[layouts.md](./layouts.md)** — per-page skeletons and shared chrome structure for every route live in production today.

## Methodology

Code-first static audit of `github.com/nawhas/nawhas@master` via `gh api` — no local clone, no running instance. Every legacy value carries a `nawhas/nawhas:<path>#Lx-y` provenance citation. Values that could not be extracted code-first are marked `deferred: visual verify` — see the list below for the agenda.

Source-priority ladder when legacy is internally inconsistent: Vuetify theme config > global SCSS > component-scoped SCSS > inline styles.

## What we deliberately did not carry over

<bullet list; filled from Task 2's "Excluded" list + any known bad patterns surfaced during the audit, e.g., "inline style attributes used for one-off color tweaks in <component>">

## Verify before porting

<bullet list; filled from Task 2's "Needs visual verify" list — pages that looked live but couldn't be confirmed code-first>

## Deferred: visual verification agenda

<bullet list; grep every "deferred: visual verify" row out of tokens.md and layouts.md and list them here as the explicit agenda for Phase 2.1b (the follow-up visual pass), so that pass has a concrete work list to consume>

## What this document is not

This is a descriptive audit. It does not dictate which values Phase 2.2 should adopt — that is 2.2's call, informed by the `Action` column in `tokens.md` and the `Delta` entries in `layouts.md`.
```

- [ ] **Step 2: Fill the three bulleted sections**

- "What we deliberately did not carry over" — from `.audit-notes.md` liveness exclusions + any patterns flagged during the token/layout work (e.g., reliance on Vuetify's elevation-N scale, inline styles, etc.)
- "Verify before porting" — from Task 2's ambiguous list
- "Deferred: visual verification agenda" — grep:

```bash
grep "deferred: visual verify" /home/asif/dev/nawhas/nawhas-rebuild/docs/design/tokens.md /home/asif/dev/nawhas/nawhas-rebuild/docs/design/layouts.md
```

One bullet per hit, with a pointer back to the source row (`tokens.md § Shadows, level 4`).

- [ ] **Step 3: Self-review**

Check: do the cross-links `./tokens.md` / `./layouts.md` render? Is the methodology paragraph consistent with the actual two committed docs (no drift)? Are the three bulleted sections non-empty (if any is genuinely empty, note that explicitly — "(none)" — rather than leaving a blank)?

- [ ] **Step 4: Commit**

```bash
git add docs/design/README.md
git commit -m "$(cat <<'EOF'
docs(design): index the Phase 2.1 legacy audit + deferred agenda

README.md wires up tokens.md and layouts.md, restates the code-first
methodology, captures what was deliberately excluded from the audit
('what we did not carry over', 'verify before porting'), and enumerates
every 'deferred: visual verify' row as the concrete agenda for the
follow-up visual verification pass.

Phase 2.1 is now complete.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1-legacy-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 16: Update the parent roadmap to record Phase 2.1 completion

**Files:**
- Modify: `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md` (Phase 2.1 section)

- [ ] **Step 1: Update the Phase 2.1 section to reflect shipped outcomes**

Open `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md`. Find the `### 2.1 Legacy visual audit` subsection under `## Phase 2 — Design System + Visual Parity`.

Replace the existing forward-looking text with a shipped-outcome paragraph that follows the same pattern as Phase 1's "Outcomes (shipped)" section: link to the three committed files, list the three commit SHAs, and note any follow-ups surfaced during the audit (similar to Phase 1's follow-ups table).

Update the top-of-file `Status:` line from `Phase 1 shipped (2026-04-21) · Phase 2 not started` to `Phase 1 shipped (2026-04-21) · Phase 2.1 shipped (2026-04-22) · Phase 2.2 not started` and bump `Last updated:` to `2026-04-22`.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-21-rebuild-roadmap.md
git commit -m "$(cat <<'EOF'
docs(roadmap): record Phase 2.1 outcomes

Phase 2.1 shipped as three commits under docs/design/ (tokens, layouts,
README). Roadmap's Phase 2.1 subsection now links the committed files
and records the commit SHAs, matching the pattern used for Phase 1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Wrap-up

After Task 16, the branch has four new commits:

1. `docs(design): add legacy-vs-rebuild token audit (Phase 2.1)`
2. `docs(design): add legacy-vs-rebuild layout audit (Phase 2.1)`
3. `docs(design): index the Phase 2.1 legacy audit + deferred agenda`
4. `docs(roadmap): record Phase 2.1 outcomes`

No CI gate (no code changes). Nothing to push unless the user asks (user's memory preference is direct-to-main commits, no automatic push).

Delete or leave the scratch `docs/design/.audit-notes.md` per user preference; it was never committed.

The deferred visual-verification agenda enumerated in `README.md` is the handoff for Phase 2.1b — either scheduled as its own sub-project or folded into 2.2/2.3 where the affected token/layout surfaces.
