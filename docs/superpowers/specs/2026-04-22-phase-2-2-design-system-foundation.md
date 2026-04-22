# Phase 2.2 — Design System Foundation (Design)

**Status:** Design approved 2026-04-22 · Implementation plan not yet written
**Author:** Asif (brainstormed with Claude)
**Parent roadmap:** [`2026-04-21-rebuild-roadmap.md`](./2026-04-21-rebuild-roadmap.md), Phase 2.2
**Depends on:** Phase 2.1 audit output (`docs/design/tokens.md`, `docs/design/layouts.md`, `docs/design/README.md`); decisions resolved 2026-04-22 (brand hue, display fonts, PWA skip, library IA, search IA, AuthReason copy, lyrics-sync parked)

## Context

Phase 2.1 produced a three-document audit of legacy `nawhas.com` vs the current rebuild. Its `tokens.md` surfaced ~67 rows of comparative-value deltas (every row tagged `keep` / `replace` / `add` / `drop`), and its `layouts.md` documented per-page deltas across the 10 live production routes. Phase 2.1's "Verify before porting" list was resolved on 2026-04-22 — the decisions are now inputs to this sub-project.

The rebuild's current visual layer is a shadcn-starter default: green-primary, amber-secondary, slate-neutral, Inter font stack, no `--radius-*` / `--shadow-*` / `--duration-*` token scales, and zero primitive components in `packages/ui` (which exports only `cn`). Inline usage across the app has drifted (buttons use three different radii: `rounded` / `rounded-md` / `rounded-lg`; cards are sometimes `shadow-sm`, sometimes shadowless; menus are hand-rolled absolute-positioned divs).

Phase 2.2 closes that gap: codifies the Phase 2.1 tokens into Tailwind 4's `@theme` layer, builds out a set of primitive components in `packages/ui`, and mechanically swaps existing inline usage over to the primitives so the rebuild benefits from consistency without doing page-level redesigns (those are Phase 2.3).

## Goals

1. **Token foundation.** Replace the shadcn-starter palette / type stack / radii / shadows / motion with legacy-derived values in `apps/web/app/globals.css` `@theme`. Day-one: the rebuild visibly flips from green/Inter to devotional-red/Roboto+Bellefair on every route.
2. **Primitive inventory.** Twelve primitives (ten from the roadmap, two the audit justified) land in `packages/ui/src/components/`, each with a Vitest render test.
3. **Targeted replacement.** Replace inline button / card / input / dropdown-menu usage in the existing `apps/web/` so primitives are exercised in production code, not just in tests. No page redesigns.
4. **Dark-mode parity.** Generate a parallel dark ramp for every palette role even where legacy deferred to Vuetify's `$material-dark` default. 2.2 ships dark-mode-complete.

## Non-Goals

- No page-level redesigns. Hero rewrites, page composition changes, per-page UX decisions all belong to Phase 2.3.
- No Storybook. No Playwright visual-regression snapshots. Vitest render coverage is the 2.2 bar; visual regression is deferred.
- No PWA manifest (decision resolved 2026-04-22: PWA is skipped entirely).
- No lyrics highlight / scroll-sync work. That's parked as 2.1c research.
- No icon-library swap beyond installing `lucide-react`. Hand-authored inline SVGs in `apps/web/src/components/layout/mobile-nav.tsx` etc. may stay until a natural replacement opportunity arises.

## Approach

One sub-project, single long-running branch (or direct-to-main per user preference), multiple commits in a deliberate order: tokens first (biggest visible change), primitives next (per-primitive commits), existing-app replacements last (per component family), closeout commit for the roadmap update.

**Tooling:** shadcn/ui CLI (`pnpm dlx shadcn@latest add <primitive>`) generates Radix-backed primitives directly into `packages/ui/src/components/` per the existing `packages/ui/components.json` aliases. Icon library: `lucide-react`. Toast library: `sonner`.

**Verification entry point:** every command routes through `./dev` (`./dev qa`, `./dev test`, `./dev typecheck`, `./dev lint`, `./dev build`, `./dev test:e2e`).

## Scope

### Tokens (committed first — the visible day-one flip)

All token values live in `apps/web/app/globals.css`'s `@theme` block, replacing the current shadcn-starter values.

**Palette.** Legacy-derived ramps (50→950) for `primary` (red, anchored on `#F44336` Vuetify `colors.red.base`), `secondary` (neutral/grey, anchored on `#616161`), `accent` (orange, anchored on `#FF6D00`). `--color-wordmark #DA0000` as a brand literal. Semantic ramps for `error` / `info` / `success` / `warning` (rebuild currently only has `error`). `baseColor` in `packages/ui/components.json` switched from `slate` to a neutral that matches legacy's cool-grey bias. **Dark mode complete:** a parallel dark ramp per role, even for roles where legacy deferred to Vuetify's upstream `$material-dark` map. A `deferred: visual verify` audit row from 2.1b is honored by using code-first best-guess values in 2.2; any that look wrong get corrected in a 2.1b visual pass or opportunistically during 2.3.

**Typography.** `Bellefair`, `Roboto`, `Roboto Slab`, `Roboto Mono` loaded via `next/font/google` alongside `Inter` in `apps/web/app/layout.tsx`. New tokens: `--font-display-serif` (Bellefair), `--font-slab` (Roboto Slab), `--font-mono` (Roboto Mono). Existing `--font-sans`, `--font-arabic`, `--font-urdu` stay. Type scale: explicit `--text-h1..h6` + `--text-body` / `--text-sm` / `--text-xs` + `--text-hero` tokens derived from Vuetify's `$headings` map and the Home page's `Roboto 200 / 64px / 75px / -1.5px` hero the audit surfaced (`nawhas/nawhas:nuxt/pages/HomePage.vue#L265-271`).

**Radius.** `--radius-sm` (2px), `--radius-base` (4px — anchored on legacy's `$border-radius-root`), `--radius-md` (6px), `--radius-lg` (8px), `--radius-full` (9999px). Tailwind's `rounded-*` utilities are configured to consume these. The audit's recorded inline drift (cards 8px, buttons 6px, inputs 6px) gets reconciled when primitives replace inline usage.

**Shadows.** `--shadow-sm`, `--shadow-card`, `--shadow-menu`, `--shadow-dialog`, `--shadow-player-up`. The `player-up` token is the Phase 2.1d upward-cast (`0 -2px 8px 4px rgba(0,0,0,0.16)` + dark-mode variant). Other tokens map semantically onto Tailwind's existing scale, renamed so consumers read intent not level.

**Motion.** `--duration-fast` (150ms), `--duration-base` (280ms — the legacy canonical), `--duration-slow` (400ms). `--ease-standard` (`cubic-bezier(0.4, 0, 0.2, 1)` — byte-identical to Tailwind's `ease-in-out`, declared for semantic clarity).

### Primitives (per-commit; lands after tokens)

Twelve primitives in `packages/ui/src/components/`, each paired with a Vitest render test in `packages/ui/src/components/__tests__/`.

1. `Button` — variants `default` / `destructive` / `outline` / `secondary` / `ghost` / `link`; sizes `sm` / `default` / `lg` / `icon`.
2. `Card` — with `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` sub-components.
3. `Dialog` — Radix-backed. Used for first-needed modal.
4. `Tabs` — Radix-backed. Primary consumer: Track-page language switcher.
5. `DropdownMenu` — Radix-backed. Replaces hand-rolled `user-menu.tsx`.
6. `Tooltip` — Radix-backed. For icon-only controls (player, save/like, moderator).
7. `Sheet` — Radix-backed. Primary consumer: mobile nav; also the `QueuePanel` shape.
8. `Input` — with label + error-slot. Replaces bare `<input>` in auth + contribute forms.
9. `Select` — Radix-backed. Forms in `/contribute/*`.
10. `Toast` — via `sonner`. Single mount in `apps/web/app/layout.tsx`.
11. `Badge` / `Chip` — audit-justified; replaces inline `rounded-full` pill inconsistency in search-result index badges, apply-button, status indicators.
12. `SectionTitle` — audit-justified; formalizes `.section__title` (h5 map + 1.4rem + 12px margin-bottom) that recurs across Home / Reciter / Album as inline usage.

**Deferred to 2.3 as page-specific compositions, not primitives:** `Hero`, `LyricsPanel`, `TrackList`, `ReciterHero`. These consume primitives; they are not themselves primitives.

### Replacement scope (mechanical inline → primitive swaps)

Not a page rewrite. Pure mechanical substitution:

- `Button` — ~15-20 call sites: `SaveButton`, `LikeButton`, `login-form`, `reset-password-form`, `register`, `contribute/reciter-form`, `contribute/album-form`, `contribute/track-form`, library-tracks-list CTAs, empty-state CTAs, mod apply-button, mobile-nav hamburger.
- `Card` — ~6-8 call sites: `reciter-card`, `album-card`, `album-header`, `popular-tracks`, `contribute/contribution-list`, `auth/login-form` shell.
- `Input` — ~10 call sites: every auth + contribute form.
- `DropdownMenu` — rewrite `apps/web/src/components/layout/user-menu.tsx` to use the new primitive.
- `Tooltip` / `Tabs` / `Dialog` / `Select` / `Sheet` / `Badge` / `Toast` — introduced lazily at first-need site; not every primitive needs a 2.2 consumer.

Call-site counts above are estimates from the Phase 2.1 audit; the implementation plan nails exact paths and line ranges.

### File structure

```
packages/ui/src/
  components/
    button.tsx           (shadcn-generated; variant classnames tuned to legacy-derived palette)
    card.tsx             (shadcn-generated)
    dialog.tsx           (shadcn-generated, Radix)
    tabs.tsx             (shadcn-generated, Radix)
    dropdown-menu.tsx    (shadcn-generated, Radix)
    tooltip.tsx          (shadcn-generated, Radix)
    sheet.tsx            (shadcn-generated, Radix)
    input.tsx            (shadcn-generated)
    select.tsx           (shadcn-generated, Radix)
    badge.tsx            (shadcn-generated)
    section-title.tsx    (hand-authored; not in shadcn's catalogue)
    __tests__/
      button.test.tsx
      card.test.tsx
      ... (one per primitive)
  lib/
    utils.ts             (existing `cn` helper)
  index.ts               (re-exports; single public entry)

apps/web/app/
  globals.css            (@theme block rewritten — new palette, type, radius, shadow, motion tokens)
  layout.tsx             (font loading added for Bellefair + Roboto + Roboto Slab + Roboto Mono; <Toaster /> mounted)

apps/web/src/components/  (existing files edited to consume primitives from @nawhas/ui/components/*)
```

## Verification

**Per-primitive gate:** Vitest render test with 3–5 assertions (renders, `cn` override applies, variant prop wires correctly, ref-forwarding works where applicable, accessibility attrs present where applicable).

**Per-commit gate:** `./dev lint` + `./dev typecheck` green.

**Sub-project-complete gate:**

- `./dev qa` green (typecheck + lint + test + build)
- `./dev test:e2e` green (catches regressions in existing flows: auth, save/like, library, contribute, mod)
- Manual smoke of the 10 live-production routes from the audit (home, reciter profile, album, track, library/tracks, history, search, login, register, contribute root) with palette flipped to red and fonts loaded
- Dark-mode sanity: toggle dark mode and visit the same 10 routes; confirm every primitive reads correctly

No Storybook. No Playwright visual-regression snapshots. Those are deferred to 2.1b or a future pass.

## Commit Cadence

Direct-to-main per user preference. Single working branch optional if the sub-project bleeds over multiple sessions; fast-forward merge when done.

Rough commit sequence (~14–18 commits):

1. `feat(tokens): flip @theme to legacy-derived palette + add radius/shadow/motion scales` — the day-one visible flip.
2. `feat(layout): load Bellefair + Roboto + Roboto Slab + Roboto Mono via next/font; mount <Toaster />` — font loading + sonner installed + Toaster mounted in `layout.tsx` (no `toast()` callsites yet; those land lazily during replacement).
3–12. Ten shadcn-generated primitives, one commit each with Vitest: `feat(ui): add Button primitive`, `…Card`, `…Dialog`, `…Tabs`, `…DropdownMenu`, `…Tooltip`, `…Sheet`, `…Input`, `…Select`, `…Badge`.
13. `feat(ui): add SectionTitle primitive` — hand-authored (not in shadcn's catalogue).
14. `refactor(web): swap inline buttons for <Button> primitive` — ~15–20 call sites.
15. `refactor(web): swap inline cards for <Card> primitive` — ~6–8 call sites.
16. `refactor(web): swap bare <input> for <Input> primitive in auth + contribute forms` — ~10 call sites.
17. `refactor(web): rewrite user-menu with <DropdownMenu> primitive` — replaces hand-rolled absolute-positioned div.
18. `docs(roadmap): record Phase 2.2 outcomes` — closeout.

Each replacement commit references the specific files touched so a bisected regression is easy to attribute.

## Risks

- **Token-flip blast radius.** Changing palette + fonts + radii in one commit could visually regress a page no one thought about. Mitigation: `./dev test:e2e` + manual 10-route smoke before any subsequent commit lands.
- **shadcn CLI compatibility with Tailwind 4 + Radix 2.** shadcn templates historically assumed Tailwind 3 + Radix 1.x. `pnpm dlx shadcn@latest` may or may not emit code compatible with this repo's Tailwind 4.2 / React 19. Mitigation: generate `Button` first, inspect, adapt the generator's output before committing; if shadcn's templates lag, hand-author the remaining primitives using the Button as a pattern.
- **Radix 2 + React 19 compatibility.** Radix had a React 19 compatibility wave in 2025; this repo's Radix install is fresh, so version skew is unlikely but worth confirming.
- **2.1b deferred agenda absorption.** Vuetify elevation rgba stacks + some dark-mode surface hex values weren't extractable code-first. Mitigation: use code-first best-guess values in 2.2 tokens; any visible divergence from legacy gets caught by the 10-route smoke + manual dark-mode pass and is corrected in follow-up commits (or folded into the 2.3 page specs).

## Open Questions

None blocking. All Phase 2.1 "Verify before porting" items are resolved (see `docs/design/README.md § Decisions`). Two items known-unresolvable code-first (elevation rgba + some dark-mode surfaces) are accepted as 2.1b deferred rather than blocking 2.2.

## What this document is *not*

This is a design for Phase 2.2 specifically. It does not enumerate concrete implementation tasks (those live in the writing-plans output that follows). It does not prescribe page redesigns (Phase 2.3). It does not resolve the lyrics highlight + scroll-sync question (Phase 2.1c research) — any primitive that composes lyrics (none in 2.2) is Phase 2.3's to design.
