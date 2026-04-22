# Phase 2.2 — Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codify Phase 2.1's audit-derived tokens into `globals.css`, generate 12 primitives in `packages/ui`, and mechanically swap existing inline usage (`Button`, `Card`, `Input`, `DropdownMenu`) over to the new primitives.

**Architecture:** shadcn/ui CLI generates Radix-backed primitives into `packages/ui/src/components/` (components.json is already wired). Tokens in `globals.css @theme` follow shadcn's semantic layer (`--background`, `--foreground`, `--primary`, ...) with a class-based `.dark` override for dark mode. Tailwind 4 `@theme` maps semantic tokens onto Tailwind-default palette ramps (red / zinc / orange) as the underlying color source so we get rich tonal ramps without hand-rolling shades.

**Tech Stack:** Tailwind 4.2, React 19, Next.js 16, TypeScript 6, shadcn CLI (latest), Radix UI 2.x, `lucide-react`, `sonner`, Vitest 4, `next/font/google`. All commands run via the `./dev` script.

---

## Pre-flight

**Branch setup.** Per user preference, work direct to `main` (no worktree, no branch). Each task commits on `main`. Working tree should be clean before starting.

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git status
# Expected: "On branch main … nothing to commit, working tree clean"
# (docs/design/.audit-notes.md may remain untracked — that's expected scratch from Phase 2.1)
```

**Baseline smoke.** Before touching anything, capture a green-state baseline:

```bash
./dev typecheck
./dev lint
./dev test
```

Expected: all green. If anything is red on `main`, **stop and fix it first** — you cannot distinguish 2.2-induced regressions from pre-existing failures otherwise.

**Compatibility probe (shadcn CLI × Tailwind 4 × React 19).** Before committing to the CLI path, confirm shadcn's latest generator emits code that builds. This is the biggest risk flagged in the spec.

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
pnpm dlx shadcn@latest --version
# Expected: a version string; verify it is >= 2.x (Tailwind 4 support)
```

If the CLI is older than 2.x, upgrade guidance: `pnpm dlx shadcn@latest add button --help` prints the version it will invoke. We will generate Button first in Task 3; if that generation produces code that fails typecheck, abandon the CLI approach and hand-author Button as a pattern, then hand-author all primitives. Do NOT proceed past Task 3 with broken output.

---

## Task 1: Token flip — `globals.css` @theme + `components.json`

**Why this comes first:** the whole point of "visible day-one change" is this commit. Every existing component already uses classes like `bg-primary-500`, `rounded-lg`, `shadow-sm` — they all pick up new values via the cascade the moment tokens change. No other changes need to ship first.

**Files:**
- Modify: `apps/web/app/globals.css` (replace `@theme` block, add `.dark` overrides, add `@theme inline` semantic tokens)
- Modify: `packages/ui/components.json` (`baseColor: slate` → `baseColor: zinc`)

- [ ] **Step 1: Read the current `globals.css`**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app/globals.css
```

Make a mental map of what exists: existing `@theme` colors, dark-mode rules (`.dark body` at L96-101), focus-visible rule (L149-154), RTL language selectors (L140-147).

- [ ] **Step 2: Rewrite `globals.css` @theme block**

Overwrite `apps/web/app/globals.css` with the following (keep the existing font CSS variables for `--font-inter`, `--font-noto-naskh-arabic`, `--font-noto-nastaliq-urdu` — they are bound in `apps/web/app/layout.tsx` and stay as-is; we ADD new font variables in Task 2):

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

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

@theme {
  /* Fonts */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif: var(--font-bellefair), ui-serif, Georgia, serif;
  --font-slab: var(--font-roboto-slab), ui-serif, Georgia, serif;
  --font-mono: var(--font-roboto-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-arabic: var(--font-noto-naskh-arabic), ui-serif, Georgia, serif;
  --font-urdu: var(--font-noto-nastaliq-urdu), ui-serif, Georgia, serif;

  /* Breakpoints — unchanged */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;

  /* Container — new; matches legacy's 1200px content cap */
  --container-content: 1200px;

  /* ─── Palette ramps (light-mode anchors; dark picks different stops) ─── */

  /* Primary — red (devotional brand) */
  --color-primary-50:  #fef2f2;
  --color-primary-100: #fee2e2;
  --color-primary-200: #fecaca;
  --color-primary-300: #fca5a5;
  --color-primary-400: #f87171;
  --color-primary-500: #ef4444;
  --color-primary-600: #dc2626;
  --color-primary-700: #b91c1c;
  --color-primary-800: #991b1b;
  --color-primary-900: #7f1d1d;
  --color-primary-950: #450a0a;

  /* Secondary — zinc (neutral-grey) */
  --color-secondary-50:  #fafafa;
  --color-secondary-100: #f4f4f5;
  --color-secondary-200: #e4e4e7;
  --color-secondary-300: #d4d4d8;
  --color-secondary-400: #a1a1aa;
  --color-secondary-500: #71717a;
  --color-secondary-600: #52525b;
  --color-secondary-700: #3f3f46;
  --color-secondary-800: #27272a;
  --color-secondary-900: #18181b;
  --color-secondary-950: #09090b;

  /* Accent — orange (legacy accent role) */
  --color-accent-50:  #fff7ed;
  --color-accent-100: #ffedd5;
  --color-accent-200: #fed7aa;
  --color-accent-300: #fdba74;
  --color-accent-400: #fb923c;
  --color-accent-500: #f97316;
  --color-accent-600: #ea580c;
  --color-accent-700: #c2410c;
  --color-accent-800: #9a3412;
  --color-accent-900: #7c2d12;
  --color-accent-950: #431407;

  /* Neutral — slate (for surfaces, borders, dividers) */
  --color-neutral-50:  #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;
  --color-neutral-950: #020617;

  /* Error — red (Vuetify default #FF5252 ≈ Tailwind red-400; use full red ramp) */
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

  /* Info — blue (Vuetify default #2196F3 ≈ Tailwind blue-500) */
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

  /* Success — green (Vuetify default #4CAF50 ≈ Tailwind green-500) */
  --color-success-50:  #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-200: #bbf7d0;
  --color-success-300: #86efac;
  --color-success-400: #4ade80;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;
  --color-success-800: #166534;
  --color-success-900: #14532d;
  --color-success-950: #052e16;

  /* Warning — amber (Vuetify default #FB8C00 ≈ Tailwind amber-500) */
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

  /* Brand literals (not in the ramped palette — single-use design tokens) */
  --color-wordmark: #DA0000;

  /* ─── Radius ─── */
  --radius-sm: 2px;
  --radius-base: 4px;   /* anchored on legacy Vuetify $border-radius-root */
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* ─── Shadow ─── */
  --shadow-sm:     0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-card:   0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-menu:   0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-dialog: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  /* Upward-cast for bottom-fixed surfaces (PlayerBar etc.) — Phase 2.1d */
  --shadow-player-up: 0 -2px 8px 4px rgb(0 0 0 / 0.16);

  /* ─── Motion ─── */
  --duration-fast: 150ms;
  --duration-base: 280ms;   /* legacy canonical — nuxt/assets/_transitions.scss#L8 */
  --duration-slow: 400ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);  /* Material-standard; byte-identical to Tailwind's ease-in-out */
}

/* ────────────────────────────────────────────────────────────────────
 * shadcn-compatible semantic tokens (light mode)
 *
 * Primitives generated by the shadcn CLI will reference these via
 * Tailwind classes like `bg-background`, `text-foreground`, `bg-primary`,
 * etc. Changing a semantic token here re-themes every consumer.
 * ──────────────────────────────────────────────────────────────────── */

@theme inline {
  --color-background:        var(--color-neutral-50);
  --color-foreground:        var(--color-neutral-950);
  --color-card:              #ffffff;
  --color-card-foreground:   var(--color-neutral-950);
  --color-popover:           #ffffff;
  --color-popover-foreground: var(--color-neutral-950);
  --color-muted:             var(--color-neutral-100);
  --color-muted-foreground:  var(--color-neutral-500);
  --color-destructive:       var(--color-error-600);
  --color-destructive-foreground: #ffffff;
  --color-border:            var(--color-neutral-200);
  --color-input:             var(--color-neutral-200);
  --color-ring:              var(--color-primary-500);

  /* shadcn alias layer for primary/secondary/accent — maps our ramps
     onto the exact names shadcn-generated primitives expect. */
  --color-primary:              var(--color-primary-600);
  --color-primary-foreground:   #ffffff;
  --color-secondary-bg:         var(--color-secondary-100);
  --color-secondary-foreground: var(--color-secondary-900);
  --color-accent-bg:            var(--color-accent-100);
  --color-accent-foreground:    var(--color-accent-900);
}

/* ────────────────────────────────────────────────────────────────────
 * Dark mode — override only the semantic tokens, not the ramps.
 * Primitives automatically re-theme because they reference the
 * semantic names (bg-background, text-foreground, ...).
 * ──────────────────────────────────────────────────────────────────── */

.dark {
  --color-background:        var(--color-neutral-950);
  --color-foreground:        var(--color-neutral-50);
  --color-card:              var(--color-neutral-900);
  --color-card-foreground:   var(--color-neutral-50);
  --color-popover:           var(--color-neutral-900);
  --color-popover-foreground: var(--color-neutral-50);
  --color-muted:             var(--color-neutral-800);
  --color-muted-foreground:  var(--color-neutral-400);
  --color-destructive:       var(--color-error-500);
  --color-destructive-foreground: var(--color-neutral-50);
  --color-border:            var(--color-neutral-800);
  --color-input:             var(--color-neutral-800);
  --color-ring:              var(--color-primary-400);

  --color-primary:              var(--color-primary-500);
  --color-primary-foreground:   var(--color-neutral-50);
  --color-secondary-bg:         var(--color-secondary-800);
  --color-secondary-foreground: var(--color-secondary-50);
  --color-accent-bg:            var(--color-accent-900);
  --color-accent-foreground:    var(--color-accent-50);
}

/* ────────────────────────────────────────────────────────────────────
 * Base layer — body, focus, RTL (preserved from pre-2.2 globals.css)
 * ──────────────────────────────────────────────────────────────────── */

body {
  font-family: var(--font-sans);
  background-color: var(--color-background);
  color: var(--color-foreground);
}

:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

[lang="ar"] {
  font-family: var(--font-arabic);
}

[lang="ur"] {
  font-family: var(--font-urdu);
}
```

**Notes for the implementer:**
- `@theme inline` (shadcn's semantic layer) must come AFTER the ramped `@theme` block so `var(--color-primary-600)` resolves.
- The existing `.dark body { background-color: var(--color-neutral-950); color: var(--color-neutral-100); }` rule is superseded by the new `body` rule + `.dark` semantic overrides. Remove the old rule if still present after the rewrite.
- Leave the file's final blank line intact (end-of-file newline).

- [ ] **Step 3: Update `packages/ui/components.json` baseColor**

```bash
sed -i 's/"baseColor": "slate"/"baseColor": "zinc"/' /home/asif/dev/nawhas/nawhas-rebuild/packages/ui/components.json
cat /home/asif/dev/nawhas/nawhas-rebuild/packages/ui/components.json
# Expected: "baseColor": "zinc"
```

Rationale: shadcn uses `baseColor` when generating primitives' default classes. `zinc` matches our secondary ramp; `slate` was the shadcn-starter default.

- [ ] **Step 4: Verify the rewrite compiles**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev typecheck && ./dev lint && ./dev build
```

Expected: all green. If `./dev build` fails because a Tailwind class no longer resolves, the culprit is almost certainly an existing component referencing a token we removed (e.g., `bg-slate-*` when baseColor was `slate`) — search-and-fix in place, don't roll back the tokens.

- [ ] **Step 5: Manual smoke**

```bash
./dev up -d
./dev logs web -f  # Ctrl+C once you see "Ready in Xms"
```

Open `http://localhost:3000` in a browser. Confirm: (a) primary buttons/links are red, not green; (b) neutral text is the new neutral ramp; (c) nothing visibly broken.

Then toggle dark mode (usually a toggle in the app header — there's a `ThemeToggle` component) and confirm dark-mode colors also flipped.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/globals.css packages/ui/components.json
git commit -m "$(cat <<'EOF'
feat(tokens): flip @theme to legacy-derived palette + token scales

Phase 2.2 Task 1 — the visible day-one change.

Palette:
- primary: red (anchored on Vuetify colors.red.base #F44336)
- secondary: zinc (anchored on Vuetify colors.grey.darken2 #616161)
- accent: orange (anchored on Vuetify colors.orange.accent3 #FF6D00)
- wordmark: #DA0000 as a brand literal
- error/info/success/warning ramps added (rebuild previously had only
  error)

Scales:
- --radius-{sm,base,md,lg,full} anchored on legacy 4px $border-radius-root
- --shadow-{sm,card,menu,dialog,player-up} — player-up is the Phase 2.1d
  upward cast
- --duration-{fast,base,slow} and --ease-standard (byte-identical to
  Tailwind's ease-in-out)

Dark-mode complete via shadcn semantic token layer (--background,
--foreground, --primary, --card, --muted, --border, --ring, ...) with
.dark overrides.

components.json baseColor: slate → zinc to match the new secondary ramp.

Refs: docs/superpowers/specs/2026-04-22-phase-2-2-design-system-foundation.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Font loading + sonner install + Toaster mount

**Files:**
- Modify: `apps/web/app/layout.tsx` (add new font imports + variables)
- Modify: `apps/web/package.json` (add `sonner`, `lucide-react`)
- Modify: `apps/web/app/layout.tsx` (mount `<Toaster />`)

- [ ] **Step 1: Install `sonner` and `lucide-react`**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
pnpm --filter @nawhas/web add sonner lucide-react
```

Expected: both added as dependencies in `apps/web/package.json`.

- [ ] **Step 2: Read current layout.tsx**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/app/layout.tsx
```

Note where fonts are declared (top of file) and where `<body>` wraps the children (in `RootLayout`).

- [ ] **Step 3: Add new font imports to layout.tsx**

Replace the existing `import` line for `next/font/google` and the font-instantiation block with:

```tsx
import {
  Inter,
  Bellefair,
  Roboto_Slab,
  Roboto_Mono,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
} from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'optional',
});

const bellefair = Bellefair({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-bellefair',
  display: 'optional',
});

const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-roboto-slab',
  display: 'optional',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-mono',
  display: 'optional',
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-naskh-arabic',
  display: 'optional',
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-nastaliq-urdu',
  display: 'optional',
});
```

Then update the `<html>` className to bind all variables (replace existing className):

```tsx
<html
  lang={locale}
  suppressHydrationWarning
  className={`${inter.variable} ${bellefair.variable} ${robotoSlab.variable} ${robotoMono.variable} ${notoNaskhArabic.variable} ${notoNastaliqUrdu.variable}`}
>
```

- [ ] **Step 4: Mount `<Toaster />`**

Add import at top:

```tsx
import { Toaster } from 'sonner';
```

Add `<Toaster />` inside the outermost provider (`<NextIntlClientProvider>`), just before the closing tag, so all routes have access to the global toast surface:

```tsx
<NextIntlClientProvider locale={locale} messages={messages}>
  <ThemeProvider>
    <AudioProvider>
      <PageLayout header={<SiteHeaderDynamic />} footer={<></>}>
        {children}
      </PageLayout>
      <PlayerPanels />
      <PlayerBarLazy />
    </AudioProvider>
  </ThemeProvider>
  <Toaster richColors closeButton position="bottom-right" />
</NextIntlClientProvider>
```

- [ ] **Step 5: Typecheck + build**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev typecheck && ./dev build
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/package.json /home/asif/dev/nawhas/nawhas-rebuild/pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(layout): add Bellefair/Roboto Slab/Roboto Mono fonts + mount Toaster

Phase 2.2 Task 2.

Fonts: loads Bellefair, Roboto Slab, Roboto Mono via next/font/google
alongside the existing Inter + Noto Naskh Arabic + Noto Nastaliq Urdu.
Each exposes a CSS variable (--font-bellefair, --font-roboto-slab,
--font-roboto-mono) consumed by the --font-serif / --font-slab /
--font-mono tokens introduced in Task 1.

Toast: installs sonner and mounts a single <Toaster /> at the app root
(bottom-right, rich colors, close button). No toast() callsites yet —
those land lazily as the primitive-replacement commits surface them.

Also installs lucide-react so shadcn-generated primitives in Tasks
3-12 can reference it.

Refs: docs/superpowers/specs/2026-04-22-phase-2-2-design-system-foundation.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Generate `Button` primitive

**Why this comes first among primitives:** largest replacement surface (15-20 call sites), and the generated output is the compatibility probe for the shadcn CLI × Tailwind 4 × React 19 stack. If this task fails, the entire plan's generation strategy pivots to hand-authoring.

**Files:**
- Create: `packages/ui/src/components/button.tsx` (via shadcn CLI)
- Create: `packages/ui/src/components/__tests__/button.test.tsx`
- Modify: `packages/ui/src/index.ts` (re-export)

- [ ] **Step 1: Run shadcn CLI to generate Button**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild/packages/ui
pnpm dlx shadcn@latest add button
```

Answer any prompts with defaults. Expected output: `packages/ui/src/components/button.tsx` created with ~50-80 lines of TypeScript including a `buttonVariants` cva factory and a forwardRef'd `Button` component.

- [ ] **Step 2: Inspect the generated file**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/packages/ui/src/components/button.tsx
```

Verify the generated code:
- imports `@radix-ui/react-slot` (should auto-install if missing)
- imports `class-variance-authority` (already in deps — we use it)
- uses `cn` from `@/lib/utils` or `@nawhas/ui/lib/utils` — if path alias is wrong, edit to match the `packages/ui/tsconfig.json` `paths` config (whatever `cn` resolves to in the existing `packages/ui/src/index.ts`)
- defines variants `default` / `destructive` / `outline` / `secondary` / `ghost` / `link`
- defines sizes `sm` / `default` / `lg` / `icon`

If the generated code uses CSS class names that don't exist in our `globals.css` (e.g., `bg-foreground`, `bg-accent` — check that these semantic tokens resolve), either add the missing semantic token to `globals.css @theme inline` block or edit the generated `button.tsx` to use the existing classes.

**Compatibility fail mode:** if `pnpm dlx shadcn@latest add button` fails to complete, errors on Tailwind 4 syntax, or the generated file fails `pnpm --filter @nawhas/ui typecheck`, STOP. Report BLOCKED with the error output. The plan's remaining primitive generation will need to be hand-authored; do NOT bash-on-regardless.

- [ ] **Step 3: Write the Button test**

Create `packages/ui/src/components/__tests__/button.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Button } from '../button';

afterEach(() => {
  cleanup();
});

describe('Button', () => {
  it('renders a button element with the provided children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('applies the default variant class by default', () => {
    render(<Button>x</Button>);
    const btn = screen.getByRole('button');
    // Default variant uses bg-primary via semantic tokens
    expect(btn.className).toMatch(/bg-primary/);
  });

  it('applies the destructive variant when specified', () => {
    render(<Button variant="destructive">x</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-destructive/);
  });

  it('merges custom className without losing variant classes', () => {
    render(<Button className="custom-xyz">x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-primary/);
    expect(btn.className).toMatch(/custom-xyz/);
  });

  it('renders as a slot when asChild is true (no <button>)', () => {
    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>
    );
    // With asChild, no <button> is rendered; the <a> gets the classes
    expect(screen.queryByRole('button')).toBeNull();
    const link = screen.getByRole('link', { name: 'link' });
    expect(link.className).toMatch(/bg-primary/);
  });
});
```

- [ ] **Step 4: Add Button to `packages/ui/src/index.ts` re-exports**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/packages/ui/src/index.ts
```

Append a re-export line (or insert into the appropriate block):

```ts
export * from './components/button';
```

- [ ] **Step 5: Run the test**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev test --filter @nawhas/ui
```

Expected: 5/5 pass for Button. If one asserts a class name that shadcn didn't generate (e.g., `bg-primary` vs `bg-primary-600`), inspect the actual generated file and adjust the test's regex to match reality — the test is about variant behavior, not exact class strings.

- [ ] **Step 6: Typecheck + commit**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev typecheck && ./dev lint
git add packages/ui/src/components/button.tsx packages/ui/src/components/__tests__/button.test.tsx packages/ui/src/index.ts packages/ui/package.json
git commit -m "$(cat <<'EOF'
feat(ui): add Button primitive

Phase 2.2 Task 3. Generated via shadcn@latest CLI, Radix-Slot backed,
cva-driven variants (default/destructive/outline/secondary/ghost/link)
and sizes (sm/default/lg/icon). Consumes the semantic token layer
(--color-primary, --color-destructive, --color-secondary, ...) so
palette changes re-theme all Buttons globally.

5 Vitest render tests cover: default render, default variant class,
destructive variant, className merge, and asChild slot behavior.

Refs: docs/superpowers/specs/2026-04-22-phase-2-2-design-system-foundation.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Tasks 4–11: Generate shadcn primitives (one per task, one commit each)

**Shared shape.** Each of Tasks 4-11 follows the same pattern as Task 3:

1. Run `cd packages/ui && pnpm dlx shadcn@latest add <primitive>`
2. Inspect generated file; if imports/aliases don't match, fix in place
3. Write Vitest render tests (~3-5 per primitive; see per-task test skeletons below)
4. Add to `packages/ui/src/index.ts` re-exports
5. `./dev test --filter @nawhas/ui && ./dev typecheck && ./dev lint`
6. Commit with the task-specific message

**If the shadcn CLI failed on Task 3** (Button), hand-author each of Tasks 4-11 using Button as a pattern reference, pulling Radix primitive imports from `@radix-ui/react-<name>` directly. The test skeletons below still apply.

### Task 4: `Card`

**CLI command:**
```bash
cd /home/asif/dev/nawhas/nawhas-rebuild/packages/ui && pnpm dlx shadcn@latest add card
```

**Test skeleton** at `packages/ui/src/components/__tests__/card.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

afterEach(() => {
  cleanup();
});

describe('Card', () => {
  it('renders a Card with composed subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Desc')).toBeDefined();
    expect(screen.getByText('Body')).toBeDefined();
    expect(screen.getByText('Foot')).toBeDefined();
  });

  it('applies the card background token class', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toBeDefined();
    expect((container.firstChild as HTMLElement).className).toMatch(/bg-card/);
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-xyz">x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/custom-xyz/);
  });
});
```

**Commit message:**
```
feat(ui): add Card primitive

Phase 2.2 Task 4. Generated via shadcn CLI. Exports Card +
CardHeader/CardTitle/CardDescription/CardContent/CardFooter
sub-components. Consumes --color-card semantic token.

3 Vitest render tests cover: composed render, bg-card class,
className merge.
```

### Task 5: `Dialog`

**CLI:** `pnpm dlx shadcn@latest add dialog`

**Test skeleton** at `packages/ui/src/components/__tests__/dialog.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../dialog';

afterEach(() => {
  cleanup();
});

describe('Dialog', () => {
  it('does not render content when closed', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByText('Title')).toBeNull();
  });

  it('renders content when open=true', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Open Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Open Title')).toBeDefined();
  });

  it('DialogTrigger renders its children as a button', () => {
    render(
      <Dialog>
        <DialogTrigger>Trigger</DialogTrigger>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeDefined();
  });
});
```

**Commit message:** `feat(ui): add Dialog primitive` — Phase 2.2 Task 5, Radix-backed, 3 Vitest tests.

### Task 6: `Tabs`

**CLI:** `pnpm dlx shadcn@latest add tabs`

**Test skeleton** at `packages/ui/src/components/__tests__/tabs.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

afterEach(() => {
  cleanup();
});

describe('Tabs', () => {
  it('renders tab triggers', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
        <TabsContent value="b">B content</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole('tab', { name: 'A' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'B' })).toBeDefined();
  });

  it('shows only the default tab content initially', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A content</TabsContent>
        <TabsContent value="b">B content</TabsContent>
      </Tabs>
    );
    expect(screen.getByText('A content')).toBeDefined();
    expect(screen.queryByText('B content')).toBeNull();
  });

  it('selected tab trigger carries aria-selected="true"', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('true');
  });
});
```

**Commit message:** `feat(ui): add Tabs primitive` — Phase 2.2 Task 6, Radix-backed, 3 Vitest tests.

### Task 7: `DropdownMenu`

**CLI:** `pnpm dlx shadcn@latest add dropdown-menu`

**Test skeleton** at `packages/ui/src/components/__tests__/dropdown-menu.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../dropdown-menu';

afterEach(() => {
  cleanup();
});

describe('DropdownMenu', () => {
  it('renders the trigger as a button', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeDefined();
  });

  it('does not render items when closed', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.queryByText('Item A')).toBeNull();
  });

  it('renders items when open=true', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByText('Item A')).toBeDefined();
  });
});
```

**Commit message:** `feat(ui): add DropdownMenu primitive` — Phase 2.2 Task 7, Radix-backed, 3 Vitest tests.

### Task 8: `Tooltip`

**CLI:** `pnpm dlx shadcn@latest add tooltip`

**Test skeleton** at `packages/ui/src/components/__tests__/tooltip.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';

afterEach(() => {
  cleanup();
});

describe('Tooltip', () => {
  it('renders the trigger content', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText('Hover me')).toBeDefined();
  });

  it('does not render content when closed', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.queryByText('Tip text')).toBeNull();
  });

  it('renders content when open=true', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(screen.getByText('Tip text')).toBeDefined();
  });
});
```

**Commit message:** `feat(ui): add Tooltip primitive` — Phase 2.2 Task 8, Radix-backed, 3 Vitest tests.

### Task 9: `Sheet`

**CLI:** `pnpm dlx shadcn@latest add sheet`

**Test skeleton** at `packages/ui/src/components/__tests__/sheet.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '../sheet';

afterEach(() => {
  cleanup();
});

describe('Sheet', () => {
  it('renders the trigger as a button', () => {
    render(
      <Sheet>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByRole('button', { name: 'Open sheet' })).toBeDefined();
  });

  it('does not render content when closed', () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent><SheetTitle>Title</SheetTitle></SheetContent>
      </Sheet>
    );
    expect(screen.queryByText('Title')).toBeNull();
  });

  it('renders content when open=true', () => {
    render(
      <Sheet open>
        <SheetContent><SheetTitle>Title</SheetTitle></SheetContent>
      </Sheet>
    );
    expect(screen.getByText('Title')).toBeDefined();
  });
});
```

**Commit message:** `feat(ui): add Sheet primitive` — Phase 2.2 Task 9, Radix-backed, 3 Vitest tests.

### Task 10: `Input`

**CLI:** `pnpm dlx shadcn@latest add input`

**Test skeleton** at `packages/ui/src/components/__tests__/input.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Input } from '../input';

afterEach(() => {
  cleanup();
});

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    expect(input.tagName).toBe('INPUT');
  });

  it('forwards type attribute (type="email")', () => {
    render(<Input type="email" data-testid="e" />);
    expect((screen.getByTestId('e') as HTMLInputElement).type).toBe('email');
  });

  it('merges custom className', () => {
    render(<Input className="custom-xyz" data-testid="e" />);
    expect(screen.getByTestId('e').className).toMatch(/custom-xyz/);
  });

  it('applies disabled attribute', () => {
    render(<Input disabled data-testid="e" />);
    expect((screen.getByTestId('e') as HTMLInputElement).disabled).toBe(true);
  });
});
```

**Commit message:** `feat(ui): add Input primitive` — Phase 2.2 Task 10, 4 Vitest tests.

### Task 11: `Select`

**CLI:** `pnpm dlx shadcn@latest add select`

**Test skeleton** at `packages/ui/src/components/__tests__/select.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select';

afterEach(() => {
  cleanup();
});

describe('Select', () => {
  it('renders the trigger as a combobox role', () => {
    render(
      <Select>
        <SelectTrigger aria-label="x">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'x' })).toBeDefined();
  });

  it('does not render items when closed', () => {
    render(
      <Select>
        <SelectTrigger aria-label="x">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.queryByText('A')).toBeNull();
  });

  it('applies aria-label to the trigger', () => {
    render(
      <Select>
        <SelectTrigger aria-label="reciter">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('reciter');
  });
});
```

**Commit message:** `feat(ui): add Select primitive` — Phase 2.2 Task 11, Radix-backed, 3 Vitest tests.

### Task 12: `Badge`

**CLI:** `pnpm dlx shadcn@latest add badge`

**Test skeleton** at `packages/ui/src/components/__tests__/badge.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Badge } from '../badge';

afterEach(() => {
  cleanup();
});

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeDefined();
  });

  it('applies the default variant class', () => {
    const { container } = render(<Badge>x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/bg-primary/);
  });

  it('applies the destructive variant', () => {
    const { container } = render(<Badge variant="destructive">x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/bg-destructive/);
  });

  it('merges custom className', () => {
    const { container } = render(<Badge className="custom-xyz">x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/custom-xyz/);
  });
});
```

**Commit message:** `feat(ui): add Badge primitive` — Phase 2.2 Task 12, 4 Vitest tests.

---

## Task 13: Hand-author `SectionTitle` primitive

**Why hand-authored:** not in shadcn's catalogue. Legacy's `.section__title` pattern (h5 map + 1.4rem + 12px margin-bottom) recurs across Home/Reciter/Album as inline usage.

**Files:**
- Create: `packages/ui/src/components/section-title.tsx`
- Create: `packages/ui/src/components/__tests__/section-title.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write the test first (TDD)**

Create `packages/ui/src/components/__tests__/section-title.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { SectionTitle } from '../section-title';

afterEach(() => {
  cleanup();
});

describe('SectionTitle', () => {
  it('renders its children as an h2 by default', () => {
    render(<SectionTitle>Top Nawhas</SectionTitle>);
    const el = screen.getByText('Top Nawhas');
    expect(el.tagName).toBe('H2');
  });

  it('renders with a custom heading level via the `as` prop', () => {
    render(<SectionTitle as="h3">Sub</SectionTitle>);
    expect(screen.getByText('Sub').tagName).toBe('H3');
  });

  it('applies the design-system size class (text-[1.4rem])', () => {
    render(<SectionTitle>x</SectionTitle>);
    expect(screen.getByText('x').className).toMatch(/text-\[1\.4rem\]/);
  });

  it('applies the bottom-margin class (mb-3)', () => {
    render(<SectionTitle>x</SectionTitle>);
    expect(screen.getByText('x').className).toMatch(/mb-3/);
  });

  it('merges custom className without losing base classes', () => {
    render(<SectionTitle className="custom-xyz">x</SectionTitle>);
    const el = screen.getByText('x');
    expect(el.className).toMatch(/custom-xyz/);
    expect(el.className).toMatch(/mb-3/);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev test --filter @nawhas/ui
```

Expected: `SectionTitle` tests fail with "Cannot resolve module '../section-title'".

- [ ] **Step 3: Write the component**

Create `packages/ui/src/components/section-title.tsx`:

```tsx
import * as React from 'react';
import { cn } from '../lib/utils';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level. Defaults to h2 (semantically correct for a page section under the page h1). */
  as?: HeadingTag;
}

/**
 * Section heading used across Home / Reciter / Album pages for labels
 * like "Top Nawhas", "Recently Saved Nawhas", etc. Matches legacy's
 * `.section__title` (1.4rem + Vuetify h5 map + 12px margin-bottom)
 * as documented in Phase 2.1 tokens audit.
 */
export function SectionTitle({
  as: Tag = 'h2',
  className,
  children,
  ...rest
}: SectionTitleProps): React.JSX.Element {
  return (
    <Tag
      {...rest}
      className={cn(
        'text-[1.4rem] font-normal leading-8 tracking-normal mb-3 text-foreground',
        className
      )}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 4: Re-export from index**

Append to `packages/ui/src/index.ts`:

```ts
export * from './components/section-title';
```

- [ ] **Step 5: Run test + typecheck**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev test --filter @nawhas/ui && ./dev typecheck && ./dev lint
```

Expected: 5/5 SectionTitle tests pass; typecheck green; lint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/section-title.tsx packages/ui/src/components/__tests__/section-title.test.tsx packages/ui/src/index.ts
git commit -m "$(cat <<'EOF'
feat(ui): add SectionTitle primitive

Phase 2.2 Task 13. Hand-authored (not in shadcn's catalogue).
Formalizes legacy's .section__title pattern (Vuetify h5 map +
font-size: 1.4rem + margin-bottom: 12px) surfaced by the Phase 2.1
tokens audit at nuxt/assets/app.scss#L6-12. Renders an h2 by default;
overrideable via the `as` prop.

5 Vitest render tests cover: default h2, custom `as` tag, size class,
mb-3 class, and className merge.

Refs: docs/superpowers/specs/2026-04-22-phase-2-2-design-system-foundation.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Replace inline `<button>` with `<Button>` primitive

**Files to modify (confirm paths by `grep -rn "<button\|className=\"[^\"]*\\(rounded\\|bg-primary\\)" apps/web/src --include=*.tsx -l | head -30` — this task's scope is every `<button>` that functionally renders a UI button, not DOM-level utility buttons like the seek-bar in PlayerBar):

- `apps/web/src/components/SaveButton.tsx`
- `apps/web/src/components/LikeButton.tsx`
- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/components/auth/reset-password-form.tsx`
- `apps/web/src/components/(auth)/register/page.tsx` or wherever register submit lives — grep to confirm
- `apps/web/src/components/contribute/reciter-form.tsx`
- `apps/web/src/components/contribute/album-form.tsx`
- `apps/web/src/components/contribute/track-form.tsx`
- `apps/web/src/components/library/library-tracks-list.tsx` (CTA at top)
- `apps/web/src/components/ui/empty-state.tsx` (the CTA slot)
- `apps/web/src/components/mod/apply-button.tsx`

**NOT in scope:** `PlayerBar.tsx` play/pause/next/prev (icon-only controls tightly integrated with audio engine state — 2.3's job), the seek-bar range input, `theme/ThemeToggle.tsx` (custom animation).

- [ ] **Step 1: Grep for inline buttons**

```bash
grep -rn "className=.*\\(rounded\\|bg-primary\\)" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src --include="*.tsx" | grep -i "button" | head -40
```

Expected: ~15-20 matches. Build an exhaustive list and attack them one file at a time in the sub-steps below. If the list is larger than ~20, scope down by identifying "form submit / primary CTA" buttons only for this task — leave hover-only icon buttons for a follow-up.

- [ ] **Step 2: For each file, replace inline `<button>` with `<Button>`**

General pattern:

```tsx
// Before
<button
  type="submit"
  className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
  disabled={isSubmitting}
>
  Sign in
</button>

// After
import { Button } from '@nawhas/ui/components/button';
// …
<Button type="submit" disabled={isSubmitting}>
  Sign in
</Button>
```

Variant selection rules:
- Primary CTAs (form submits, "Save this track") → `variant="default"` (omit, it's the default)
- Destructive actions ("Delete", "Sign out") → `variant="destructive"`
- Secondary / cancel → `variant="outline"` or `variant="secondary"`
- Icon-only (save/like heart) → `variant="ghost"` + `size="icon"`
- Text-only links-as-buttons → `variant="link"`

Size selection: default (`size="default"`) unless the surface explicitly needs `sm` or `lg`.

- [ ] **Step 3: For each file, update `@nawhas/ui` import**

Ensure each modified file has one import line:

```tsx
import { Button } from '@nawhas/ui/components/button';
```

(Or adjust path to the index re-export form `from '@nawhas/ui'` — whichever the repo uses. Check `packages/ui/package.json` `exports` map; both should work.)

- [ ] **Step 4: Verify no regression in existing component tests**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev test --filter @nawhas/web
```

Expected: all passing (may include tests that assert on button class names — update those to match the new `<Button>` output if they break, but only if the underlying behavior is preserved).

- [ ] **Step 5: Typecheck + lint + e2e smoke**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev typecheck && ./dev lint && ./dev test:e2e --grep "auth|save|like|library"
```

Expected: green. e2e scoped to auth/save/like/library flows is the relevant risk surface for button swaps.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/
git commit -m "$(cat <<'EOF'
refactor(web): swap inline <button> for <Button> primitive

Phase 2.2 Task 14. Replaces ~15-20 inline button instances across
SaveButton, LikeButton, auth forms (login/register/reset-password),
contribute forms (reciter/album/track), library CTAs, empty-state
CTAs, and the mod apply-button. All now consume the <Button>
primitive from @nawhas/ui with explicit variant/size props, killing
the inline rounded/rounded-md/rounded-lg drift the Phase 2.1 audit
surfaced.

Not in scope: PlayerBar icon-only controls (owned by Phase 2.3 track
page redesign), the seek-bar range input, the theme toggle (custom
animated button).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Replace inline card divs with `<Card>` primitive

**Files to modify:**

- `apps/web/src/components/cards/reciter-card.tsx`
- `apps/web/src/components/cards/album-card.tsx`
- `apps/web/src/components/albums/album-header.tsx`
- `apps/web/src/components/home/popular-tracks.tsx` (card-shaped wrapper)
- `apps/web/src/components/contribute/contribution-list.tsx` (row-as-card pattern)
- `apps/web/src/components/auth/login-form.tsx` (form shell — the `rounded-lg border bg-white shadow-sm` wrapper)

- [ ] **Step 1: Grep for card-shaped divs**

```bash
grep -rn "className=.*rounded-lg.*border" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src --include="*.tsx" | head -30
```

Confirm the file list. Add any file missed above.

- [ ] **Step 2: For each file, replace inline card with `<Card>`**

Pattern:

```tsx
// Before
<div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
  <h2>Title</h2>
  <p>Body</p>
</div>

// After
import { Card, CardHeader, CardTitle, CardContent } from '@nawhas/ui/components/card';
// …
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Body</p>
  </CardContent>
</Card>
```

Where the existing usage doesn't have a discrete header/body structure, use `<Card className="p-6">{children}</Card>` as a pass-through. Don't force sub-structure that doesn't exist.

- [ ] **Step 3: Verify tests + e2e**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev qa && ./dev test:e2e --grep "home|reciter|album|contribute"
```

Expected: green. If a skeleton test asserts on exact class names, update to match the new `<Card>` output (or keep skeleton as a plain div if it genuinely shouldn't consume the primitive).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/
git commit -m "$(cat <<'EOF'
refactor(web): swap inline card divs for <Card> primitive

Phase 2.2 Task 15. Replaces ~6-8 inline card-shaped divs across
reciter-card, album-card, album-header, popular-tracks,
contribute/contribution-list, and the auth login-form shell. All now
consume <Card> + sub-components from @nawhas/ui, killing the inline
'rounded-lg border bg-white shadow-sm' pattern and unifying corner
radius at the token level (legacy 4px anchor; rebuild had drifted to
rounded-lg = 8px).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Replace bare `<input>` with `<Input>` primitive

**Files to modify:** every auth + contribute form that contains a bare `<input>`:

- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/components/auth/register-form.tsx` (if that's where register lives — else `apps/web/app/(auth)/register/page.tsx`)
- `apps/web/src/components/auth/reset-password-form.tsx`
- `apps/web/src/components/auth/forgot-password-form.tsx`
- `apps/web/src/components/auth/verify-email-form.tsx`
- `apps/web/src/components/contribute/form-field.tsx`
- `apps/web/src/components/contribute/reciter-form.tsx`
- `apps/web/src/components/contribute/album-form.tsx`
- `apps/web/src/components/contribute/track-form.tsx`

- [ ] **Step 1: Grep for bare `<input>` in those directories**

```bash
grep -rn "<input" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/auth /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/contribute --include="*.tsx"
```

Confirm the scope. Roughly ~10 matches.

- [ ] **Step 2: For each file, replace bare `<input>` with `<Input>`**

Pattern:

```tsx
// Before
<input
  type="email"
  name="email"
  className="rounded-md border px-3 py-2"
  required
/>

// After
import { Input } from '@nawhas/ui/components/input';
// …
<Input type="email" name="email" required />
```

If a given form uses react-hook-form + `register()`, pass the registered props through as normal — `<Input>` forwards all native attributes via `{...props}` spread.

- [ ] **Step 3: Verify tests + auth e2e**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev qa && ./dev test:e2e --grep "auth|contribute"
```

Expected: green. Auth flows are the biggest risk surface here.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/auth apps/web/src/components/contribute
git commit -m "$(cat <<'EOF'
refactor(web): swap bare <input> for <Input> primitive

Phase 2.2 Task 16. Replaces ~10 bare <input> elements across auth
forms (login, register, reset-password, forgot-password, verify-email)
and contribute forms (reciter/album/track new + form-field). All now
use <Input> from @nawhas/ui, consuming the semantic --color-input /
--color-ring tokens and inheriting consistent padding/radius/
focus-ring behavior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Rewrite `user-menu.tsx` with `<DropdownMenu>` primitive

**Why this is its own task:** the existing user-menu is ~120 lines of hand-rolled absolutely-positioned div with click-outside handling, aria-hidden toggling, and keyboard-nav. The Radix DropdownMenu handles all of it; a rewrite is shorter and more accessible.

**Files:**
- Modify: `apps/web/src/components/layout/user-menu.tsx`

- [ ] **Step 1: Read the existing implementation**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/layout/user-menu.tsx
```

Note the current behavior: trigger (avatar/initials), items (My Library, Profile, Settings, Sign out, Sign in when logged out), click-outside close, keyboard nav.

- [ ] **Step 2: Rewrite with `<DropdownMenu>`**

Replace the file contents with (adapt from the existing component's data layer — `useSession`, sign-out action, translations):

```tsx
'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@nawhas/ui/components/dropdown-menu';
import { Button } from '@nawhas/ui/components/button';
import { useSession, signOut } from '@/lib/auth-client';
import { useTranslations } from 'next-intl';
import { User, LogOut, LogIn, Library, Settings, UserIcon as ProfileIcon } from 'lucide-react';

export function UserMenu(): React.JSX.Element {
  const t = useTranslations('userMenu');
  const session = useSession();

  if (session.isPending) {
    return <Button variant="ghost" size="icon" aria-label={t('loading')} disabled><User /></Button>;
  }

  if (!session.data) {
    return (
      <Button variant="ghost" asChild>
        <Link href="/login"><LogIn className="mr-2 h-4 w-4" />{t('signIn')}</Link>
      </Button>
    );
  }

  const user = session.data.user;
  const initials = user.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('openMenu')}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.name ?? user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/library/tracks"><Library className="mr-2 h-4 w-4" />{t('library')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile"><ProfileIcon className="mr-2 h-4 w-4" />{t('profile')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings"><Settings className="mr-2 h-4 w-4" />{t('settings')}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void signOut();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Caveats for the implementer:**
- The translation keys (`userMenu.signIn`, `userMenu.openMenu`, etc.) must exist in `apps/web/messages/en.json`. If they don't, add them to match the existing user-menu's strings. If the existing component uses a different translations namespace (e.g., `header.userMenu`), use that.
- If `signOut` is a different function name in `@/lib/auth-client`, match reality.
- If the avatar was previously an image (not initials), preserve the image rendering.

- [ ] **Step 3: Update existing tests**

```bash
grep -rn "user-menu" /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/__tests__
```

Any test that asserts on the hand-rolled div structure will break. Rewrite them to assert on the new `<DropdownMenuTrigger>` / `<DropdownMenuItem>` roles and the visible strings (Library / Profile / Settings / Sign out).

- [ ] **Step 4: Verify**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild && ./dev qa && ./dev test:e2e --grep "user|menu|auth"
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/user-menu.tsx apps/web/src/__tests__/
git commit -m "$(cat <<'EOF'
refactor(web): rewrite user-menu with <DropdownMenu> primitive

Phase 2.2 Task 17. Replaces the hand-rolled absolutely-positioned
div + click-outside + aria-hidden toggling with a Radix-backed
<DropdownMenu>. Keyboard nav, focus trap, aria roles, and outside-
click close are now handled by Radix. Net -60 LOC while gaining
accessibility.

Refs: docs/superpowers/specs/2026-04-22-phase-2-2-design-system-foundation.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Record Phase 2.2 outcomes in the roadmap

**Files:**
- Modify: `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md`

- [ ] **Step 1: Read the current Phase 2.2 subsection**

```bash
sed -n '/^### 2.2 Design-system foundation/,/^### /p' /home/asif/dev/nawhas/nawhas-rebuild/docs/superpowers/specs/2026-04-21-rebuild-roadmap.md
```

- [ ] **Step 2: Rewrite it as a shipped-outcome section**

Replace the subsection body with a shipped-outcome narrative following the pattern used for Phase 2.1 and 2.1d:

```markdown
### 2.2 Design-system foundation in `packages/ui` ✅ shipped 2026-04-22

Shipped as 18 commits (Tasks 1–18 per the implementation plan). Token layer flipped in Task 1; fonts + Toaster mounted in Task 2; 10 shadcn primitives + 1 hand-authored (SectionTitle) + 0 page-specific compositions landed in Tasks 3–13; mechanical Button/Card/Input/user-menu swaps completed Tasks 14–17; this subsection records completion.

**Key outputs:**
- `apps/web/app/globals.css` — legacy-derived palette ramps (red/zinc/orange), full radius / shadow / motion / container scales, shadcn semantic token layer with class-based `.dark` overrides.
- `apps/web/app/layout.tsx` — Bellefair + Roboto Slab + Roboto Mono loaded; `<Toaster />` mounted.
- `packages/ui/src/components/*` — 12 primitives (Button, Card, Dialog, Tabs, DropdownMenu, Tooltip, Sheet, Input, Select, Badge, SectionTitle) + Toast plumbing via `sonner`.
- `apps/web/src/components/*` — ~40 inline usage sites migrated to primitives.

Verification: `./dev qa` green throughout; `./dev test:e2e` green on auth / save / like / library / contribute flows; manual 10-route smoke + dark-mode pass performed.

Open items deferred to later phases:
- Full visual-regression snapshot suite (folds into 2.1b or a future pass).
- Page-specific compositions (Hero, LyricsPanel, TrackList, ReciterHero) — Phase 2.3.
- Icon swap on hand-authored SVGs in `apps/web/src/components/layout/mobile-nav.tsx` — opportunistic during 2.3.
```

Also update the file's `Status:` line at the top:

```
**Status:** Phase 1 shipped (2026-04-21) · Phase 2.1 shipped (2026-04-22) · 2.1 decisions resolved (2026-04-22) · Phase 2.1d shipped (2026-04-22) · Phase 2.2 shipped (2026-04-22) · Phase 2.1c + 2.3 not started
```

And `Last updated:` to the current date.

- [ ] **Step 3: Commit**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git add docs/superpowers/specs/2026-04-21-rebuild-roadmap.md
git commit -m "$(cat <<'EOF'
docs(roadmap): record Phase 2.2 outcomes

Design-system foundation shipped as 18 commits: token flip + font
loading + 12 primitives in packages/ui (10 shadcn-generated + 1
hand-authored + 1 sonner-backed Toast) + ~40 inline-usage migrations
across the web app. Roadmap's 2.2 subsection is now shipped-oriented
with verification summary and open items deferred to 2.1b / 2.3.

Status line updated. Phase 2.3 (page-by-page redesign) is next,
gated only by Phase 2.1c (lyrics sync research).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Wrap-up

After Task 18, `main` will have ~18 new commits. No CI gate beyond what `./dev qa` and `./dev test:e2e` already cover. Push when ready:

```bash
git push
```

**What's next after 2.2:** Phase 2.1c (lyrics sync research) is the last blocker before Phase 2.3 (page-by-page redesign). 2.3 can begin on non-Track pages in parallel if desired — lyrics research only gates the Track page.
