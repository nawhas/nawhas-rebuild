# Phase 2.1e — Complete Frontend Audit

**Status:** shipped 2026-04-22 · **Scope:** every production `.tsx`/`.ts` file under `apps/web/app/` and `apps/web/src/` (excluding `__tests__/`, server-only `lib/` files, and generated code) · **Total files audited:** 127 across 11 subtree passes.

This audit closes the gap Phase 2.2 uncovered: that the token flip shipped with Phase 2.2 would re-theme only surfaces that migrated to primitives, leaving the bulk of the codebase hand-rolled on the raw Tailwind ramp. Each of the seven axes below is a single flat read of every flagged finding, ordered so a cleanup sprint can pick up one file or bucket at a time.

## Methodology

- **Static review only.** No runtime, no screenshots, no palette extraction. Source-of-truth is the code as committed.
- **Subagent-per-subtree.** 11 parallel dispatches against a standardised checklist; controller merged partial findings into the seven per-axis master docs (this directory).
- **Seven axes, one file per axis**, plus this README. Per-axis organisation chosen to suit the axis — subtree, status, severity, primitive, page, or finding type — so the reader never has to re-sort.
- **Preserved findings verbatim** from the scratch passes; harmonised formatting only. If two scratches disagreed about a file's classification, both views were kept with context.
- **No screenshots, no visual regression.** That's Phase 2.1b and Phase 2.3's territory.

## Axis docs

| # | File | Organised by | Purpose |
|---|---|---|---|
| 1 | [`tokens.md`](./tokens.md) | Subtree | Per-file colour / radius / shadow / spacing inventory. Summary + top-10 offenders. |
| 2 | [`dark-mode.md`](./dark-mode.md) | Status (Good / Mixed / Broken / N/A) | "Show me the broken files" as one flat list + priority fix list for high-traffic routes. |
| 3 | [`responsive.md`](./responsive.md) | Subtree | Breakpoint coverage + concerns (missing `sm:`, magic heights, overflow risks). |
| 4 | [`primitives-replacement.md`](./primitives-replacement.md) | Target primitive | High/lower confidence candidates per primitive, plus "Files already consuming" completeness check. |
| 5 | [`accessibility.md`](./accessibility.md) | Severity (Critical / Important / Nice-to-have) | Focus management, ARIA coverage, keyboard nav, hit targets, i18n of `aria-label`s. |
| 6 | [`legacy-gap.md`](./legacy-gap.md) | Page | Per-page Missing / Divergent / Rebuild-only split against `docs/design/layouts.md` + `docs/design/README.md § Decisions`. |
| 7 | [`dead-code.md`](./dead-code.md) | Finding type | TODO markers, unused exports, orphan placeholders, duplication hot spots, suspect heuristics. |

## Top findings per axis

### Axis 1 — Token consumption
- **Zero semantic-token call sites** across the app; only 4 direct uses (all in `contribute/form-field.tsx` or `home/popular-tracks.tsx` via `<Card>` indirection).
- **6 ramped-token call sites** total — only `lyrics-display.tsx` and `auth-page-shell.tsx` reach for `primary-*` / `gray-50/950`.
- **Top-10 offenders:** `PlayerBar.tsx`, `search-results-content.tsx`, `MobilePlayerOverlay.tsx`, `mod/submissions/[id]/page.tsx`, `mobile-nav.tsx`, `QueuePanel.tsx`, `search-bar.tsx`, `mobile-search-overlay.tsx`, `track-list-item.tsx`, and the `/mod/*` route cluster.
- **Hot spot:** `mod/badges.tsx` + `mod/review-actions.tsx` + `mod/apply-button.tsx` + `mod/field-diff.tsx` carry ~40+ hardcoded semantic-hue classes (green/amber/yellow/orange/red/emerald/blue/purple) for status/diff/CTA meaning — largest axis-1 cluster in the codebase.

### Axis 2 — Dark-mode handling
- **~24 Good / ~27 Mixed / ~20 Broken / ~56 N/A.**
- **Priority fix list** covers Track page (5 files), Search (3 files), Library (1 file), Home (`AlbumListCard`, `track-list.tsx`), Auth (6 files), Settings (4 files). Entire auth subtree is dark-mode-broken almost wholesale; `mod/` is dark-ready except for CTA buttons relying on solid-colour contrast.

### Axis 3 — Responsive coverage
- **~18 files with flagged concerns.** Biggest hot spots: mod tables (no horizontal-scroll wrapper), 4-tab lyrics row (overflows at ~320px), `MobilePlayerOverlay` rendering full-screen on desktop, `QueuePanel`'s magic `h-[calc(100vh-65px)]`, and mod sidebar's fixed `w-56` without mobile collapse.
- **Breakpoint ramp:** `sm`/`md`/`lg` only — no `xl`/`2xl` anywhere.

### Axis 4 — Primitive-replacement backlog
- **Button:** 22 high-confidence + 4 lower-confidence candidates.
- **Card:** 12 high-confidence candidates (including 4 auth-card surfaces that re-inline the exact same ring+shadow+rounded-lg incantation).
- **Dialog / Sheet:** 3 strong Dialog candidates (MobilePlayerOverlay, mobile-search-overlay, delete-account modal); 2 strong Sheet candidates (mobile-nav drawer, QueuePanel).
- **Tabs:** MediaToggle + LyricsDisplay are the two flagship candidates — consolidating them is the highest-value Track-surface extraction.
- **Badge:** wholesale swap of `mod/badges.tsx` is the single largest cleanup.
- **SectionTitle:** primitive exists and ships unused; 4-6 ready-to-adopt sites.

### Axis 5 — Accessibility
- **4 Critical:** `MobilePlayerOverlay` has no focus trap despite `aria-modal="true"`; `play-all-button.tsx` has no `aria-label` + hard-coded English; `delete-account-section.tsx` modal has no focus trap / no Escape / no focus return; `search-results-content.tsx` has tab semantics without `tabpanel`.
- **~30 Important:** missing `focus-visible`, hard-coded English `aria-label`s on transport buttons (Save / Like / TrackPlay / TrackDetailPlay / PlayAll), missing arrow-key nav on hand-rolled tablists (MediaToggle / LyricsDisplay), absent focus management after form validation errors, invisible dark-mode focus rings on `nav-links.tsx` / `Save`/`LikeButton`.
- **~20 Nice-to-have:** `<caption className="sr-only">` on mod tables, `aria-describedby` on `Edit and resubmit`, duplicate-announce fieldset label, `dir`/`lang` already correct on Arabic/Urdu wrappers.

### Axis 6 — Legacy-parity gap
- **Home:** 5 missing (hero, Trending This Month, Recently Saved, hero-quote banner, Top Nawhas numbered list) — most are deferred per `layouts.md`, one (hero-quote banner) is unresolved.
- **Track:** 5 missing (Vibrant hero, right-rail YouTube+"More from this Album", add-to-queue/repeat controls, snackbar, timestamp highlight parked per 2.1c).
- **Album:** Vibrant tint + responsive type ramp + add-to-queue CTA still absent.
- **Reciter profile:** no hero banner, no discography pagination, no "Top Nawhas" strip, no per-album expand.
- **Auth:** the `?reason=save|like|library|contribute` port decided 2026-04-22 is **not yet implemented** anywhere (blocks contextual sign-in copy).
- **Shared chrome:** footer empty, no SVG logo, mobile nav needs Sheet port to restore Vuetify drawer parity.
- **Cross-page:** Bellefair/Roboto Slab loaded but not applied anywhere.

### Axis 7 — Dead / suspect code
- **3 TODO/milestone markers** (`settings/page.tsx` non-null assertion, `/mod/users` M6 search-not-wired, `notifications-section.tsx` M5 placeholder). **Zero commented-out blocks.**
- **3 unused exports** (`SiteHeaderStatic`, `DataPreview`, `clientLogger.debug/info/warn`).
- **4 orphan placeholders** (PlayerBar + MobilePlayerOverlay empty reciter `<p>`, contribute `reciter-form` unused `submissionId` prop, `empty-state.tsx` "Icon placeholder").
- **10 duplication hot spots** — biggest win: consolidating `AlbumListCard` into `cards/album-card.tsx` (fixes a dark-mode regression at the same time). `AuthStatusCard` extraction for `reset-password` + `verify-email` saves 40+ lines. Duplicate close / envelope / music-note SVGs across player and auth subtrees.
- **15+ i18n gaps** — every contribute form and every mod page hard-codes English; `play-all-button.tsx`, `track-play-button.tsx`, `track-detail-play-button.tsx` have hard-coded English `aria-label`s.

## How Phase 2.3 consumes this

Each page-redesign sub-spec under Phase 2.3 should open with a one-page excerpt pulling:

1. The subtree section(s) of `tokens.md` covering that page.
2. The page-specific `legacy-gap.md` section (Missing / Divergent / Rebuild-only).
3. Any Critical / Important entries in `accessibility.md` that touch a file the redesign will edit.
4. The primitive-replacement lines that apply (for the size estimate).
5. Any duplication hot-spot from `dead-code.md` that the redesign will consolidate.

That excerpt plus `docs/design/README.md § Decisions` is the full brief for each page.

## What this audit is NOT

- **Not a redesign.** Every finding is a pointer; the fix itself is Phase 2.3 or the ongoing primitive sweep.
- **Not a visual verification.** Phase 2.1b covers that (Vuetify elevation `rgba` stacks, dark-mode surface colours, lyrics scroll-sync interaction timings, etc.).
- **Not exhaustive past the frontend.** Server-only `lib/` files, API routes, Drizzle migrations, tRPC routers, and `packages/ui` internals were out of scope.
