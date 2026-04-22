# Phase 2.1e — Complete Frontend Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce eight markdown docs under `docs/design/audit-complete/` (README + seven per-axis docs) that catalog every frontend file's token consumption, dark-mode handling, responsive coverage, primitive-replacement opportunities, accessibility, legacy-parity gaps, and dead/suspect code.

**Architecture:** Dispatch a subagent per subtree (11 passes) with a standardized checklist. Each subagent writes partial findings (all seven axes) to a uncommitted scratch file in `/tmp/audit-scratch-2-1e/`. Controller then does seven per-axis merge passes — reads all 11 scratch files, extracts axis-relevant findings, produces the final axis doc, and commits. Eight commits total (seven axis docs + one README+roadmap closeout). Direct-to-main per user preference.

**Tech Stack:** ripgrep, file reads, markdown. No code execution, no tests, no CI gate.

---

## Pre-flight

**Branch / baseline.** Direct to `main`. Working tree should be clean before starting.

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git status
# Expected: "On branch main … nothing to commit, working tree clean"
# (docs/design/.audit-notes.md may remain untracked — pre-existing scratch from Phase 2.1)
```

**Create output directories.**

```bash
mkdir -p /home/asif/dev/nawhas/nawhas-rebuild/docs/design/audit-complete
mkdir -p /tmp/audit-scratch-2-1e
```

No commits yet.

**Keep the spec open for reference** while executing: `docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md`. The seven axis definitions come from there.

---

## The standardized audit-pass checklist (reused across Tasks 1–11)

Every subagent dispatched for an audit pass uses the same checklist, differing only in subtree scope. The template prompt is:

> You are performing Phase 2.1e frontend audit pass {N} of 11 for `nawhas-rebuild`. Your scope is the directory subtree `<SUBTREE>`.
>
> Read every `.tsx` and `.ts` file in scope (recursively). For each file, record findings across seven axes in a single scratch markdown file at `/tmp/audit-scratch-2-1e/<NN>-<slug>.md`. Structure the scratch file with one `## Axis N` section per axis, and inside each, one `### <file-path>` sub-section per file (only files with findings — skip files with no finding on that axis).
>
> Working directory: `/home/asif/dev/nawhas/nawhas-rebuild`. Do NOT commit. Do NOT execute code. Do NOT change any source file.
>
> **Axis 1 — Token consumption.** For each file, list:
> - **Semantic tokens** (`bg-background`, `bg-primary`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`, `ring-ring`) — count + sample.
> - **Ramped palette tokens** (`bg-primary-500`, `text-secondary-700`, etc. — the declared ramps in `globals.css`) — count + sample.
> - **Tailwind default palette** (`bg-gray-*`, `text-gray-*`, `bg-green-*`, `bg-amber-*`, `bg-emerald-*`, `bg-orange-*`, `bg-yellow-*`, `bg-red-*`, `bg-blue-*`, `bg-zinc-*`, `bg-slate-*`, `bg-neutral-*`) — count + sample.
> - **Literal colors** (`bg-white`, `bg-black`, `text-white`, arbitrary hex/rgb/css-var) — count + sample.
> - **Radii used** — `rounded`, `rounded-md`, `rounded-lg`, `rounded-full`, `rounded-[Npx]`, or "primitive-sourced" if the file uses a `<Card>` / `<Button>` / etc. that carries its own radius.
> - **Shadows used** — same categories.
> - **Spacing anomalies** — arbitrary `p-[Npx]` / `m-[Npx]` values off the 4px scale.
>
> **Axis 2 — Dark-mode handling.** Classify the file:
> - **Good** — uses semantic tokens (`bg-background`, `text-foreground`, `bg-card`) that auto-flip.
> - **Mixed** — uses `dark:*` variants for some classes but not others (inconsistent).
> - **Broken** — references a light-mode color with no dark counterpart.
> - **Not applicable** — file has no color classes (pure logic / layout-only).
> Give a one-line reason.
>
> **Axis 3 — Responsive coverage.** Record:
> - Breakpoint-adaptive patterns used (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) with samples.
> - Mobile-only (`md:hidden`) and desktop-only (`hidden md:flex` or similar) chunks.
> - Fixed widths/heights without responsive variants that might break on small viewports.
>
> **Axis 4 — Primitive-replacement opportunities.** For each file:
> - **Uses a `@nawhas/ui` primitive** — which ones.
> - **Reinvents a primitive** — file has ad-hoc markup that our `<Button>` / `<Card>` / `<Input>` / `<Dialog>` / `<DropdownMenu>` / `<Tooltip>` / `<Sheet>` / `<Select>` / `<Badge>` / `<Tabs>` / `<SectionTitle>` would replace. Specify which primitive, with line numbers.
> - **Could use but doesn't** — borderline cases where a primitive would fit but the ad-hoc markup is acceptable.
>
> **Axis 5 — Accessibility.** Flag issues with severity:
> - **Critical** — `div`-as-button, missing aria-label on icon-only controls, missing focus-visible on custom interactive elements, broken heading hierarchy.
> - **Important** — missing aria-expanded/aria-pressed/aria-describedby where semantically expected, non-semantic list markup, missing `sr-only` for icon-only buttons.
> - **Nice-to-have** — tabindex hints, aria-live regions for dynamic content, keyboard shortcut documentation.
> For each finding: file:line + one-line fix suggestion.
>
> **Axis 6 — Legacy-parity gap.** Compare against Phase 2.1's `docs/design/layouts.md` entries (read once if needed). For each file:
> - Interaction / UI / copy that legacy had but this file doesn't implement.
> - Divergent patterns (rebuild does something differently — note whether intentional per the 2.1 decisions, or a gap).
> - Rebuild-only affordances that legacy lacked (not a gap per se — note for completeness).
>
> **Axis 7 — Dead / suspect code.** Flag:
> - `TODO`, `FIXME`, `HACK`, `XXX` comments — with the surrounding one-line context.
> - Commented-out code blocks (more than 3 lines).
> - Unused exports / orphan state / unused props.
> - Components with no route / no consumer (requires cross-ref grep across `apps/web/`).
>
> **Output format** in `/tmp/audit-scratch-2-1e/<NN>-<slug>.md`:
>
> ```markdown
> # Audit Pass {NN} — <SUBTREE>
>
> Files in scope: <count>
> Files skipped: <list with reasons>
>
> ## Axis 1 — Token consumption
>
> ### apps/web/<path>/file.tsx
> - Semantic tokens: 0
> - Ramped tokens: 0
> - Tailwind default: 4 (bg-gray-900, text-gray-500, bg-gray-100, border-gray-200)
> - Literals: 1 (bg-white)
> - Radii: rounded-lg, rounded-md
> - Shadows: shadow-sm
> - Spacing anomalies: none
>
> (repeat per file with findings)
>
> ## Axis 2 — Dark-mode handling
>
> ### apps/web/<path>/file.tsx
> Status: Broken — bg-white with no dark:bg-* override; text-gray-900 with no dark:*.
>
> (repeat per file with findings)
>
> ## Axis 3 — Responsive coverage
> ...
>
> ## Axis 4 — Primitive-replacement opportunities
> ...
>
> ## Axis 5 — Accessibility
> ...
>
> ## Axis 6 — Legacy-parity gap
> ...
>
> ## Axis 7 — Dead / suspect code
> ...
> ```
>
> Be concise — one line per finding where possible. The controller will merge your output into per-axis master docs later.
>
> When complete, report: number of files audited, number of skips (and why), and one sample finding per axis so the controller can spot-check the output.

That template is the prompt body for Tasks 1–11. Every task below references it by saying "use the standardized audit-pass checklist above" and supplies only the subtree path, the pass number, and the output file path.

---

## Task 1: Audit pass 01 — `apps/web/app/` (page files)

**Scope:** `apps/web/app/` — every `.tsx` / `.ts` file recursively. Route groups `(auth)` and `(protected)` are in scope. Skip `apps/web/app/api/` (out of scope per spec — server-only route handlers).

**Output:** `/tmp/audit-scratch-2-1e/01-app.md`

- [ ] **Step 1: Dispatch the audit subagent**

Dispatch a general-purpose subagent with the standardized audit-pass checklist (above) and these specifics:
- Pass number: 01
- Subtree: `apps/web/app/`
- Exclude: `apps/web/app/api/**`
- Output: `/tmp/audit-scratch-2-1e/01-app.md`

- [ ] **Step 2: Verify the scratch file exists and is non-empty**

```bash
wc -l /tmp/audit-scratch-2-1e/01-app.md
# Expected: >= 50 lines (even a small subtree produces some findings per axis)
```

- [ ] **Step 3: Spot-check one file's findings**

Pick one in-scope file (e.g., `apps/web/app/page.tsx`) and verify the scratch file's entry for it is coherent — the class counts are sane, the primitive-replacement call is plausible.

No commit. Move to Task 2.

---

## Task 2: Audit pass 02 — `apps/web/src/components/layout/`

**Scope:** `apps/web/src/components/layout/` — header, footer, page-layout, container, mobile-nav, mobile-search-overlay, user-menu, nav-links, etc.

**Output:** `/tmp/audit-scratch-2-1e/02-layout.md`

- [ ] **Step 1: Dispatch audit subagent** with the standardized checklist. Pass 02, subtree `apps/web/src/components/layout/`, output as above.

- [ ] **Step 2: Verify file exists + spot-check one file** (e.g., `header.tsx`).

No commit.

---

## Task 3: Audit pass 03 — `apps/web/src/components/player/`

**Scope:** PlayerBar, PlayerBarLazy, PlayerBarSpacer, MobilePlayerOverlay, QueuePanel, PlayerPanels, track-play-button, track-detail-play-button, play-all-button.

**Output:** `/tmp/audit-scratch-2-1e/03-player.md`

- [ ] **Step 1: Dispatch audit subagent.** Pass 03.

- [ ] **Step 2: Verify + spot-check** (e.g., `PlayerBar.tsx`).

No commit.

---

## Task 4: Audit pass 04 — content cards + home

**Scope:** `apps/web/src/components/cards/`, `apps/web/src/components/home/`, `apps/web/src/components/albums/`, `apps/web/src/components/reciters/` (if the directory exists — if not, skip).

**Output:** `/tmp/audit-scratch-2-1e/04-content-cards.md`

- [ ] **Step 1: Verify subtree structure** (which of those directories actually exist):

```bash
ls /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/ | grep -E "^(cards|home|albums|reciters)$"
```

- [ ] **Step 2: Dispatch audit subagent.** Pass 04, scope = all existing dirs above joined.

- [ ] **Step 3: Verify + spot-check** (e.g., `cards/reciter-card.tsx`).

No commit.

---

## Task 5: Audit pass 05 — Track surface

**Scope:** `apps/web/src/components/tracks/`, `apps/web/src/components/lyrics/`.

**Output:** `/tmp/audit-scratch-2-1e/05-track-surface.md`

- [ ] **Step 1: Dispatch audit subagent.** Pass 05.

- [ ] **Step 2: Verify + spot-check.**

No commit.

---

## Task 6: Audit pass 06 — forms (auth + contribute)

**Scope:** `apps/web/src/components/auth/`, `apps/web/src/components/contribute/`.

**Output:** `/tmp/audit-scratch-2-1e/06-forms.md`

- [ ] **Step 1: Dispatch audit subagent.** Pass 06.

- [ ] **Step 2: Verify + spot-check.**

No commit.

---

## Task 7: Audit pass 07 — lists (library, search, mod)

**Scope:** `apps/web/src/components/library/`, `apps/web/src/components/search/`, `apps/web/src/components/mod/`.

**Output:** `/tmp/audit-scratch-2-1e/07-lists.md`

- [ ] **Step 1: Dispatch audit subagent.** Pass 07.

- [ ] **Step 2: Verify + spot-check.**

No commit.

---

## Task 8: Audit pass 08 — utility components

**Scope:** `apps/web/src/components/theme/`, `apps/web/src/components/ui/`, `apps/web/src/components/providers/` (if exists), `apps/web/src/components/settings/` (if exists).

**Output:** `/tmp/audit-scratch-2-1e/08-utility.md`

- [ ] **Step 1: Verify subtree structure:**

```bash
ls /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/ | grep -E "^(theme|ui|providers|settings)$"
```

- [ ] **Step 2: Dispatch audit subagent.** Pass 08, scope = existing dirs.

- [ ] **Step 3: Verify + spot-check** (e.g., `ui/skeleton.tsx`).

No commit.

---

## Task 9: Audit pass 09 — top-level components (SaveButton, LikeButton, etc.)

**Scope:** `apps/web/src/components/*.tsx` — files directly in the `components/` dir, not in a subdirectory.

**Output:** `/tmp/audit-scratch-2-1e/09-top-level.md`

- [ ] **Step 1: List in-scope files**

```bash
find /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components -maxdepth 1 -type f -name "*.tsx"
```

- [ ] **Step 2: Dispatch audit subagent** with explicit file list (not recursive).

- [ ] **Step 3: Verify + spot-check** (e.g., `SaveButton.tsx`).

No commit.

---

## Task 10: Audit pass 10 — hooks

**Scope:** `apps/web/src/hooks/` — every `.ts` / `.tsx`.

**Output:** `/tmp/audit-scratch-2-1e/10-hooks.md`

- [ ] **Step 1: Dispatch audit subagent.** Pass 10.

Most hooks won't have color/radius/shadow findings (axes 1–3). They WILL have accessibility findings (if they return aria-related attrs), primitive-replacement (no, typically), legacy-parity gap (rarely), and dead-code findings. Subagent should focus on axes 4, 5, 7 for this subtree and explicitly note "N/A — no styling" for axes 1, 2, 3 per file.

- [ ] **Step 2: Verify + spot-check.**

No commit.

---

## Task 11: Audit pass 11 — client lib

**Scope:** `apps/web/src/lib/` — client-relevant utilities (anything that renders markup or constructs classNames for rendered content). Skip pure server/tRPC/db utilities.

**Output:** `/tmp/audit-scratch-2-1e/11-lib.md`

- [ ] **Step 1: List in-scope files**

```bash
ls /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/lib/
```

The subagent should identify which files are client-relevant (export functions returning JSX, construct className strings, etc.) and audit only those. Pure server-side or data-layer files get listed as "out of scope" in the scratch file header.

- [ ] **Step 2: Dispatch audit subagent.** Pass 11 with the client-relevance filter note.

- [ ] **Step 3: Verify + spot-check.**

No commit.

---

## Task 12: Merge axis 1 (token consumption) + commit

**Files:**
- Read: `/tmp/audit-scratch-2-1e/{01-11}-*.md` — axis 1 sections only
- Create: `docs/design/audit-complete/tokens.md`

- [ ] **Step 1: Extract axis 1 findings from all 11 scratch files**

```bash
for f in /tmp/audit-scratch-2-1e/*.md; do
  echo "=== $f ==="
  awk '/^## Axis 1/,/^## Axis 2/' "$f"
done > /tmp/audit-scratch-2-1e/_axis1-all.md
```

- [ ] **Step 2: Write `docs/design/audit-complete/tokens.md`**

Structure:

```markdown
# Token Consumption Audit (Phase 2.1e Axis 1)

> Per-file inventory of color / radius / shadow / spacing class usage across the rebuild frontend. Each file is categorized as consuming one of: **semantic tokens** (auto-theming), **ramped tokens** (our `globals.css` ramps), **Tailwind default palette** (no token routing — doesn't respond to palette changes), or **literal colors** (hex/css-var/named).
>
> Sorted by subtree. Summary at top.

## Summary

- Total files audited: <count — sum from all scratch headers>
- **Tailwind default palette** call sites: <count>
- **Semantic token** call sites: <count>
- **Ramped token** call sites: <count>
- **Literal color** call sites: <count>

Top offending files (highest Tailwind-default usage): <list top 10 with counts>

## Findings by subtree

### apps/web/app/

<paste axis 1 findings from 01-app.md>

### apps/web/src/components/layout/

<paste axis 1 findings from 02-layout.md>

### apps/web/src/components/player/

<paste axis 1 findings from 03-player.md>

### Content cards + home (apps/web/src/components/{cards,home,albums,reciters}/)

<paste from 04>

### Track surface (apps/web/src/components/{tracks,lyrics}/)

<paste from 05>

### Forms (apps/web/src/components/{auth,contribute}/)

<paste from 06>

### Lists (apps/web/src/components/{library,search,mod}/)

<paste from 07>

### Utility (apps/web/src/components/{theme,ui,providers,settings}/)

<paste from 08>

### Top-level components (apps/web/src/components/*.tsx)

<paste from 09>

### Hooks (apps/web/src/hooks/)

<paste from 10>

### Client lib (apps/web/src/lib/)

<paste from 11>
```

Harmonize formatting if scratch files diverge (e.g., one uses `-` bullets, another uses `*` — standardize to `-`).

- [ ] **Step 3: Commit**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git add docs/design/audit-complete/tokens.md
git commit -m "$(cat <<'EOF'
docs(audit): add Phase 2.1e axis 1 — token consumption

Per-file inventory of color / radius / shadow / spacing class usage
across the rebuild frontend. Findings organized by subtree, summary
at top. Total call-site counts by category (semantic tokens vs ramped
tokens vs Tailwind default palette vs literals).

Refs: docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Merge axis 2 (dark-mode handling) + commit

**Files:**
- Read: scratch files, axis 2 sections only
- Create: `docs/design/audit-complete/dark-mode.md`

- [ ] **Step 1: Extract axis 2 findings**

```bash
for f in /tmp/audit-scratch-2-1e/0[0-9]-*.md /tmp/audit-scratch-2-1e/1[01]-*.md; do
  awk '/^## Axis 2/,/^## Axis 3/' "$f"
done > /tmp/audit-scratch-2-1e/_axis2-all.md
```

- [ ] **Step 2: Write `docs/design/audit-complete/dark-mode.md`**

Structure:

```markdown
# Dark-Mode Audit (Phase 2.1e Axis 2)

> Per-file classification of dark-mode handling. Each file falls into one of four buckets: **Good** (semantic tokens auto-flip), **Mixed** (inconsistent `dark:*` coverage), **Broken** (light-only colors with no dark counterpart), or **Not applicable** (no color classes).

## Summary

- Good: <count>
- Mixed: <count>
- Broken: <count>
- Not applicable: <count>

**Priority fix list** (Broken files that appear on high-traffic routes):
<list>

## Findings by status

### Broken

<one line per file: path — reason>

### Mixed

<one line per file>

### Good

<one line per file>

### Not applicable

<one line per file>
```

This axis is best organized by status (not by subtree) because the reader wants "show me the broken files" as one list.

- [ ] **Step 3: Commit**

```bash
git add docs/design/audit-complete/dark-mode.md
git commit -m "$(cat <<'EOF'
docs(audit): add Phase 2.1e axis 2 — dark-mode handling

Per-file classification (Good / Mixed / Broken / N/A) with a
priority fix list for Broken files on high-traffic routes.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Merge axis 3 (responsive coverage) + commit

**Files:**
- Read: scratch files, axis 3 sections
- Create: `docs/design/audit-complete/responsive.md`

- [ ] **Step 1: Extract axis 3 findings**

```bash
for f in /tmp/audit-scratch-2-1e/*.md; do
  awk '/^## Axis 3/,/^## Axis 4/' "$f"
done > /tmp/audit-scratch-2-1e/_axis3-all.md
```

- [ ] **Step 2: Write `docs/design/audit-complete/responsive.md`**

Structure: per subtree, with a "Flagged concerns" section at the top listing files with missing-breakpoint issues.

```markdown
# Responsive Coverage Audit (Phase 2.1e Axis 3)

> Per-file breakpoint coverage and flagged responsive concerns.

## Summary

- Files using breakpoint-adaptive patterns (`md:`, `lg:`, etc.): <count>
- Files with mobile-only chunks (`md:hidden`): <count>
- Files with desktop-only chunks (`hidden md:flex`): <count>
- Files with flagged missing-breakpoint concerns: <count>

## Flagged concerns

<one line per file with issue>

## Findings by subtree

### apps/web/app/
<paste>
(same structure as axis 1 merge)
```

- [ ] **Step 3: Commit**

```bash
git add docs/design/audit-complete/responsive.md
git commit -m "$(cat <<'EOF'
docs(audit): add Phase 2.1e axis 3 — responsive coverage

Per-file breakpoint usage and flagged missing-breakpoint concerns.
Organized by subtree with flagged-concerns summary at top.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Merge axis 4 (primitive-replacement) + commit

**Files:**
- Read: scratch files, axis 4 sections
- Create: `docs/design/audit-complete/primitives-replacement.md`

- [ ] **Step 1: Extract axis 4 findings**

```bash
for f in /tmp/audit-scratch-2-1e/*.md; do
  awk '/^## Axis 4/,/^## Axis 5/' "$f"
done > /tmp/audit-scratch-2-1e/_axis4-all.md
```

- [ ] **Step 2: Write `docs/design/audit-complete/primitives-replacement.md`**

This axis is best organized **by target primitive** (not by subtree) because the reader's likely question is "show me all the places I need to swap to `<Button>`."

Structure:

```markdown
# Primitive Replacement Backlog (Phase 2.1e Axis 4)

> Call sites across the rebuild that reinvent a primitive we have in `@nawhas/ui/components/`. Organized by target primitive. Phase 2.3 per-page specs consume the entries relevant to their page.

## Summary

- `Button` replacements needed: <count>
- `Card` replacements needed: <count>
- `Input` replacements needed: <count>
- `Dialog` replacements needed: <count>
- `DropdownMenu` replacements needed: <count>
- `Tooltip` replacements needed: <count>
- `Sheet` replacements needed: <count>
- `Select` replacements needed: <count>
- `Badge` replacements needed: <count>
- `Tabs` replacements needed: <count>
- `SectionTitle` replacements needed: <count>

## Button

### High confidence — primitive clearly fits

- `apps/web/src/components/<path>.tsx:<line>` — <one-line context>
(list)

### Lower confidence — primitive could fit but ad-hoc markup may be intentional

(list)

## Card

(same structure)

## Input

(...)

## Dialog / DropdownMenu / Tooltip / Sheet / Select / Badge / Tabs / SectionTitle

(...)

## Files that already consume primitives

<one line per file: path — which primitives>
```

Cross-reference against `packages/ui/src/index.ts` to ensure you only list primitives we actually export.

- [ ] **Step 3: Commit**

```bash
git add docs/design/audit-complete/primitives-replacement.md
git commit -m "$(cat <<'EOF'
docs(audit): add Phase 2.1e axis 4 — primitive-replacement backlog

Call sites that reinvent our @nawhas/ui primitives, organized by
target primitive. Phase 2.3 per-page specs can consume entries
filtered to their page's files.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Merge axis 5 (accessibility) + commit

**Files:**
- Read: scratch files, axis 5 sections
- Create: `docs/design/audit-complete/accessibility.md`

- [ ] **Step 1: Extract axis 5 findings**

```bash
for f in /tmp/audit-scratch-2-1e/*.md; do
  awk '/^## Axis 5/,/^## Axis 6/' "$f"
done > /tmp/audit-scratch-2-1e/_axis5-all.md
```

- [ ] **Step 2: Write `docs/design/audit-complete/accessibility.md`**

Organized **by severity** (Critical / Important / Nice-to-have), not by subtree. Reader's question is "show me what's broken."

Structure:

```markdown
# Accessibility Audit (Phase 2.1e Axis 5)

> A11y issues across the frontend, grouped by severity.

## Summary

- Critical: <count>
- Important: <count>
- Nice-to-have: <count>

## Critical

- `apps/web/src/components/<path>.tsx:<line>` — <issue> — <fix suggestion>
(list)

## Important

(list)

## Nice-to-have

(list)

## Files with no findings

<one-line-per-file list — confirms they were audited and clean>
```

- [ ] **Step 3: Commit**

```bash
git add docs/design/audit-complete/accessibility.md
git commit -m "$(cat <<'EOF'
docs(audit): add Phase 2.1e axis 5 — accessibility

A11y findings grouped by severity (Critical / Important / Nice-
to-have). Each entry: file:line + issue + fix suggestion.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Merge axis 6 (legacy-parity gap) + commit

**Files:**
- Read: scratch files, axis 6 sections
- Create: `docs/design/audit-complete/legacy-gap.md`

- [ ] **Step 1: Extract axis 6 findings**

```bash
for f in /tmp/audit-scratch-2-1e/*.md; do
  awk '/^## Axis 6/,/^## Axis 7/' "$f"
done > /tmp/audit-scratch-2-1e/_axis6-all.md
```

- [ ] **Step 2: Write `docs/design/audit-complete/legacy-gap.md`**

Organized **by page** (since 2.3 redesigns go page-by-page), not by subtree.

Structure:

```markdown
# Legacy Parity Gap Audit (Phase 2.1e Axis 6)

> Interactions / UI / copy present in legacy nawhas.com but missing or divergent in the rebuild. Organized by page so 2.3 specs can consume per-page entries.

## Summary

- Pages with gaps: <count>
- Intentional divergences (per Phase 2.1 decisions): <count, as reference>

## Home

### Missing
- <one line per gap with legacy source cite>

### Divergent (intentional)
- <one line per>

### Rebuild-only
- <one line per>

## Reciter profile

(same)

## Album

## Track

## Library

## Search

## Auth

## About

## Contribute + Mod

## Shared chrome

## Cross-page
```

Cross-reference against `docs/design/layouts.md` (Phase 2.1) and `docs/design/README.md § Decisions` (Phase 2.1 resolved items). Intentional divergences should be noted once per page with a pointer to the decision.

- [ ] **Step 3: Commit**

```bash
git add docs/design/audit-complete/legacy-gap.md
git commit -m "$(cat <<'EOF'
docs(audit): add Phase 2.1e axis 6 — legacy-parity gap

Missing / divergent / rebuild-only UI surfaces, organized by page.
Cross-referenced against Phase 2.1's layouts.md and resolved-
decisions README.

Refs: docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Merge axis 7 (dead / suspect code) + commit

**Files:**
- Read: scratch files, axis 7 sections
- Create: `docs/design/audit-complete/dead-code.md`

- [ ] **Step 1: Extract axis 7 findings**

```bash
for f in /tmp/audit-scratch-2-1e/*.md; do
  awk '/^## Axis 7/,0' "$f"
done > /tmp/audit-scratch-2-1e/_axis7-all.md
```

- [ ] **Step 2: Write `docs/design/audit-complete/dead-code.md`**

Structure:

```markdown
# Dead / Suspect Code Audit (Phase 2.1e Axis 7)

> TODO comments, commented-out blocks, unused exports, orphan state, unrouted components.

## Summary

- TODO / FIXME / HACK markers: <count>
- Commented-out code blocks (3+ lines): <count>
- Unused exports / orphan state: <count>
- Components with no known route / consumer: <count>

## TODO / FIXME / HACK

- `file:line` — <marker> — <one-line context>

## Commented-out code

- `file:line-range` — <one-line description>

## Unused exports

- `file:line` — <export name> — no consumers found in grep

## Orphan state / props

- `file:line` — <state/prop name> — unused

## Unrouted components

- `file.tsx` — no route / no consumer found (requires manual verification before deletion)
```

- [ ] **Step 3: Commit**

```bash
git add docs/design/audit-complete/dead-code.md
git commit -m "$(cat <<'EOF'
docs(audit): add Phase 2.1e axis 7 — dead / suspect code

TODO/FIXME/HACK markers, commented-out code, unused exports,
orphan state, unrouted components. Each entry flagged for review
before deletion (automated unrouted-check can produce false
positives for components loaded dynamically).

Refs: docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Write `docs/design/audit-complete/README.md` + closeout commit

**Files:**
- Create: `docs/design/audit-complete/README.md`
- Modify: `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md` (mark 2.1e shipped)

- [ ] **Step 1: Write the README**

Create `docs/design/audit-complete/README.md`:

```markdown
# Complete Frontend Audit (Phase 2.1e)

This directory is the output of **Phase 2.1e** of the rebuild roadmap — a per-file static audit of the frontend across seven axes. It supersedes Phase 2.1's narrower token + layout audit and serves as the definitive backlog for Phase 2.3 (page-by-page redesign).

## Why this audit exists

Phase 2.1's audit was narrow — token tables + page skeletons without per-file depth. That gap bit Phase 2.2: the token flip in `globals.css` assumed existing components consumed `bg-primary-*` / `bg-secondary-*` / `bg-neutral-*` tokens via the cascade; grep showed **zero** call sites of those classes. Real consumption: 161 `bg-gray-*`, 362 `text-gray-*`, 46 `bg-white`/`bg-black`, plus ~15 hardcoded `bg-green-*`/`bg-amber-*`/`bg-orange-*`/`bg-emerald-*`/`bg-yellow-*`. 2.1e closes that gap with a static per-file inventory.

## Axis docs

- **[tokens.md](./tokens.md)** — axis 1: token consumption per file (semantic / ramped / Tailwind-default / literal).
- **[dark-mode.md](./dark-mode.md)** — axis 2: dark-mode handling (Good / Mixed / Broken / N/A) per file.
- **[responsive.md](./responsive.md)** — axis 3: breakpoint coverage per file.
- **[primitives-replacement.md](./primitives-replacement.md)** — axis 4: sites that reinvent `@nawhas/ui` primitives, keyed by target primitive.
- **[accessibility.md](./accessibility.md)** — axis 5: a11y issues by severity (Critical / Important / Nice-to-have).
- **[legacy-gap.md](./legacy-gap.md)** — axis 6: missing / divergent / rebuild-only UI surfaces, by page.
- **[dead-code.md](./dead-code.md)** — axis 7: TODOs, commented-out code, unused exports, orphan state, unrouted components.

## How Phase 2.3 consumes this

Each page's 2.3 redesign spec reads:
- `tokens.md` — to know which files on the page need class rewrites.
- `dark-mode.md` — to know which files on the page have dark-mode gaps.
- `primitives-replacement.md` — to know which ad-hoc markup blocks to swap for primitives.
- `accessibility.md` — to fix Critical / Important issues as part of the redesign.
- `legacy-gap.md` — to restore missing affordances.
- `dead-code.md` — to delete / refactor alongside redesign.
- `responsive.md` — to validate breakpoint coverage post-redesign.

## Top findings (across axes)

- **Token consumption:** the rebuild's vast majority of color usage is stock Tailwind `gray-*` / `white` / `black` — **523 call sites** that don't route through our token layer. The token flip in Phase 2.2 applies only to the ~30-40 surfaces that use semantic tokens (i.e. Phase 2.2's primitive-swap commits).
- **Dark-mode:** <insert top-line count from axis 2>.
- **Primitive-replacement backlog:** <insert total count from axis 4>.
- **Accessibility:** <insert critical + important counts from axis 5>.
- **Legacy-parity:** Home hero, per-album node-vibrant background, lyrics highlight+sync, contextual AuthReason copy — and whatever else the audit surfaces.

## Methodology

Static review via ripgrep + file reads. No runtime, no screenshots. Dispatched as 11 subagent passes by subtree with a standardized checklist; outputs merged into per-axis docs.

Scratch / working files lived at `/tmp/audit-scratch-2-1e/` during execution and are not preserved — the seven axis docs are the committed output.

## What this document is *not*

Descriptive, not prescriptive. The axis docs inventory current state; they do not dictate which primitive should replace which ad-hoc pattern, which dark-mode fix to apply, or which legacy affordance to port. Those calls belong in Phase 2.3's per-page specs.
```

- [ ] **Step 2: Fill the "Top findings" counts**

After writing the README skeleton, grep the committed axis docs for the counts referenced in the "Top findings" section. Replace `<insert …>` placeholders with real numbers. Do not commit the README until these are filled.

- [ ] **Step 3: Update the parent roadmap's 2.1e section**

Open `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md`. Find the `### 2.1e Complete frontend audit` section (currently `Status: not started`). Replace its contents with a shipped-outcome section matching the pattern used for 2.1, 2.1d, 2.2:

```markdown
### 2.1e Complete frontend audit ✅ shipped 2026-04-22

Shipped as eight commits under `docs/design/audit-complete/`:

| File | Purpose |
|---|---|
| [`tokens.md`](../../design/audit-complete/tokens.md) | Per-file color / radius / shadow / spacing class inventory. |
| [`dark-mode.md`](../../design/audit-complete/dark-mode.md) | Dark-mode handling classification per file. |
| [`responsive.md`](../../design/audit-complete/responsive.md) | Breakpoint coverage per file. |
| [`primitives-replacement.md`](../../design/audit-complete/primitives-replacement.md) | Ad-hoc markup that should use a `@nawhas/ui` primitive. |
| [`accessibility.md`](../../design/audit-complete/accessibility.md) | A11y issues by severity. |
| [`legacy-gap.md`](../../design/audit-complete/legacy-gap.md) | Missing / divergent / rebuild-only UI surfaces, by page. |
| [`dead-code.md`](../../design/audit-complete/dead-code.md) | TODOs, commented-out blocks, unused exports, orphan state, unrouted components. |
| [`README.md`](../../design/audit-complete/README.md) | Index + methodology + top findings. |

Supersedes Phase 2.1's narrower audit claims about per-component token consumption. Phase 2.3's per-page specs consume the axis docs directly.

Refs: `docs/superpowers/specs/2026-04-22-phase-2-1e-complete-frontend-audit-design.md`, `docs/superpowers/plans/2026-04-22-phase-2-1e-complete-frontend-audit.md`.
```

Also update the `Status:` line at the top of the roadmap:

```
**Status:** Phase 1 shipped (2026-04-21) · Phase 2.1 shipped (2026-04-22) · 2.1 decisions resolved (2026-04-22) · Phase 2.1d shipped (2026-04-22) · Phase 2.2 shipped (2026-04-22) · Phase 2.1e shipped (2026-04-22) · Phase 2.1c + 2.3 not started
```

- [ ] **Step 4: Commit**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git add docs/design/audit-complete/README.md docs/superpowers/specs/2026-04-21-rebuild-roadmap.md
git commit -m "$(cat <<'EOF'
docs(audit): index Phase 2.1e audit + mark shipped in roadmap

README.md wires up the seven axis docs, explains how Phase 2.3
consumes them, and surfaces top-line findings. Parent roadmap
updated to reflect 2.1e shipped; remaining unblocked work is
Phase 2.3 (gated only by the parked Phase 2.1c lyrics-sync
research).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Wrap-up

After Task 19, `main` has eight new commits (tokens.md, dark-mode.md, responsive.md, primitives-replacement.md, accessibility.md, legacy-gap.md, dead-code.md, README+roadmap closeout). Push when ready:

```bash
git push
```

The audit's direct output is the backlog for Phase 2.3. The `/tmp/audit-scratch-2-1e/` directory can be deleted any time — it's ephemeral.
