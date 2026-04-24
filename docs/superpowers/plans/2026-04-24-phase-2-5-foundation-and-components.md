# Phase 2.5 — Foundation & Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rebuild's design tokens, fonts, theme, and shared components with the POC's, on a single feature branch. Lands the substrate that all 13 page re-skins (Phase C, separate plan) consume.

**Architecture:** Approach A from the spec — tokens → components → pages, on the feature branch `phase-2.5-poc-reskin`. This plan covers tokens (Phase A) and components (Phase B). Phase C (page re-skins) gets its own plan written after Phase B's Lighthouse canary passes — page tasks can be specified accurately only against the actual ported components.

**Tech Stack:** Next 16 / React 19 / Tailwind 4 / TypeScript 6 / `next/font/google` / `next-themes` / `next-intl` / vitest + @testing-library/react. Existing repo conventions: shadcn primitives in `packages/ui`, route components in `apps/web/app/`, app-level components in `apps/web/src/components/`, tests in adjacent `__tests__/` folders.

**Spec:** [`docs/superpowers/specs/2026-04-24-poc-design-port-design.md`](../specs/2026-04-24-poc-design-port-design.md).

**POC reference:** [`nawhas/new-design-poc`](https://github.com/nawhas/new-design-poc).

---

## File structure

**Phase A (modify only — no new files):**

| File | Responsibility |
|---|---|
| `apps/web/app/globals.css` | Replace token blocks (palette ramps, semantic tokens, dark overrides). Drop unused font / shadow / radius tokens. |
| `apps/web/tailwind.config.ts` | Drop `fontFamily.arabic`, add `fontFamily.serif` for Fraunces. |
| `apps/web/app/layout.tsx` | Drop Bellefair / Roboto Slab / Roboto Mono / Noto Naskh Arabic font loaders; add Fraunces. Switch `<html>` className list. |
| `apps/web/src/components/theme/ThemeProvider.tsx` | Switch `next-themes` config: `attribute="data-theme"`, `defaultTheme="dark"`, drop `enableSystem`. |
| `apps/web/src/components/theme/ThemeToggle.tsx` | Rewrite for 2-way light↔dark cycle (drop `system` mode). |
| `apps/web/src/components/theme/__tests__/ThemeToggle.test.tsx` | Rewrite tests for 2-way cycle. |
| `apps/web/messages/en.json` | Drop `switchToSystem` key; update `switchTo*` semantics. |

**Phase B (new + modify):**

| File | Responsibility |
|---|---|
| `packages/ui/src/components/footer.tsx` (NEW) | Site footer (POC port + i18n + accessible link list). |
| `packages/ui/src/components/__tests__/footer.test.tsx` (NEW) | Footer render + link role tests. |
| `packages/ui/src/components/cover-art.tsx` (NEW) | Augmented POC `CoverArt`: accepts `{ artworkUrl?, slug, label?, size? }`, renders `<img>` if URL present else gradient. |
| `packages/ui/src/components/__tests__/cover-art.test.tsx` (NEW) | URL vs gradient fallback paths. |
| `packages/ui/src/components/reciter-avatar.tsx` (NEW) | Augmented POC `ReciterAvatar`: accepts `{ avatarUrl?, name, size? }`, renders `<img>` if URL present else gradient initials. |
| `packages/ui/src/components/__tests__/reciter-avatar.test.tsx` (NEW) | URL vs initials fallback paths. |
| `packages/ui/src/components/track-row.tsx` (NEW) | POC port: grid row with title link, reciter link, poet, duration, plays. |
| `packages/ui/src/components/__tests__/track-row.test.tsx` (NEW) | Render + duration formatter + plays formatter. |
| `packages/ui/src/components/waveform.tsx` (NEW) | POC port: deterministic 64-bar waveform with click-to-seek prop. |
| `packages/ui/src/components/__tests__/waveform.test.tsx` (NEW) | Deterministic bar-count + click handler. |
| `packages/ui/src/index.ts` | Export new components. |
| `apps/web/src/components/layout/header.tsx` | Restyle to POC header treatment (translucent `--header-bg`, backdrop blur, accent CTA). Wiring stays. |
| `apps/web/src/components/player/PlayerBar.tsx` | Visual restyle (POC `MiniPlayer` template). Audio-engine wiring (`useAudio`, queue, seek, HTMLAudioElement) stays. |
| `apps/web/app/layout.tsx` | Replace `<></>` footer placeholder with the new `Footer`. |
| `apps/web/messages/en.json` | Add `poc.footer.*`, `poc.coverArt.*` (alt text), `poc.waveform.*` keys. |
| `docs/design/visual-vocabulary.md` (NEW) | One-page visual rules for routes the POC didn't cover. Lighthouse-canary results appended. |

**Files NOT touched in this plan** (deferred to Phase C):
- Any route file under `apps/web/app/` other than `layout.tsx`.
- Any page-level component (`apps/web/src/components/{home,reciters,albums,tracks,library,search,contribute,mod,profile,settings,history,auth}/`).
- Existing card components (`album-card.tsx`, `reciter-card.tsx`) — they get rewritten or removed in the corresponding Phase C row, not now.

---

## Pre-flight

### Task 0.1: Create the feature branch

**Files:** branch only.

- [ ] **Step 1: Verify on `main`, clean tree, and synced with origin**

```bash
git status
git fetch origin && git log --oneline HEAD..origin/main
```

Expected: working tree clean, no commits on origin/main not in HEAD (or trivial — pull if any).

- [ ] **Step 2: Create and switch to the feature branch**

```bash
git checkout -b phase-2.5-poc-reskin
```

Expected: `Switched to a new branch 'phase-2.5-poc-reskin'`.

- [ ] **Step 3: Push the empty branch to origin**

```bash
git push -u origin phase-2.5-poc-reskin
```

Expected: branch published; subsequent commits will track origin.

> **Note on branch policy:** Per `MEMORY.md`, the user's default workflow on this repo is direct-to-main commits without a feature branch. Phase 2.5 explicitly overrides this — the spec's Section 7 rollback plan ("`git revert -m 1 <merge-commit>`") requires a merge commit, which requires a branch. All subsequent commits in this plan land on `phase-2.5-poc-reskin`, not `main`.

---

## Phase A — Foundation (single commit)

### Task A.1: Replace palette ramps in `apps/web/app/globals.css`

**Files:**
- Modify: `apps/web/app/globals.css` lines 12–149 (the comment block + `@theme {}` palette ramps for primary / secondary / accent / neutral / error / info / success / warning).

**Goal:** The Tailwind `bg-primary-500`, `text-accent-600`, etc. utilities resolve to the POC's hue family — a `red-50..950` ramp anchored on POC `#c9302c`, with semantic tokens flipped to POC's `#10b981 / #f59e0b / #3b82f6 / #ef4444`.

- [ ] **Step 1: Replace the comment block at lines 12–24 with the new provenance**

Old:
```css
/* ----------------------------------------------------------------------
 * Tailwind 4 @theme — palette ramps (primary=red, secondary=zinc,
 * accent=orange, error=red, info=blue, success=green, warning=amber)
 *
 * Values derived from Phase 2.1 audit (docs/design/tokens.md):
 *   - primary anchor: Vuetify colors.red.base (#F44336) — approximated
 *     by Tailwind red-500 (#ef4444). Deviation ~3% RGB; imperceptible.
 *   - secondary anchor: Vuetify colors.grey.darken2 (#616161) —
 *     approximated by Tailwind zinc-700 (#3f3f46)/zinc-600 (#52525b).
 *   - accent anchor: Vuetify colors.orange.accent3 (#FF6D00) —
 *     approximated by Tailwind orange-600 (#ea580c).
 * Visual parity verification is in Phase 2.1b / 2.3.
 * ---------------------------------------------------------------------- */
```

New:
```css
/* ----------------------------------------------------------------------
 * Tailwind 4 @theme — palette ramps for the POC design system.
 *
 * Values derived from the nawhas/new-design-poc prototype, anchored on:
 *   - primary anchor: POC accent #c9302c — a darker, slightly desaturated
 *     red than the prior 2.2 token (Vuetify red #F44336). The 50..950 ramp
 *     was generated to land #c9302c at the 700 step, with the surrounding
 *     steps interpolated linearly in OKLCH for perceptual smoothness.
 *   - neutral / surface anchors: POC `--bg / --surface / --surface-2`
 *     (#0a0a0b / #141416 / #1a1a1d in dark; #ffffff / #fafafa / #f4f4f5
 *     in light).
 *   - semantic anchors: POC `--success #10b981`, `--warning #f59e0b`,
 *     `--info #3b82f6`, `--danger #ef4444`.
 *
 * Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
 * Supersedes: the Phase 2.1 audit's "Decisions resolved 2026-04-22"
 * brand-hue restoration (legacy red #F44336).
 * ---------------------------------------------------------------------- */
```

- [ ] **Step 2: Replace `--color-primary-50..950` with the POC-anchored ramp**

```css
  /* Primary — POC red, anchored at 700 = #c9302c */
  --color-primary-50:  #fdf2f2;
  --color-primary-100: #fae0df;
  --color-primary-200: #f4bcba;
  --color-primary-300: #ec918e;
  --color-primary-400: #e1645f;
  --color-primary-500: #d34741;
  --color-primary-600: #b9342f;
  --color-primary-700: #c9302c;  /* POC --accent */
  --color-primary-800: #8d231f;
  --color-primary-900: #6e1a18;
  --color-primary-950: #3f0d0c;
```

- [ ] **Step 3: Drop the secondary / accent / wordmark blocks; replace with POC neutral surfaces**

The existing `--color-secondary-*` (zinc), `--color-accent-*` (orange), and `--color-wordmark` are Phase 2.2 artefacts. The POC has no comparable secondary/accent ramp — it uses `--accent` (the primary red) for emphasis and the neutral ramp for everything else. Replace the secondary/accent blocks with:

```css
  /* Secondary / accent — POC uses the primary accent for emphasis;
   * keep these aliases pointing at the primary ramp so existing
   * shadcn primitives that reference `--color-secondary-*` still
   * resolve. Re-aliased rather than removed because Tailwind utilities
   * like `bg-secondary-100` are emitted by the shadcn CLI for select /
   * dropdown chrome and would 404 otherwise. */
  --color-secondary-50:  var(--color-primary-50);
  --color-secondary-100: var(--color-primary-100);
  --color-secondary-200: var(--color-primary-200);
  --color-secondary-300: var(--color-primary-300);
  --color-secondary-400: var(--color-primary-400);
  --color-secondary-500: var(--color-primary-500);
  --color-secondary-600: var(--color-primary-600);
  --color-secondary-700: var(--color-primary-700);
  --color-secondary-800: var(--color-primary-800);
  --color-secondary-900: var(--color-primary-900);
  --color-secondary-950: var(--color-primary-950);

  --color-accent-50:  var(--color-primary-50);
  --color-accent-100: var(--color-primary-100);
  --color-accent-200: var(--color-primary-200);
  --color-accent-300: var(--color-primary-300);
  --color-accent-400: var(--color-primary-400);
  --color-accent-500: var(--color-primary-500);
  --color-accent-600: var(--color-primary-600);
  --color-accent-700: var(--color-primary-700);
  --color-accent-800: var(--color-primary-800);
  --color-accent-900: var(--color-primary-900);
  --color-accent-950: var(--color-primary-950);
```

Delete the `--color-wordmark` line (no POC equivalent).

- [ ] **Step 4: Replace neutral ramp with POC's surface anchors**

```css
  /* Neutral — POC surfaces.
   * Light: #ffffff bg, #fafafa surface, #f4f4f5 surface-2.
   * Dark: #0a0a0b bg, #141416 surface, #1a1a1d surface-2.
   * The 50..950 scale is interpolated to land the POC's three
   * step anchors at the lightest, surface, and darkest levels. */
  --color-neutral-50:  #fafafa;
  --color-neutral-100: #f4f4f5;
  --color-neutral-200: #e6e6e8;
  --color-neutral-300: #d4d4d8;
  --color-neutral-400: #a1a1a6;
  --color-neutral-500: #8e8e98;
  --color-neutral-600: #6b6b70;
  --color-neutral-700: #5a5a62;
  --color-neutral-800: #1a1a1d;
  --color-neutral-900: #141416;
  --color-neutral-950: #0a0a0b;
```

- [ ] **Step 5: Replace error / info / success / warning ramps with POC-anchored values**

The POC names a single anchor per family (`#ef4444`, `#3b82f6`, `#10b981`, `#f59e0b`). Rebuild the ramps so the anchor lands at the 500 step (matches Tailwind convention).

```css
  /* Error — POC --danger #ef4444 */
  --color-error-50:  #fef2f2;
  --color-error-100: #fee2e2;
  --color-error-200: #fecaca;
  --color-error-300: #fca5a5;
  --color-error-400: #f87171;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-error-700: #b91c1c;
  --color-error-800: #991b1b;
  --color-error-900: #7f1d1d;
  --color-error-950: #450a0a;

  /* Info — POC --info #3b82f6 */
  --color-info-50:  #eff6ff;
  --color-info-100: #dbeafe;
  --color-info-200: #bfdbfe;
  --color-info-300: #93c5fd;
  --color-info-400: #60a5fa;
  --color-info-500: #3b82f6;
  --color-info-600: #2563eb;
  --color-info-700: #1d4ed8;
  --color-info-800: #1e40af;
  --color-info-900: #1e3a8a;
  --color-info-950: #172554;

  /* Success — POC --success #10b981 */
  --color-success-50:  #ecfdf5;
  --color-success-100: #d1fae5;
  --color-success-200: #a7f3d0;
  --color-success-300: #6ee7b7;
  --color-success-400: #34d399;
  --color-success-500: #10b981;
  --color-success-600: #059669;
  --color-success-700: #047857;
  --color-success-800: #065f46;
  --color-success-900: #064e3b;
  --color-success-950: #022c22;

  /* Warning — POC --warning #f59e0b */
  --color-warning-50:  #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-200: #fde68a;
  --color-warning-300: #fcd34d;
  --color-warning-400: #fbbf24;
  --color-warning-500: #f59e0b;
  --color-warning-600: #d97706;
  --color-warning-700: #b45309;
  --color-warning-800: #92400e;
  --color-warning-900: #78350f;
  --color-warning-950: #451a03;
```

(The existing values for these four families happen to be POC-aligned; this step is mostly a no-op but explicit to confirm.)

- [ ] **Step 6: Run typecheck to confirm no syntax error**

```bash
./dev typecheck
```

Expected: 7/7 packages green.

### Task A.2: Add POC semantic surface tokens to `globals.css`

**Files:**
- Modify: `apps/web/app/globals.css` — extend the second `@theme {}` block (semantic tokens, currently lines 186–213) and the `.dark {}` block (currently lines 219–244) with POC-named surface and accent tokens.

**Goal:** New components ported from the POC reference `--accent`, `--accent-soft`, `--accent-glow`, `--bg`, `--surface`, `--surface-2`, `--card-bg`, `--text`, `--text-dim`, `--text-faint`, `--header-bg`, `--input-bg`, `--border`, `--border-strong` directly. These need to exist as CSS custom properties bound to the right values per theme.

- [ ] **Step 1: Add POC tokens to the light-mode `@theme {}` block**

Append to the `@theme {}` block at line 186:

```css
  /* ─── POC tokens (light mode) ─── */
  --accent:        #c9302c;
  --accent-soft:   #e8524e;
  --accent-glow:   rgba(201, 48, 44, 0.08);
  --bg:            #ffffff;
  --surface:       #fafafa;
  --surface-2:     #f4f4f5;
  --card-bg:       #ffffff;
  --text:          #0a0a0b;
  --text-dim:      #5a5a62;
  --text-faint:    #8e8e98;
  --header-bg:     rgba(255, 255, 255, 0.8);
  --input-bg:      #f4f4f5;
  --border:        #e6e6e8;
  --border-strong: #d4d4d8;
```

- [ ] **Step 2: Add POC dark-mode overrides to the `.dark {}` block**

Append to the `.dark {}` block at line 219:

```css
  /* ─── POC tokens (dark mode) ─── */
  --accent:        #c9302c;
  --accent-soft:   #e8524e;
  --accent-glow:   rgba(201, 48, 44, 0.15);
  --bg:            #0a0a0b;
  --surface:       #141416;
  --surface-2:     #1a1a1d;
  --card-bg:       #141416;
  --text:          #f5f5f7;
  --text-dim:      #a1a1a6;
  --text-faint:    #6b6b70;
  --header-bg:     rgba(10, 10, 11, 0.7);
  --input-bg:      #1a1a1d;
  --border:        rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.18);
```

- [ ] **Step 3: Update the body block for POC body-text rules**

Replace the existing `body {}` block (lines 250–254) with:

```css
body {
  font-family: var(--font-sans);
  background-color: var(--bg);
  color: var(--text);
  font-size: 15px;
  line-height: 1.6;
  letter-spacing: -0.01em;
  transition: background-color 0.25s, color 0.25s;
}
```

(POC uses the literal POC tokens for body bg/color, not the shadcn semantic ones. Both still resolve correctly because the shadcn `--color-background / --color-foreground` semantic tokens map onto the POC neutral ramp via Task A.1's neutral overrides, but addressing them directly via `--bg` / `--text` matches the POC source for readability.)

- [ ] **Step 4: Drop the slab + arabic font selectors**

Delete the `[lang="ar"] { font-family: var(--font-arabic); }` block at line 262. (Keep `[lang="ur"] { font-family: var(--font-urdu); }` — Nastaliq stays.) Arabic falls back to system serif per the spec.

- [ ] **Step 5: Run dev server and eyeball the home page**

```bash
./dev up
```

Open http://localhost:3100. Expected: red accents now render in the POC's darker `#c9302c`, not Vuetify's lighter `#F44336`. Page background now `#0a0a0b` in dark mode, `#ffffff` in light.

### Task A.3: Update `apps/web/tailwind.config.ts` for new font families

**Files:**
- Modify: `apps/web/tailwind.config.ts` lines 9–17.

**Goal:** Drop the slab + arabic + mono font helpers (POC doesn't use them). Add a `serif` family alias for Fraunces. Keep `urdu` (Nastaliq still ships).

- [ ] **Step 1: Replace the `theme.extend.fontFamily` block**

Old:
```ts
  theme: {
    extend: {
      fontFamily: {
        arabic: ['var(--font-noto-naskh-arabic)', 'serif'],
        urdu: ['var(--font-noto-nastaliq-urdu)', 'serif'],
      },
    },
  },
```

New:
```ts
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
        urdu: ['var(--font-noto-nastaliq-urdu)', 'serif'],
      },
    },
  },
```

- [ ] **Step 2: Run typecheck**

```bash
./dev typecheck
```

Expected: green.

### Task A.4: Drop unused fonts and add Fraunces in `apps/web/app/layout.tsx`

**Files:**
- Modify: `apps/web/app/layout.tsx` lines 2–9 (imports), 26–72 (font loaders), 112 (`<html>` className).

**Goal:** The page loads Inter + Fraunces + Noto Nastaliq Urdu only. Bellefair, Roboto Slab, Roboto Mono, Noto Naskh Arabic are dropped (Lighthouse R7 mitigation: 6 fonts → 3).

- [ ] **Step 1: Update the `next/font/google` import list**

Old:
```ts
import {
  Inter,
  Bellefair,
  Roboto_Slab,
  Roboto_Mono,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
} from 'next/font/google';
```

New:
```ts
import { Inter, Fraunces, Noto_Nastaliq_Urdu } from 'next/font/google';
```

- [ ] **Step 2: Replace the font loader block**

Replace lines 26–72 with:

```ts
// Inter — primary UI sans (--font-sans token).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Fraunces — display serif for headings, branding (--font-serif / --font-fraunces).
// optical-size axis lets headings render in the larger optical-size variant
// (more contrast, finer detail) while body uses the smaller (sturdier).
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Noto Nastaliq Urdu — Urdu RTL content (Nastaliq calligraphic style).
// Loaded only because the [lang="ur"] selector targets it on lyric blocks.
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-nastaliq-urdu',
  display: 'swap',
});
```

(Note `display: 'swap'` not `'optional'` — POC behaviour. CLS impact mitigated by Inter being widely cached + Fraunces being a hero font where slight text reflow on first load is acceptable.)

- [ ] **Step 3: Update the `<html>` className list**

Old:
```tsx
className={`${inter.variable} ${bellefair.variable} ${robotoSlab.variable} ${robotoMono.variable} ${notoNaskhArabic.variable} ${notoNastaliqUrdu.variable}`}
```

New:
```tsx
className={`${inter.variable} ${fraunces.variable} ${notoNastaliqUrdu.variable}`}
```

- [ ] **Step 4: Drop the unused `--font-bellefair / --font-roboto-slab / --font-roboto-mono / --font-noto-naskh-arabic` references in globals.css**

Modify `apps/web/app/globals.css` lines 27–33. Replace the font block:

```css
@theme {
  /* Fonts */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif: var(--font-fraunces), ui-serif, Georgia, serif;
  --font-urdu: var(--font-noto-nastaliq-urdu), ui-serif, Georgia, serif;
```

Drop the `--font-slab`, `--font-mono`, `--font-arabic` lines.

- [ ] **Step 5: Run typecheck and dev server**

```bash
./dev typecheck && ./dev up
```

Open http://localhost:3100. Expected: body uses Inter; the home page hero (any place that previously used Bellefair / Roboto Slab) renders in browser default serif until Phase B's components apply Fraunces. No `Cannot find module` errors.

### Task A.5: Switch `ThemeProvider` to `data-theme` + dark default

**Files:**
- Modify: `apps/web/src/components/theme/ThemeProvider.tsx` lines 11–21.

**Goal:** `next-themes` uses `attribute="data-theme"` (writes `<html data-theme="dark">`), defaults to dark on first visit, no system-preference auto-detect.

- [ ] **Step 1: Replace the `<NextThemesProvider>` props**

Old:
```tsx
return (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    {children}
  </NextThemesProvider>
);
```

New:
```tsx
return (
  <NextThemesProvider
    attribute="data-theme"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange
  >
    {children}
  </NextThemesProvider>
);
```

- [ ] **Step 2: Update `globals.css` dark-mode selector**

The existing selector (line 219) is `.dark { ... }` and the custom variant declaration (line 10) is `@custom-variant dark (&:where(.dark, .dark *));`. Switch both to `[data-theme="dark"]`:

Modify line 10:
```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

Modify line 219:
```css
[data-theme="dark"] {
```

(All `.dark:` Tailwind utility selectors emitted by Tailwind 4 will now match against `[data-theme="dark"]` ancestors via the custom variant — no per-component change required.)

- [ ] **Step 3: Run typecheck**

```bash
./dev typecheck
```

Expected: green.

### Task A.6: Rewrite `ThemeToggle` for 2-way light↔dark cycle

**Files:**
- Modify: `apps/web/src/components/theme/ThemeToggle.tsx` (full rewrite of the cycle logic).
- Modify: `apps/web/messages/en.json` (drop `nav.switchToSystem`).

**Goal:** Toggle cycles light ↔ dark only. No "system" stop. aria-label and icon flip accordingly.

- [ ] **Step 1: Update i18n messages**

Modify `apps/web/messages/en.json` — find the `nav` block (line 2 area) and:
- Delete the line `"switchToSystem": "Switch to system mode",` if present.
- Confirm `switchToLight` and `switchToDark` exist; if missing, add:

```json
    "switchToLight": "Switch to light mode",
    "switchToDark": "Switch to dark mode",
```

- [ ] **Step 2: Replace the `NEXT_THEME` map and aria-label map in `ThemeToggle.tsx`**

Old:
```ts
const NEXT_THEME: Record<string, string> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
```

New:
```ts
const NEXT_THEME: Record<string, string> = {
  light: 'dark',
  dark: 'light',
};
```

- [ ] **Step 3: Replace the aria-label map block**

Find the block (lines 87–93):

Old:
```ts
const ARIA_LABEL_MAP: Record<string, string> = {
  system: t('switchToLight'),
  light: t('switchToDark'),
  dark: t('switchToSystem'),
};

const ariaLabel = ARIA_LABEL_MAP[currentTheme] ?? t('switchToLight');
```

New:
```ts
const ARIA_LABEL_MAP: Record<string, string> = {
  light: t('switchToDark'),
  dark: t('switchToLight'),
};

const ariaLabel = ARIA_LABEL_MAP[currentTheme] ?? t('switchToDark');
```

- [ ] **Step 4: Adjust the icon-flip logic**

Find line 106:

Old:
```tsx
{currentTheme === 'light' ? <MoonIcon /> : <SunIcon />}
```

This is already correct for a 2-way cycle (light → show moon icon meaning "switch to dark"; dark → show sun icon meaning "switch to light"). Leave unchanged.

- [ ] **Step 5: Update the fallback `setTheme` call**

Find line 96:

Old:
```ts
setTheme(NEXT_THEME[currentTheme] ?? 'light');
```

New:
```ts
setTheme(NEXT_THEME[currentTheme] ?? 'dark');
```

(Default fallback flips from light→dark since dark is the new default theme.)

- [ ] **Step 6: Run typecheck**

```bash
./dev typecheck
```

Expected: green.

### Task A.7: Rewrite `ThemeToggle` test for 2-way cycle

**Files:**
- Modify: `apps/web/src/components/theme/__tests__/ThemeToggle.test.tsx` (drop system-mode tests, add 2-way cycle tests).

- [ ] **Step 1: Replace the test file contents**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

const mockSetTheme = vi.fn();
let mockTheme = 'dark';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

const translations: Record<string, string> = {
  toggleThemeLabel: 'Toggle theme',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => translations[key] ?? key,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockTheme = 'dark';
});

describe('ThemeToggle (2-way cycle)', () => {
  it('has aria-label "Switch to dark mode" in light mode', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeDefined();
  });

  it('has aria-label "Switch to light mode" in dark mode', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeDefined();
  });

  it('cycles light → dark on click', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('cycles dark → light on click', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('button is not disabled when mounted', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
./dev test --filter ThemeToggle
```

Expected: 5 tests pass. (Equivalent: `pnpm --filter @nawhas/web test -- ThemeToggle.test`.)

### Task A.8: Phase A QA + smoke

- [ ] **Step 1: Run full QA**

```bash
./dev qa
```

Expected: typecheck + lint + ~474 unit tests all pass (the ThemeToggle test count drops by 1 — 6 → 5 — because we removed the system-mode test and added one new 2-way test, net -1).

- [ ] **Step 2: Manual smoke**

```bash
./dev up
```

Open http://localhost:3100 in a private window. Confirm:

- Page loads in **dark mode by default** (no system-pref check, no localStorage).
- Body text is Inter; backgrounds are POC neutral (`#0a0a0b` dark / `#ffffff` light).
- Click theme toggle → page flips to light. Reload → still light (localStorage persistence). Click again → dark. Reload → still dark.
- DevTools: `<html>` has `data-theme="dark"` or `data-theme="light"` attribute, NOT `class="dark"`.
- Existing Vuetify-red buttons (e.g. the home-page primary CTA, if visible) now render in the POC's darker `#c9302c`.

### Task A.9: Commit Phase A

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/app/globals.css apps/web/app/layout.tsx apps/web/tailwind.config.ts \
        apps/web/src/components/theme/ThemeProvider.tsx \
        apps/web/src/components/theme/ThemeToggle.tsx \
        apps/web/src/components/theme/__tests__/ThemeToggle.test.tsx \
        apps/web/messages/en.json
git commit -m "$(cat <<'EOF'
feat(design): swap design tokens, fonts, and theme to POC system

Phase A of Phase 2.5 (POC re-skin). Replaces the Phase 2.2 design
foundation (Vuetify-red palette, Bellefair / Roboto Slab / Roboto Mono /
Noto Naskh Arabic fonts, system-default 3-way theme) with the POC's:

- Palette: primary ramp anchored at #c9302c (POC --accent), neutral
  ramp anchored on POC surface tokens (#0a0a0b / #141416 / #1a1a1d).
  Semantic tokens unchanged (already POC-aligned). Secondary / accent
  ramps re-aliased to primary so existing shadcn-emitted utilities
  still resolve.
- POC literal tokens (--accent, --bg, --surface, --text, --header-bg,
  etc.) added alongside the shadcn semantic layer for direct use by
  Phase B components.
- Fonts: Inter + Fraunces + Noto Nastaliq Urdu only. Dropped Bellefair,
  Roboto Slab, Roboto Mono, Noto Naskh Arabic (Lighthouse R7 mitigation:
  6 families → 3). Body now 15px / line-height 1.6 / letter-spacing
  -0.01em per POC.
- Theme: data-theme attribute (was class), default dark (was system-
  preference), no enableSystem. ThemeToggle now a 2-way light↔dark
  cycle; system-mode dropped.

The Phase 2.1 audit's "Decisions resolved 2026-04-22" brand-hue and
typography decisions are explicitly superseded; banner already added
to docs/design/README.md.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-foundation-and-components.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds. `git log --oneline -1` shows the new commit on `phase-2.5-poc-reskin`.

---

## Phase B — Components

### Task B.1.1: Port `Footer` to `packages/ui`

**Files:**
- Create: `packages/ui/src/components/footer.tsx`
- Modify: `packages/ui/src/index.ts` (add export).
- Modify: `apps/web/messages/en.json` (add `poc.footer.*` keys).

**Goal:** Site-wide footer with i18n strings (POC ports its hardcoded English to `next-intl`). Renders four columns + bottom bar. Pure presentation.

- [ ] **Step 1: Add i18n keys**

Modify `apps/web/messages/en.json`. Locate a sensible place after the existing `nav` block (around line 18) and add:

```json
  "footer": {
    "product": "Product",
    "browse": "Browse",
    "reciters": "Reciters",
    "albums": "Albums",
    "community": "Community",
    "recentChanges": "Recent Changes",
    "dashboard": "Dashboard",
    "contribute": "Contribute",
    "admin": "Admin",
    "moderation": "Moderation",
    "about": "About",
    "aboutBody": "Nawhas is a community-driven library of Islamic devotional recitation and poetry.",
    "copyright": "© {year} Nawhas. All rights reserved."
  },
```

(Place it logically — alphabetical works, or after `nav`.)

- [ ] **Step 2: Write the failing test first**

Create `packages/ui/src/components/__tests__/footer.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Footer } from '../footer';

const translations: Record<string, string> = {
  product: 'Product',
  browse: 'Browse',
  reciters: 'Reciters',
  albums: 'Albums',
  community: 'Community',
  recentChanges: 'Recent Changes',
  dashboard: 'Dashboard',
  contribute: 'Contribute',
  admin: 'Admin',
  moderation: 'Moderation',
  about: 'About',
  aboutBody: 'Nawhas is a community-driven library of Islamic devotional recitation and poetry.',
  copyright: '© 2026 Nawhas. All rights reserved.',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const raw = translations[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  },
}));

afterEach(() => cleanup());

describe('Footer', () => {
  it('renders the four section headings', () => {
    render(<Footer />);
    expect(screen.getByRole('heading', { name: 'Product' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Community' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'About' })).toBeDefined();
  });

  it('renders a Browse link pointing to /library', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'Browse' });
    expect(link.getAttribute('href')).toBe('/library');
  });

  it('renders the copyright with the current year interpolated', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Nawhas. All rights reserved.`)).toBeDefined();
  });

  it('uses a <footer> landmark', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test, confirm failure**

```bash
pnpm --filter @nawhas/ui test -- footer.test
```

Expected: FAIL with `Cannot find module '../footer'` or similar.

- [ ] **Step 4: Implement `Footer`**

Create `packages/ui/src/components/footer.tsx`:

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer(): React.JSX.Element {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-[var(--border)] bg-[var(--surface)] py-16 mt-30"
    >
      <div className="mx-auto max-w-[1200px] px-8 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('product')}</h3>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/library">{t('browse')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/reciters">{t('reciters')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/albums">{t('albums')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('community')}</h3>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/changes">{t('recentChanges')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/profile">{t('dashboard')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/contribute">{t('contribute')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('admin')}</h3>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/mod">{t('moderation')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('about')}</h3>
          <p className="text-sm leading-relaxed text-[var(--text-faint)]">{t('aboutBody')}</p>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-8 mt-10 pt-10 border-t border-[var(--border)] text-center text-xs text-[var(--text-faint)]">
        <p>{t('copyright', { year })}</p>
      </div>
    </footer>
  );
}
```

(Notes on translation: POC's `/library` and `/dashboard` and `/changes` and `/submit` and `/moderation` map to rebuild's `/library`, `/profile`, `/changes` does not yet exist (Phase 2.4 W2 deliverable), `/contribute`, `/mod`. The Footer points at the rebuild's actual route paths; the public `/changes` route will exist by W2 — link points there ahead of the route's existence is acceptable since the Footer renders globally and W2 lands before public launch.)

- [ ] **Step 5: Export from `packages/ui/src/index.ts`**

Append to `packages/ui/src/index.ts`:

```ts
export { Footer } from './components/footer';
```

- [ ] **Step 6: Run test, confirm pass**

```bash
pnpm --filter @nawhas/ui test -- footer.test
```

Expected: 4 tests pass.

### Task B.1.2: Wire `Footer` into root layout

**Files:**
- Modify: `apps/web/app/layout.tsx` lines 12 (import) and 118 (render).

- [ ] **Step 1: Add Footer import**

After existing layout imports (around line 13):

```tsx
import { Footer } from '@nawhas/ui';
```

- [ ] **Step 2: Replace footer placeholder**

Old:
```tsx
<PageLayout header={<SiteHeaderDynamic />} footer={<></>}>
```

New:
```tsx
<PageLayout header={<SiteHeaderDynamic />} footer={<Footer />}>
```

- [ ] **Step 3: Run typecheck and dev server**

```bash
./dev typecheck && ./dev up
```

Open http://localhost:3100. Expected: footer with 4 columns visible at the bottom of every page, dark surface background, Inter sans for body text.

### Task B.1.3: Restyle `Header` to POC treatment

**Files:**
- Modify: `apps/web/src/components/layout/header.tsx`.

**Goal:** Translucent header (`--header-bg` with backdrop blur), accent-coloured wordmark in Fraunces, POC nav layout. **Functional wiring stays** — `useSession()`, route guard, locale switcher, search-bar slot, mobile-nav drawer.

This is a restyle, not a port. The POC's `Header.tsx` (9.1 KB) is the visual reference, but the existing `header.tsx` already wires Better-Auth + next-intl correctly. Replace the wrapper / navigation classes; keep the children.

- [ ] **Step 1: Read the existing header**

```bash
wc -l apps/web/src/components/layout/header.tsx
```

(Check current size; if >300 lines, consider splitting the rendered chrome from the `useSession` data layer in this same task. Otherwise restyle in place.)

- [ ] **Step 2: Update the outer header element**

Find the top-level `<header>` element. Replace its className with:

```tsx
<header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur supports-[backdrop-filter]:bg-[var(--header-bg)]">
```

- [ ] **Step 3: Update the wordmark**

Find the wordmark / logo Link. Replace its className with:

```tsx
<Link href="/" aria-label={t('logoLabel')} className="font-serif text-2xl font-medium text-[var(--accent)]">
  {t('logoText')}
</Link>
```

(Fraunces serif, accent red, medium weight per POC home-page header.)

- [ ] **Step 4: Update nav-link styling**

Find each nav `Link` (Browse Reciters, Browse Albums, Contribute, etc.). Wrap or replace with the POC pattern:

```tsx
<Link
  href="..."
  className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
>
  {label}
</Link>
```

(POC nav links are 14px sans, dimmed, hover-to-full-opacity. The exact list of links does not change.)

- [ ] **Step 5: Update the Sign In / user-menu trigger**

If a Sign In button exists, restyle its className:

```tsx
<Link
  href="/login"
  className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-soft)] transition-colors"
>
  {t('signIn')}
</Link>
```

(For the user-menu trigger when signed in, keep the existing `DropdownMenu` primitive but restyle the trigger button with `--input-bg` / `--border` / `--text-dim` per POC.)

- [ ] **Step 6: Run typecheck + dev server**

```bash
./dev typecheck && ./dev up
```

Open http://localhost:3100. Expected: header is translucent over the page background, sticky on scroll, wordmark renders in Fraunces and POC accent red. Nav links subtle. Sign-in CTA in POC accent red.

### Task B.1.4: Run header tests

**Files:**
- Existing tests in `apps/web/src/components/layout/__tests__/`.

- [ ] **Step 1: Run header tests**

```bash
./dev test --filter header
```

Expected: existing tests pass. If a snapshot or class-name assertion fails (likely — restyle changes classes), update the assertion to match the new POC class strings rather than reverting the restyle.

If new test cases are warranted (e.g. visible wordmark, sticky behaviour), add them following the existing patterns in `__tests__/`.

### Task B.1.5: Commit B.1 (chrome family)

- [ ] **Step 1: Stage and commit**

```bash
git add packages/ui/src/components/footer.tsx \
        packages/ui/src/components/__tests__/footer.test.tsx \
        packages/ui/src/index.ts \
        apps/web/app/layout.tsx \
        apps/web/src/components/layout/header.tsx \
        apps/web/src/components/layout/__tests__/ \
        apps/web/messages/en.json
git commit -m "$(cat <<'EOF'
feat(ui): port POC chrome — Footer (new), Header restyle

Phase B.1 of Phase 2.5. Adds Footer to packages/ui (i18n-powered,
accessible footer landmark, 4-column grid, copyright with year
interpolation). Restyles existing Header to POC treatment
(translucent --header-bg + backdrop blur, Fraunces wordmark in
--accent, dimmed nav links, accent CTA). Wiring (useSession, locale
switcher, search-bar slot, mobile-nav) untouched.

POC's hardcoded English ported to next-intl footer.* keys.

Refs: docs/superpowers/plans/2026-04-24-phase-2-5-foundation-and-components.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B.2.1: Port `CoverArt` to `packages/ui` (augmented)

**Files:**
- Create: `packages/ui/src/components/cover-art.tsx`
- Create: `packages/ui/src/components/__tests__/cover-art.test.tsx`
- Modify: `packages/ui/src/index.ts`.
- Modify: `apps/web/messages/en.json` (add `coverArt.*` alt-text keys).

**Goal:** Augmented POC CoverArt — accepts `{ artworkUrl?, slug, label?, size? }`, renders an `<img>` if `artworkUrl` is non-empty, else falls back to the POC's gradient set keyed deterministically off `slug`. Used by every album / track surface.

- [ ] **Step 1: Add i18n alt-text keys**

Modify `apps/web/messages/en.json`:

```json
  "coverArt": {
    "albumAlt": "Cover art for {label}",
    "trackAlt": "Cover art for {label}",
    "placeholderLabel": "Album cover"
  },
```

- [ ] **Step 2: Write failing test**

Create `packages/ui/src/components/__tests__/cover-art.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { CoverArt } from '../cover-art';

const translations: Record<string, string> = {
  albumAlt: 'Cover art for {label}',
  placeholderLabel: 'Album cover',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const raw = translations[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  },
}));

afterEach(() => cleanup());

describe('CoverArt', () => {
  it('renders an <img> when artworkUrl is provided', () => {
    render(<CoverArt slug="x" artworkUrl="https://example.com/art.png" label="Panjtan Pak" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/art.png');
    expect(img.getAttribute('alt')).toBe('Cover art for Panjtan Pak');
  });

  it('falls back to a gradient div when artworkUrl is undefined', () => {
    const { container } = render(<CoverArt slug="panjtan-pak" label="Panjtan Pak" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-cover-variant]')).not.toBeNull();
  });

  it('picks the same gradient variant for the same slug (deterministic)', () => {
    const { container: a } = render(<CoverArt slug="repeatable" label="A" />);
    const { container: b } = render(<CoverArt slug="repeatable" label="B" />);
    const va = a.querySelector('[data-cover-variant]')?.getAttribute('data-cover-variant');
    const vb = b.querySelector('[data-cover-variant]')?.getAttribute('data-cover-variant');
    expect(va).toBe(vb);
  });

  it('size="sm" applies the small size token', () => {
    const { container } = render(<CoverArt slug="x" label="A" size="sm" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('data-size')).toBe('sm');
  });
});
```

- [ ] **Step 3: Run test, confirm failure**

```bash
pnpm --filter @nawhas/ui test -- cover-art.test
```

Expected: FAIL with `Cannot find module '../cover-art'`.

- [ ] **Step 4: Implement `CoverArt`**

Create `packages/ui/src/components/cover-art.tsx`:

```tsx
import { useTranslations } from 'next-intl';

export interface CoverArtProps {
  slug: string;
  artworkUrl?: string | null;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const GRADIENTS = [
  'linear-gradient(135deg, #3a1a1a 0%, #1a0a0a 100%)',
  'linear-gradient(135deg, #2a1a3a 0%, #0a0a1a 100%)',
  'linear-gradient(135deg, #1a2a3a 0%, #0a0a1a 100%)',
  'linear-gradient(135deg, #3a2a1a 0%, #1a0a0a 100%)',
  'linear-gradient(135deg, #2a1a2a 0%, #0a0a1a 100%)',
  'linear-gradient(135deg, #1a3a2a 0%, #0a1a0a 100%)',
  'linear-gradient(135deg, #3a1a2a 0%, #1a0a1a 100%)',
  'linear-gradient(135deg, #2a3a1a 0%, #0a1a0a 100%)',
  'linear-gradient(135deg, #1a3a3a 0%, #0a1a1a 100%)',
  'linear-gradient(135deg, #3a3a1a 0%, #1a1a0a 100%)',
] as const;

const SIZES = {
  sm: { width: '120px', height: '120px', fontSize: '36px' },
  md: { width: '240px', height: '240px', fontSize: '80px' },
  lg: { width: '360px', height: '360px', fontSize: '160px' },
} as const;

function pickVariant(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h % GRADIENTS.length;
}

export function CoverArt({ slug, artworkUrl, label, size = 'md' }: CoverArtProps): React.JSX.Element {
  const t = useTranslations('coverArt');
  const dims = SIZES[size];
  const altText = label ? t('albumAlt', { label }) : t('placeholderLabel');

  if (artworkUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={artworkUrl}
        alt={altText}
        data-size={size}
        style={{
          width: dims.width,
          height: dims.height,
          borderRadius: '16px',
          objectFit: 'cover',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}
      />
    );
  }

  const variantIndex = pickVariant(slug);
  return (
    <div
      data-cover-variant={`cov-${variantIndex + 1}`}
      data-size={size}
      role="img"
      aria-label={altText}
      style={{
        width: dims.width,
        height: dims.height,
        borderRadius: '16px',
        background: GRADIENTS[variantIndex],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 60%)',
        }}
      />
      {label && (
        <div
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: dims.fontSize,
            color: 'rgba(255,255,255,0.15)',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '20px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Export and run test**

Append to `packages/ui/src/index.ts`:

```ts
export { CoverArt, type CoverArtProps } from './components/cover-art';
```

```bash
pnpm --filter @nawhas/ui test -- cover-art.test
```

Expected: 4 tests pass.

### Task B.2.2: Port `ReciterAvatar` to `packages/ui` (augmented)

**Files:**
- Create: `packages/ui/src/components/reciter-avatar.tsx`
- Create: `packages/ui/src/components/__tests__/reciter-avatar.test.tsx`
- Modify: `packages/ui/src/index.ts`.

**Goal:** Augmented POC ReciterAvatar — `{ avatarUrl?, name, size? }`. Renders `<img>` when URL present, else gradient circle with initials. Initials derived from name (first letter of first two words).

- [ ] **Step 1: Write failing test**

Create `packages/ui/src/components/__tests__/reciter-avatar.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { ReciterAvatar } from '../reciter-avatar';

afterEach(() => cleanup());

describe('ReciterAvatar', () => {
  it('renders an <img> when avatarUrl is provided', () => {
    render(<ReciterAvatar avatarUrl="https://example.com/a.png" name="Ali Safdar" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/a.png');
    expect(img.getAttribute('alt')).toBe('Ali Safdar');
  });

  it('falls back to gradient circle with initials when no avatarUrl', () => {
    render(<ReciterAvatar name="Ali Safdar" />);
    expect(screen.getByText('AS')).toBeDefined();
  });

  it('derives initials from a single-word name', () => {
    render(<ReciterAvatar name="Hassan" />);
    expect(screen.getByText('H')).toBeDefined();
  });

  it('picks the same gradient for the same name (deterministic)', () => {
    const { container: a } = render(<ReciterAvatar name="Repeat" />);
    const { container: b } = render(<ReciterAvatar name="Repeat" />);
    const va = a.querySelector('[data-avatar-variant]')?.getAttribute('data-avatar-variant');
    const vb = b.querySelector('[data-avatar-variant]')?.getAttribute('data-avatar-variant');
    expect(va).toBe(vb);
  });
});
```

- [ ] **Step 2: Implement `ReciterAvatar`**

Create `packages/ui/src/components/reciter-avatar.tsx`:

```tsx
export interface ReciterAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const GRADIENTS = [
  'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
  'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
  'linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)',
  'linear-gradient(135deg, #9333ea 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  'linear-gradient(135deg, #ca8a04 0%, #713f12 100%)',
  'linear-gradient(135deg, #db2777 0%, #831843 100%)',
  'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
  'linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%)',
  'linear-gradient(135deg, #0891b2 0%, #164e63 100%)',
  'linear-gradient(135deg, #0d9488 0%, #134e4a 100%)',
  'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
  'linear-gradient(135deg, #e11d48 0%, #831843 100%)',
  'linear-gradient(135deg, #65a30d 0%, #3f6212 100%)',
  'linear-gradient(135deg, #d946ef 0%, #6b21a8 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #0284c7 0%, #0c2d6b 100%)',
  'linear-gradient(135deg, #ec4899 0%, #9f1239 100%)',
] as const;

const SIZES = {
  sm: { width: '32px', height: '32px', fontSize: '11px' },
  md: { width: '56px', height: '56px', fontSize: '16px' },
  lg: { width: '96px', height: '96px', fontSize: '28px' },
} as const;

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function pickGradient(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % GRADIENTS.length;
}

export function ReciterAvatar({ name, avatarUrl, size = 'md' }: ReciterAvatarProps): React.JSX.Element {
  const dims = SIZES[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: dims.width,
          height: dims.height,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    );
  }

  const variantIndex = pickGradient(name);
  return (
    <div
      data-avatar-variant={`av-${variantIndex + 1}`}
      role="img"
      aria-label={name}
      style={{
        width: dims.width,
        height: dims.height,
        borderRadius: '50%',
        background: GRADIENTS[variantIndex],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: dims.fontSize,
        fontWeight: 600,
      }}
    >
      {deriveInitials(name)}
    </div>
  );
}
```

- [ ] **Step 3: Export and run test**

Append to `packages/ui/src/index.ts`:

```ts
export { ReciterAvatar, type ReciterAvatarProps } from './components/reciter-avatar';
```

```bash
pnpm --filter @nawhas/ui test -- reciter-avatar.test
```

Expected: 4 tests pass.

### Task B.2.3: Port `TrackRow` to `packages/ui`

**Files:**
- Create: `packages/ui/src/components/track-row.tsx`
- Create: `packages/ui/src/components/__tests__/track-row.test.tsx`
- Modify: `packages/ui/src/index.ts`.

**Goal:** Single canonical track row used by `/album/[slug]`, `/library/tracks`, `/search`, related-tracks lists, etc. Renders title link, reciter link, poet, duration, plays. Replaces the per-page TrackRow variants in `apps/web/src/components/{tracks,albums,library}/`.

This task **does not** delete the existing per-page variants (that happens in Phase C, page-by-page). It only adds the canonical version to `packages/ui`.

- [ ] **Step 1: Write failing test**

Create `packages/ui/src/components/__tests__/track-row.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { TrackRow } from '../track-row';

afterEach(() => cleanup());

describe('TrackRow', () => {
  it('links the title to /track/[slug]', () => {
    render(<TrackRow slug="kun-faya" title="Kun Faya" reciter="Ali Safdar" reciterSlug="ali-safdar" duration={245} />);
    const link = screen.getByRole('link', { name: 'Kun Faya' });
    expect(link.getAttribute('href')).toBe('/track/kun-faya');
  });

  it('links the reciter to /reciter/[slug]', () => {
    render(<TrackRow slug="kun-faya" title="Kun Faya" reciter="Ali Safdar" reciterSlug="ali-safdar" duration={245} />);
    const link = screen.getByRole('link', { name: 'Ali Safdar' });
    expect(link.getAttribute('href')).toBe('/reciter/ali-safdar');
  });

  it('formats duration as M:SS', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={245} />);
    expect(screen.getByText('4:05')).toBeDefined();
  });

  it('formats sub-minute duration with leading 0:', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={45} />);
    expect(screen.getByText('0:45')).toBeDefined();
  });

  it('renders em-dash for missing poet', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={100} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('formats plays as Xk for thousands', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={100} plays={12345} />);
    expect(screen.getByText('12.3k')).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement `TrackRow`**

Create `packages/ui/src/components/track-row.tsx`:

```tsx
import Link from 'next/link';

export interface TrackRowProps {
  slug: string;
  title: string;
  reciter: string;
  reciterSlug: string;
  poet?: string;
  duration: number;
  plays?: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatPlays(plays?: number): string {
  if (!plays) return '—';
  if (plays < 1000) return String(plays);
  return `${(plays / 1000).toFixed(1)}k`;
}

export function TrackRow({
  slug,
  title,
  reciter,
  reciterSlug,
  poet,
  duration,
  plays,
}: TrackRowProps): React.JSX.Element {
  return (
    <div
      className="grid items-center gap-4 border-b border-[var(--border)] py-3"
      style={{ gridTemplateColumns: '1fr 180px 100px 80px 80px' }}
    >
      <Link
        href={`/track/${slug}`}
        className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors"
      >
        {title}
      </Link>
      <Link
        href={`/reciter/${reciterSlug}`}
        className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
      >
        {reciter}
      </Link>
      <div className="text-sm text-[var(--text-faint)]">{poet || '—'}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatDuration(duration)}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatPlays(plays)}</div>
    </div>
  );
}
```

- [ ] **Step 3: Export and run test**

Append to `packages/ui/src/index.ts`:

```ts
export { TrackRow, type TrackRowProps } from './components/track-row';
```

```bash
pnpm --filter @nawhas/ui test -- track-row.test
```

Expected: 6 tests pass.

### Task B.2.4: Commit B.2 (entity primitives)

- [ ] **Step 1: Stage and commit**

```bash
git add packages/ui/src/components/cover-art.tsx \
        packages/ui/src/components/reciter-avatar.tsx \
        packages/ui/src/components/track-row.tsx \
        packages/ui/src/components/__tests__/cover-art.test.tsx \
        packages/ui/src/components/__tests__/reciter-avatar.test.tsx \
        packages/ui/src/components/__tests__/track-row.test.tsx \
        packages/ui/src/index.ts \
        apps/web/messages/en.json
git commit -m "$(cat <<'EOF'
feat(ui): port POC entity primitives — CoverArt, ReciterAvatar, TrackRow

Phase B.2 of Phase 2.5. Adds three augmented POC primitives to
packages/ui that every album / track / reciter surface consumes:

- CoverArt: deterministic gradient fallback (10-variant set keyed off
  slug) when artworkUrl is null; <img> otherwise. i18n alt text. Sizes
  sm / md / lg.
- ReciterAvatar: deterministic gradient circle with initials fallback
  (18-variant set keyed off name) when avatarUrl is null; <img>
  otherwise. Initials derived from first + last word of name.
- TrackRow: canonical 5-column row (title / reciter / poet / duration
  / plays). Replaces per-page TrackRow variants in apps/web (deletion
  of the legacy variants happens per-page in Phase C).

All three augment the POC source by adding a real-data path while
preserving the static/gradient fallback for slugs/names that lack a
hosted asset.

Refs: docs/superpowers/plans/2026-04-24-phase-2-5-foundation-and-components.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B.3.1: Port `Waveform` to `packages/ui`

**Files:**
- Create: `packages/ui/src/components/waveform.tsx`
- Create: `packages/ui/src/components/__tests__/waveform.test.tsx`
- Modify: `packages/ui/src/index.ts`.
- Modify: `apps/web/messages/en.json` (add `waveform.*` keys).

**Goal:** Visual waveform with deterministic 64-bar layout keyed off the track slug. Click-to-seek bubbles a callback up to the parent. The component is **stateless** — current bar and seek action are owned by the parent (PlayerBar), unlike the POC's self-contained version. This matches the rebuild's existing audio engine which lives in `audio-provider.tsx`.

- [ ] **Step 1: Add i18n keys**

Modify `apps/web/messages/en.json`:

```json
  "waveform": {
    "ariaLabel": "Audio waveform — click to seek",
    "barLabel": "Seek to {percent}%"
  },
```

- [ ] **Step 2: Write failing test**

Create `packages/ui/src/components/__tests__/waveform.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { Waveform } from '../waveform';

const translations: Record<string, string> = {
  ariaLabel: 'Audio waveform — click to seek',
  barLabel: 'Seek to {percent}%',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const raw = translations[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  },
}));

afterEach(() => cleanup());

describe('Waveform', () => {
  it('renders 64 bars by default', () => {
    const { container } = render(<Waveform slug="x" />);
    expect(container.querySelectorAll('[data-waveform-bar]').length).toBe(64);
  });

  it('produces the same bar pattern for the same slug (deterministic)', () => {
    const { container: a } = render(<Waveform slug="repeat" />);
    const { container: b } = render(<Waveform slug="repeat" />);
    const heightsA = Array.from(a.querySelectorAll<HTMLElement>('[data-waveform-bar]')).map(el => el.style.height);
    const heightsB = Array.from(b.querySelectorAll<HTMLElement>('[data-waveform-bar]')).map(el => el.style.height);
    expect(heightsA).toEqual(heightsB);
  });

  it('highlights the active bar based on currentPercent', () => {
    const { container } = render(<Waveform slug="x" currentPercent={50} />);
    const bars = container.querySelectorAll<HTMLElement>('[data-waveform-bar]');
    // 50% of 64 = bar index 32
    expect(bars[32]?.getAttribute('data-active')).toBe('true');
    expect(bars[31]?.getAttribute('data-active')).toBe('false');
  });

  it('calls onSeek with the clicked bar percent', () => {
    const onSeek = vi.fn();
    const { container } = render(<Waveform slug="x" onSeek={onSeek} />);
    const bars = container.querySelectorAll<HTMLElement>('[data-waveform-bar]');
    fireEvent.click(bars[16]!);
    // bar 16 of 64 = 25%
    expect(onSeek).toHaveBeenCalledWith(25);
  });

  it('renders the duration in M:SS', () => {
    render(<Waveform slug="x" durationSec={245} />);
    expect(screen.getByText('4:05')).toBeDefined();
  });

  it('has an accessible region label', () => {
    render(<Waveform slug="x" />);
    expect(screen.getByRole('group', { name: 'Audio waveform — click to seek' })).toBeDefined();
  });
});
```

- [ ] **Step 3: Implement `Waveform`**

Create `packages/ui/src/components/waveform.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export interface WaveformProps {
  slug: string;
  durationSec?: number;
  currentPercent?: number;
  onSeek?: (percent: number) => void;
}

const BAR_COUNT = 64;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildBars(slug: string): number[] {
  const bars: number[] = [];
  let seed = 0;
  for (let i = 0; i < BAR_COUNT; i++) {
    seed = (seed + slug.charCodeAt(i % slug.length)) % 1000;
    bars.push(Math.max(6, seededRandom(seed) * 100));
  }
  return bars;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function Waveform({
  slug,
  durationSec = 0,
  currentPercent = 0,
  onSeek,
}: WaveformProps): React.JSX.Element {
  const t = useTranslations('waveform');
  const bars = useMemo(() => buildBars(slug), [slug]);
  const activeBar = Math.min(BAR_COUNT - 1, Math.floor((currentPercent / 100) * BAR_COUNT));

  return (
    <div className="pb-12">
      <div
        role="group"
        aria-label={t('ariaLabel')}
        className="flex items-center gap-[2px] h-[72px] mb-4 cursor-pointer"
      >
        {bars.map((height, idx) => {
          const isActive = idx === activeBar;
          const percent = Math.round((idx / BAR_COUNT) * 100);
          return (
            <button
              key={idx}
              type="button"
              data-waveform-bar
              data-active={isActive ? 'true' : 'false'}
              aria-label={t('barLabel', { percent })}
              onClick={() => onSeek?.(percent)}
              className="flex-1 rounded-[2px] border-0 transition-colors"
              style={{
                background: isActive ? 'var(--accent-soft)' : 'var(--border)',
                minHeight: '6px',
                height: `${height}%`,
                padding: 0,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-[var(--text-faint)]">
        <span>0:00</span>
        <span>{formatDuration(durationSec)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Export and run test**

Append to `packages/ui/src/index.ts`:

```ts
export { Waveform, type WaveformProps } from './components/waveform';
```

```bash
pnpm --filter @nawhas/ui test -- waveform.test
```

Expected: 6 tests pass.

### Task B.3.2: Restyle `PlayerBar` visual layer

**Files:**
- Modify: `apps/web/src/components/player/PlayerBar.tsx`.

**Goal:** PlayerBar matches the POC's visual treatment — translucent backdrop, accent play button, compact metadata. **Audio engine wiring (`useAudio`, queue, seek, HTMLAudioElement) is unchanged.** Only the JSX template + classes change.

The Waveform component is **not** wired into PlayerBar in this task — Waveform belongs on the track-detail page (Phase C row 6). PlayerBar uses a simple progress bar.

- [ ] **Step 1: Read current PlayerBar shape**

```bash
wc -l apps/web/src/components/player/PlayerBar.tsx
```

Identify the top-level `<div>` / `<aside>` element wrapping the player chrome. Identify the audio metadata section, the play/pause button, the progress / scrubber, the queue/expand button.

- [ ] **Step 2: Restyle the outer container**

Find the top-level player-bar element. Replace its className with:

```tsx
<aside
  role="region"
  aria-label={t('playerLabel')}
  className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur"
>
  <div className="mx-auto max-w-[1200px] px-6 py-3 flex items-center gap-4">
    {/* metadata + controls + progress */}
  </div>
</aside>
```

- [ ] **Step 3: Restyle the play / pause button**

Find the existing play/pause button. Replace its className with:

```tsx
<button
  type="button"
  onClick={togglePlay}
  aria-label={isPlaying ? t('pause') : t('play')}
  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-soft)] transition-colors"
>
  {/* play / pause SVG, unchanged */}
</button>
```

- [ ] **Step 4: Restyle the progress / scrubber**

Find the progress bar / scrubber element. Replace its visual classes with:

```tsx
<div className="flex-1 flex items-center gap-3 text-xs text-[var(--text-faint)]">
  <span>{formatTime(currentTime)}</span>
  <input
    type="range"
    min={0}
    max={duration || 0}
    value={currentTime}
    onChange={(e) => seek(Number(e.target.value))}
    className="flex-1 h-1 appearance-none bg-[var(--border)] rounded-full accent-[var(--accent)]"
    aria-label={t('seek')}
  />
  <span>{formatTime(duration)}</span>
</div>
```

(Other player-bar elements — queue button, expand button, volume — get analogous restyles. The pattern: `--text-dim` for icon-only buttons, `--accent` for primary CTA, `--surface` / `--border` for chrome.)

- [ ] **Step 5: Update `apps/web/messages/en.json` with any new player keys**

If PlayerBar gains `playerLabel` / `play` / `pause` / `seek` keys not present, add them under the existing `player.*` namespace in `en.json`. (Most are already there from prior phases — only add what's genuinely new.)

- [ ] **Step 6: Run tests**

```bash
./dev test --filter PlayerBar
```

Expected: existing PlayerBar tests pass. If a snapshot or class-name assertion fails, update the assertion to match the restyle (do not revert the restyle).

- [ ] **Step 7: Manual smoke**

```bash
./dev up
```

Open http://localhost:3100. Click any track that has audio (use seeded fixtures from `./dev db:seed`). Confirm:

- PlayerBar slides in at the bottom; translucent backdrop visible over content.
- Play button is POC accent red, white icon.
- Scrubber slider is grey track with accent thumb.
- Audio plays (this depends on Mitigation R2 — restoring MinIO `:9000` host port. If audio is not yet restored, smoke without audio: confirm the play button shows the pause icon after click but no audio plays).

### Task B.3.3: Commit B.3 (audio surfaces)

- [ ] **Step 1: Stage and commit**

```bash
git add packages/ui/src/components/waveform.tsx \
        packages/ui/src/components/__tests__/waveform.test.tsx \
        packages/ui/src/index.ts \
        apps/web/src/components/player/PlayerBar.tsx \
        apps/web/messages/en.json
git commit -m "$(cat <<'EOF'
feat(ui): port POC Waveform + restyle PlayerBar visual layer

Phase B.3 of Phase 2.5. Adds Waveform to packages/ui (deterministic
64-bar layout keyed off track slug; click-to-seek callback bubbles
to parent; stateless — current bar derived from a currentPercent prop
owned by the parent). Waveform consumed by the track-detail page in
Phase C; PlayerBar uses a simpler progress bar.

Restyles PlayerBar to POC treatment: translucent --surface/95 + backdrop
blur, fixed bottom, accent play button, accent-themed scrubber.
Audio-engine wiring (useAudio, queue, seek, HTMLAudioElement, mod-only
state) untouched — visual layer only.

Refs: docs/superpowers/plans/2026-04-24-phase-2-5-foundation-and-components.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B.4.1: Write the visual vocabulary doc

**Files:**
- Create: `docs/design/visual-vocabulary.md`.

**Goal:** One page enumerating the visual rules to apply to routes the POC didn't cover (`(auth)/*`, `/profile`, `/settings`, `/library/history`, `/search`, `/mod/queue|audit|users`, `/contribute/edit/*`). Phase C uses this doc as the authority for those routes.

- [ ] **Step 1: Write the doc**

Create `docs/design/visual-vocabulary.md`:

```markdown
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
```

### Task B.4.2: Lighthouse canary

**Files:**
- (none — uses existing `.lighthouserc.json`).

**Goal:** Before page work begins, confirm the new tokens + fonts have not regressed Lighthouse perf / a11y / FCP / LCP / CLS thresholds.

- [ ] **Step 1: Bring up the production-like web container**

```bash
./dev down
docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d --wait web
```

Expected: prod-like `web` container (built via `next build` + `next start`) healthy.

- [ ] **Step 2: Run Lighthouse CI**

```bash
npx --yes @lhci/cli@0.15 autorun
```

Expected: passes the assertions in `.lighthouserc.json`:
- `categories:performance` ≥ 0.8
- `categories:accessibility` ≥ 0.95
- `first-contentful-paint` ≤ 2000ms
- `largest-contentful-paint` ≤ 2500ms
- `cumulative-layout-shift` ≤ 0.1

- [ ] **Step 3: Capture results**

Append the run summary (pass/fail + key metrics) to the bottom of `docs/design/visual-vocabulary.md`:

```markdown
---

## Lighthouse canary — Phase B end (YYYY-MM-DD)

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Performance | ... | ≥ 0.8 | ... |
| Accessibility | ... | ≥ 0.95 | ... |
| FCP | ...ms | ≤ 2000ms | ... |
| LCP | ...ms | ≤ 2500ms | ... |
| CLS | ... | ≤ 0.1 | ... |

Result: [PASS / FAIL with detail]. Phase C cleared to begin.
```

- [ ] **Step 4: If Lighthouse fails, fix-forward before Phase C**

Per spec R7: "if violated, treat as branch blocker." Common likely culprits:

- Backdrop-blur on translucent header → CLS hit. Mitigation: add `transform: translateZ(0)` to promote header layer, or drop blur entirely.
- Fraunces optical-size axis adds bytes → LCP hit. Mitigation: drop `axes: ['opsz']`, fall back to a single optical-size variant.
- Missing `preload` hints on Inter → FCP delay. Mitigation: add `<link rel="preload">` in layout for the most-used Inter weight.

Investigate, fix on the branch, re-run. Do not proceed to Phase C until Lighthouse is green.

### Task B.4.3: Commit B.4 (visual vocabulary + canary)

- [ ] **Step 1: Stage and commit**

```bash
git add docs/design/visual-vocabulary.md
git commit -m "$(cat <<'EOF'
docs(design): add visual vocabulary + Phase B Lighthouse canary

Phase B.4 of Phase 2.5. Captures the visual rules for routes the POC
prototype does not cover (auth, profile, settings, library/history,
search, mod/audit, mod/users, mod/queue, contribute/edit, error /
not-found / loading boundaries). Phase C treats this doc as the
authority for those routes; per-PR debates settle here.

Lighthouse canary results captured at the bottom — Phase C cleared
to begin.

Refs: docs/superpowers/plans/2026-04-24-phase-2-5-foundation-and-components.md
      docs/superpowers/specs/2026-04-24-poc-design-port-design.md (R7)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B.5: Phase B end-of-phase QA

- [ ] **Step 1: Full QA**

```bash
./dev qa
```

Expected: typecheck + lint + all unit tests green. Test count should be roughly +20 (4 Footer + 4 CoverArt + 4 ReciterAvatar + 6 TrackRow + 6 Waveform = 24, less the 1 ThemeToggle test removed in A.6 = +23 net).

- [ ] **Step 2: Full E2E**

```bash
./dev test:e2e --ci
```

Expected: every existing spec passes. Phase A+B touched chrome, theme, footer, header, and player visual — selectors that target visible text generally hold; selectors that target Tailwind class names (`.bg-primary-500`) may break and need updating in the same Phase B context.

- [ ] **Step 3: Push the branch**

```bash
git push origin phase-2.5-poc-reskin
```

(Branch is published from Task 0.1; this is a follow-up push of all Phase A + B commits.)

- [ ] **Step 4: Hand off to Phase C**

The next step in this roadmap is to write the Phase C plan (`docs/superpowers/plans/2026-04-24-phase-2-5-pages.md`, or similar) covering the 13 page re-skins. Phase C plan tasks reference:

- The new tokens / theme from Phase A
- The new Footer / Header / CoverArt / ReciterAvatar / TrackRow / Waveform components from Phase B
- The visual vocabulary doc for extrapolated routes

Phase C is **NOT** in scope for this plan.

---

## Self-review checklist

After implementing each task above, the implementer should be able to answer "yes" to all of:

1. Was the failing test written first (where applicable)?
2. Was the test confirmed failing before the implementation?
3. Was the implementation the minimal code needed to pass the test?
4. Was the test confirmed passing after the implementation?
5. Was a commit made for each task or task family with a descriptive message?

For the plan as a whole:

- **Spec coverage:** Phase A covers spec sections "Foundation (tokens, fonts, theme)". Phase B covers spec sections "Components". Phase C (pages, what gets thrown away enforcement, page-by-page restyles) is explicitly deferred to a follow-up plan. Spec sections "Risks", "Verification", "Sequencing", "What gets thrown away" are addressed inline in the relevant tasks (R2 audio dev fix surfaces in B.3.2 step 7; R7 Lighthouse canary is B.4.2; R3 ramp aliasing is A.1 step 3; R5 a11y mandate is enforced by reusing shadcn primitives in B.1.3 / B.3.2; R8 brand reversal banner is in the prior commit, called out in A.9).
- **Placeholder scan:** No "TBD", no "TODO", no "implement later". Code blocks are complete in every code step.
- **Type consistency:** Component props names match between definition and tests (`CoverArtProps.artworkUrl`, `ReciterAvatarProps.avatarUrl`, `WaveformProps.currentPercent` and `onSeek`, `TrackRowProps.reciterSlug`).
- **No imaginary symbols:** All imported types / functions are either defined in this plan (in an earlier task) or already exist in the rebuild (verified in pre-flight discovery).

## Notes on Phase C (pages)

Phase C will re-skin 13 routes per the spec's Pages table, in dependency order: home → reciters → reciter/[slug] → albums → album/[slug] → track/[slug] → library/tracks → search → (auth)/* → contribute/* → mod/* → (protected)/profile|settings|library/history → error/not-found/loading.

Phase C tasks will:

1. Replace the page's existing layout with one that consumes the Phase B components.
2. Use the visual vocabulary doc for any treatment not directly covered by a Phase B component.
3. Update the page's existing tests for new selectors.
4. Add or update an e2e spec assertion for the new layout's golden path.
5. Land as one PR-sized commit per row.

Each row should take 2–6 hours of focused work. The full Phase C is roughly 13 × 4h ≈ 50 hours of work.

After Phase C ships, the feature branch is reviewed against the spec's pre-merge gates (Section 7) and merged to `main` as a single merge commit.
