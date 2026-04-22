# Phase 2.1 — Legacy Visual Audit (Design)

**Status:** Design approved 2026-04-22 · Implementation plan not yet written
**Author:** Asif (brainstormed with Claude)
**Parent roadmap:** [`2026-04-21-rebuild-roadmap.md`](./2026-04-21-rebuild-roadmap.md), Phase 2.1

## Context

Phase 2.1 is the first sub-project of Phase 2 (Design System + Visual Parity). Its purpose, per the roadmap, is to produce the "source of truth for everything that follows" in the visual work — i.e. the reference document that Phase 2.2 (primitives in `packages/ui`) and Phase 2.3 (page-by-page redesign) consume.

The rebuild's current `@theme` block in `apps/web/app/globals.css` (green/amber/slate, Inter type stack) clearly was not derived from legacy `nawhas.com`; closing that gap is what Phase 2 exists to do. The roadmap originally named only `docs/design/tokens.md` as the deliverable, but this spec extends scope to include a layout audit as well — see §2 below.

## Goals

1. Capture legacy production `nawhas.com`'s design tokens (palette, typography, spacing, border radii, shadows, motion) as a structured reference.
2. Capture legacy page-level layouts and shared chrome at the skeleton level.
3. Make every value comparative against the current rebuild so Phase 2.2 can treat each row as a discrete migration ticket (`keep` / `replace with X` / `add` / `drop`).
4. Preserve provenance: every value traces back to a file and line range in `nawhas/nawhas@master` via `gh api`, so downstream work can re-verify without re-discovering.

## Non-Goals

- No screenshots or Playwright runs in this phase. Visual verification is explicitly deferred to a follow-up pass (2.1b) or folded into 2.2/2.3 as needed.
- No Vuetify-to-Tailwind class translation table. That is Phase 2.2's output.
- No new token decisions. This phase documents legacy + rebuild side by side; which side wins per row is 2.2's call.
- No audit of legacy features that do not reach production today (stories, draft-lyrics diff viewer, print-lyrics, dormant moderator tooling) — per the parent roadmap's non-goals.

## Methodology

A **code-first static audit** of `github.com/nawhas/nawhas` (branch `master`) performed entirely via `gh api`. No local clone and no running instance.

Every captured value carries a provenance citation of the form `nawhas/nawhas:<path>#Lx-y` so any downstream reader can verify without re-discovering. Where a token cannot be extracted code-first — typically rendered shadows and some motion timings that live in component-level CSS or get composed at runtime — the audit records `deferred: visual verify` rather than guessing. Those rows are the explicit agenda for a later visual verification pass.

**Scope anchor:** production `nawhas.com` is the target, not the legacy repo in aggregate. Step 1 of the execution (the liveness sweep — see §3) exists precisely to separate shipped-in-prod from dormant-in-repo before anything else gets written.

**Source-priority ladder when legacy is internally inconsistent:**

1. `nuxt/vuetify.options.ts` (Vuetify theme)
2. `nuxt/assets/` global SCSS
3. Component-scoped SCSS (inside `.vue` SFCs)
4. Inline styles

A lower-priority source is only recorded when it demonstrably overrides the higher one. Otherwise the higher source is canonical and the lower one isn't cited.

## Scope

### Tokens → `docs/design/tokens.md`

Six token families, each as a three-column comparative table: **Legacy value · Current rebuild value · Action**.

| Family | Legacy source | Fields extracted |
|---|---|---|
| Palette | `nuxt/vuetify.options.ts` + SCSS color vars | Role, hex, WCAG contrast pairing |
| Typography | `nuxt/assets/` globals + `nuxt.config.js` Google Fonts | Family, weight, size, line-height, letter-spacing — per named role (display, h1–h6, body, caption, etc.) |
| Spacing | Vuetify theme (4px base) + SCSS spacing maps | Scale steps, container widths, section gutters |
| Border radius | Vuetify theme + component SCSS | Per-component radii (button, card, chip, input) |
| Shadows / elevation | Vuetify elevation scale | Declared Vuetify levels; rendered values `deferred: visual verify` |
| Motion | Vuetify transitions + component SCSS | Durations, easing curves; partially `deferred: visual verify` |

### Layouts → `docs/design/layouts.md`

Per-page entries, in Phase 2.3's redesign order:

1. Home
2. Reciter profile
3. Album
4. Track (audio + lyrics + metadata — the key surface)
5. Library / History / Saved / Liked
6. Search results
7. Auth
8. Contribute + Mod

For each page: route · purpose · layout skeleton (ASCII tree of major regions) · key Vue components used (file paths in `nuxt/pages/` and `nuxt/components/`) · notable interaction patterns · rebuild equivalent (route in `apps/web/app/` + the React components involved) · delta.

Shared chrome — global header, footer, persistent nav, player bar (if persistent across routes) — is documented once in its own top section and referenced from the page entries.

This is **skeleton-level**, not a pixel-perfect catalogue. Hard cap each page entry at ~30 lines of ASCII + prose; anything longer is a signal that detail belongs in Phase 2.3's per-page spec instead.

### Index → `docs/design/README.md`

Short methodology recap, a "what we deliberately did NOT carry over" list (dead legacy features, known bad patterns we won't port), a "verify before porting" list (rows that the liveness sweep flagged as ambiguous), and cross-links to the other two docs.

## Execution Shape

The implementation plan (written in the next step) will break this into concrete tasks. The intended shape is:

1. **Liveness sweep.** Read `nuxt/pages/` routes, cross-check `nuxt.config.js`, store modules, and any feature-flag usage to produce the authoritative list of pages actually shipped on production `nawhas.com`. Output is an inline section in `README.md` that gates the layout audit's scope.
2. **Tokens extraction.** Walk the source-priority ladder (Vuetify options → SCSS globals → component SCSS). Fill the six comparative tables. Mark `deferred: visual verify` where code-first is insufficient.
3. **Layout extraction.** For each live page from Step 1, read the Vue SFC + layout wrapper, extract the skeleton, reference the rebuild's equivalent, record the delta.
4. **README + cross-links.** Written last so it can accurately summarise findings. Wire `[tokens](./tokens.md)` / `[layouts](./layouts.md)` links and surface the deferred rows.

## Deliverables

Three files, in `docs/design/`:

- `README.md` (written last, indexes the other two)
- `tokens.md`
- `layouts.md`

## Verification

No code changes, so no CI gate. Sanity checks before marking 2.1 complete:

- Every value in `tokens.md` has a `nawhas/nawhas:<path>#Lx-y` provenance citation, or an explicit `deferred: visual verify` marker.
- Every comparative row has all three columns filled (legacy, rebuild, action) or is explicitly deferred.
- Every page on the liveness-sweep "live" list has a corresponding entry in `layouts.md`.
- `README.md` lists the deferred rows as the agenda for the visual verification pass.

## Commit Cadence

Direct to `main` (per user preference on this repo). One commit per deliverable file, in order tokens → layouts → README, each referencing the source citations roughly so future readers can audit provenance without first reading the doc.

## Open Questions (non-blocking for this spec)

1. Legacy Vuetify encodes some tokens as Vuetify *names* (e.g., `elevation-4`) rather than raw values. Where that happens, the audit will record the Vuetify level + Vuetify 2's documented default; production overrides will be picked up in the deferred visual pass.
2. Production may have runtime or remote overrides (CMS-driven palette, env-driven feature toggles). Unlikely given the stack, but `tokens.md` will explicitly note any SCSS variable that is sourced from API/env rather than static config.

## Risks

- **Scope creep on layouts.** Page skeletons can nerd-snipe into pixel-perfect catalogues. Mitigation: the ~30-line-per-page cap stated in §2. Anything bigger is a signal to defer detail to Phase 2.3's per-page spec.
- **Dead code that looks live.** Legacy pages may be routed but gated by env/feature flag in production. Mitigation: Step 1's liveness sweep cross-checks env flags, and ambiguous cases land in `README.md`'s "verify before porting" list rather than being silently audited.

## What this document is *not*

This is a design for Phase 2.1 specifically. It does not enumerate the concrete audit steps (those belong in the implementation plan produced next by the `writing-plans` skill) and it does not dictate what values Phase 2.2 should adopt (that is 2.2's decision, informed by this audit).
