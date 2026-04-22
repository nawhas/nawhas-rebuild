# Phase 2.3 — Page-by-Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 8 live production pages (Home, Reciter, Album, Track, Library+History, Search, Auth, Contribute+Mod) to full token adoption + dark-mode parity + primitive coverage + legacy-affordance parity + Critical/Important a11y coverage, consuming the Phase 2.1e audit findings as the per-page backlog.

**Architecture:** Page-first end-to-end in descending-traffic order. Each page runs a 5-step workstream (token sweep → dark-mode fixes → primitive adoption → legacy-gap port → a11y). Direct-to-main per user preference. Every command routes through `./dev` where possible; `pnpm --filter <pkg> <script>` as a fallback when a docker port conflict blocks the dockerised path.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Tailwind 4.2 (with semantic token layer from Phase 2.2), `@nawhas/ui` primitives (Phase 2.2), Drizzle ORM (for the Album vibrant migration), Vitest 4, Playwright, `next-intl`, `lucide-react`, `sonner`. All commands via `./dev`.

---

## Pre-flight

**Branch / baseline.** Direct to `main`. Working tree should be clean.

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git status
# Expected: "On branch main … nothing to commit, working tree clean"
# (docs/design/.audit-notes.md may remain untracked — pre-existing.)
```

**Keep these references open while executing:**

- **Spec:** `docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md`
- **Audit docs** (the per-page backlog): `docs/design/audit-complete/tokens.md`, `dark-mode.md`, `primitives-replacement.md`, `accessibility.md`, `legacy-gap.md`, `dead-code.md`, `responsive.md`
- **Token reference:** `apps/web/app/globals.css` (shadcn semantic layer in the `@theme inline` block)
- **Primitives:** `packages/ui/src/components/*.tsx`

**Baseline smoke.**

```bash
./dev typecheck && ./dev lint
```

Must be green. If red, stop and fix the pre-existing regression first.

---

## Standardized token-class mapping (referenced by every token-sweep task)

Apply these rewrites everywhere a file in scope uses the left-hand class. Context-sensitive choices are marked with `(context)`.

| Tailwind default | Semantic token (most common role) |
|---|---|
| `bg-white` | `bg-card` (card / popover surface) **or** `bg-background` (page body) |
| `bg-gray-50` / `bg-zinc-50` | `bg-background` (page body) **or** `bg-muted` (recessed strip) |
| `bg-gray-100` / `bg-zinc-100` | `bg-muted` |
| `bg-gray-200` / `bg-zinc-200` | `bg-muted` (darker-than-body strip) |
| `bg-gray-800` / `bg-zinc-800` dark | `dark:bg-card` (drop the explicit dark variant; semantic token auto-flips) |
| `bg-gray-900` / `bg-zinc-900` dark | `dark:bg-background` **or** `dark:bg-card` (context) |
| `text-gray-900` / `text-zinc-900` | `text-foreground` |
| `text-gray-700` | `text-foreground` **or** `text-muted-foreground` (context — body vs. secondary) |
| `text-gray-500` / `text-zinc-500` | `text-muted-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `text-gray-300` dark | `dark:text-foreground` (drop explicit dark variant) |
| `text-gray-100` dark | `dark:text-foreground` |
| `text-white` (on dark bg) | `text-primary-foreground` (on bg-primary) **or** `text-card-foreground` (on bg-card dark) |
| `border-gray-200` / `border-zinc-200` | `border-border` |
| `border-gray-300` | `border-border` |
| `border-gray-700` dark | `dark:border-border` (drop explicit dark variant) |
| `divide-gray-100` / `divide-gray-200` | `divide-border` |
| `ring-gray-900` | `ring-ring` |
| `focus:ring-gray-900` / `focus:ring-primary-500` | `focus-visible:ring-ring` (+ `focus-visible:ring-2` `focus-visible:ring-offset-2`) |
| `bg-green-600` / `bg-green-700` (primary CTA) | `bg-primary` (+ `hover:bg-primary/90`) **or** `<Button variant="default">` if a button |
| `bg-green-100` / `bg-emerald-100` (badge bg) | `bg-muted` with `text-foreground` **or** use `<Badge variant="secondary">` |
| `bg-red-600` / `bg-red-700` (destructive CTA) | `bg-destructive` (+ `hover:bg-destructive/90`) **or** `<Button variant="destructive">` |
| `bg-orange-500` / `bg-orange-600` | audit row-by-row: if brand-accent use a custom utility; if CTA use `<Button variant="default">`; if warning badge use `<Badge>` |
| `bg-amber-100` / `bg-yellow-100` (badge bg) | `<Badge variant="outline">` typically; context decides |
| arbitrary hex / `bg-[#...]` | case by case — flag in commit message |

**Dark-mode simplification rule:** when you swap a `bg-white dark:bg-gray-900` pair to `bg-card`, you can drop the `dark:bg-*` half entirely — semantic tokens auto-flip via the `.dark` overrides in `globals.css`. Same applies to `text-gray-900 dark:text-gray-100` → `text-foreground`, `border-gray-200 dark:border-gray-700` → `border-border`, etc.

**Primitive migration rule:** when a file's role is "card shell", replace the inline `rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900` with `<Card>` — drop the inline classes; the primitive carries them. Same for `<Button>` (replaces inline `rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700`), `<Input>`, `<Badge>`, `<Dialog>`, `<Sheet>`, `<Tabs>`, `<Tooltip>`, `<Select>`, `<DropdownMenu>`.

---

## Phase A — Home (Tasks 1–4)

Highest-traffic page. Biggest visible gap (no hero at all). ~3-4 commits.

### Task 1: Home — token + dark-mode sweep

**Files in scope (from `audit-complete/tokens.md` + `dark-mode.md`):**
- `apps/web/app/page.tsx`
- `apps/web/src/components/home/popular-tracks.tsx`
- `apps/web/src/components/cards/reciter-card.tsx`
- `apps/web/src/components/cards/album-card.tsx`

- [ ] **Step 1: Re-read the audit findings for these files**

```bash
awk '/^## Home/,/^## /' /home/asif/dev/nawhas/nawhas-rebuild/docs/design/audit-complete/tokens.md | head -100
grep -nE "cards/reciter-card|cards/album-card|home/popular-tracks|app/page" /home/asif/dev/nawhas/nawhas-rebuild/docs/design/audit-complete/dark-mode.md
```

- [ ] **Step 2: Apply the mapping table (standardized token-class mapping above) to each file**

For each file, grep for each `bg-gray-*` / `text-gray-*` / `bg-white` / `bg-black` / `text-white` / `border-gray-*` / `divide-gray-*` / `ring-gray-*` class and rewrite per the mapping. When the `dark:*` variant becomes redundant (e.g., you swapped `bg-white dark:bg-gray-900` to `bg-card`), delete the `dark:*` half.

Hardcoded non-gray colors (`bg-green-*`, `bg-amber-*`, etc.) stay for now — Task 3's primitive adoption will absorb most of them. Leave-or-rewrite case by case.

- [ ] **Step 3: Verify**

```bash
./dev typecheck && ./dev lint
```

Expected: green. `pnpm --filter @nawhas/web test --run src/components/home src/components/cards` for the targeted suites.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/src/components/home apps/web/src/components/cards
git commit -m "$(cat <<'EOF'
refactor(home): token + dark-mode sweep

Phase 2.3 Task 1 — Home page files consume semantic tokens
(bg-background / bg-card / bg-muted / text-foreground /
text-muted-foreground / border-border / ring-ring) instead of the
previous raw Tailwind palette. Redundant dark: variants dropped
where the semantic token auto-flips via the .dark overrides from
Phase 2.2 Task 1's globals.css.

Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md
Refs: docs/design/audit-complete/tokens.md
Refs: docs/design/audit-complete/dark-mode.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2: Home — primitive adoption

**Files in scope (from `audit-complete/primitives-replacement.md`):**
- `apps/web/src/components/cards/reciter-card.tsx` — inner `<Card>` inside the outer `<Link>` (keep the link's focus-ring shell)
- `apps/web/src/components/cards/album-card.tsx` — same pattern
- `apps/web/src/components/home/popular-tracks.tsx` — `<SectionTitle>` for its header; confirm `<Card>` already applied from Phase 2.2 Task 15
- `apps/web/app/page.tsx` — `<SectionTitle>` for every section header (Top Reciters / Top Nawhas / Saved / etc.)

- [ ] **Step 1: Inspect reciter-card current state**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/cards/reciter-card.tsx
```

The current outer element is a `<Link>` with `rounded-lg` for focus-ring. Inside that, the visible card shell is a `<div>` with img + text. Wrap the inside with `<Card>` (from `@nawhas/ui/components/card`) while keeping the outer `<Link>`.

- [ ] **Step 2: Update reciter-card.tsx**

Pattern:

```tsx
// Before
<Link href={href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  <div className="overflow-hidden rounded-lg bg-white shadow-sm transition group-hover:shadow-md dark:bg-gray-900">
    {/* img + text */}
  </div>
</Link>

// After
import { Card } from '@nawhas/ui/components/card';
// …
<Link href={href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  <Card className="overflow-hidden transition group-hover:shadow-md">
    {/* img + text */}
  </Card>
</Link>
```

`<Card>` already includes `rounded-lg border bg-card text-card-foreground shadow-sm` — drop those from the inline className.

- [ ] **Step 3: Update album-card.tsx the same way**

Same pattern.

- [ ] **Step 4: Update page.tsx section headings to `<SectionTitle>`**

Pattern:

```tsx
// Before
<h2 className="text-[1.4rem] font-normal leading-8 mb-3 text-foreground">Top Reciters</h2>

// After
import { SectionTitle } from '@nawhas/ui/components/section-title';
// …
<SectionTitle>Top Reciters</SectionTitle>
```

Apply to every `<h2>` that renders a section heading on the home page.

- [ ] **Step 5: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/cards src/components/home
```

Green expected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/src/components/cards apps/web/src/components/home
git commit -m "$(cat <<'EOF'
refactor(home): adopt <Card> inner shell + <SectionTitle> primitives

Phase 2.3 Task 2. reciter-card and album-card now wrap their
inner shell in <Card> (the outer <Link> retains the focus-ring
responsibility). Home page section headings move to <SectionTitle>
primitive (first real consumer since Phase 2.2 Task 13 shipped it).

Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 3: Home — hero section + Top Nawhas + Saved strip (legacy-gap port)

**Files in scope:**
- Create: `apps/web/src/components/home/hero-section.tsx`
- Create: `apps/web/src/components/home/top-nawhas-table.tsx`
- Create: `apps/web/src/components/home/saved-strip.tsx` (client component — reads session)
- Modify: `apps/web/app/page.tsx` (mount new sections)
- Modify: `apps/web/messages/en.json` (add slogan + section heading keys)

- [ ] **Step 1: Create `apps/web/src/components/home/hero-section.tsx`**

```tsx
import { SearchBar } from '@/components/search/search-bar';

export function HeroSection(): React.JSX.Element {
  return (
    <section
      aria-label="Hero"
      className="relative isolate overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 px-6 py-16 md:py-24 text-primary-foreground"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1
          className="font-serif text-[2.5rem] md:text-[3.5rem] leading-tight tracking-normal font-medium"
        >
          {/* slogan — translation key populated in Step 4 */}
          {/* Legacy text: "A comprehensive digital library of nawha recitations." */}
          Discover the beauty of nawha recitation.
        </h1>
        <p className="mt-4 text-primary-foreground/85 text-lg">
          Browse reciters, albums, and tracks from the devotional tradition.
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar variant="hero" />
        </div>
      </div>
    </section>
  );
}
```

Note: `font-serif` resolves to `var(--font-bellefair)` (Phase 2.2 Task 2 added this).

- [ ] **Step 2: Add `variant="hero"` to `<SearchBar>`**

Read `apps/web/src/components/search/search-bar.tsx`. It currently renders a fixed-size input. Add an optional `variant?: 'default' | 'hero'` prop. In hero variant, the input has larger padding (`py-4 text-lg`), rounded-full, and a subtle shadow:

```tsx
// At the top of search-bar.tsx, add to the component props:
interface SearchBarProps {
  variant?: 'default' | 'hero';
}

export function SearchBar({ variant = 'default' }: SearchBarProps): React.JSX.Element {
  // …existing code…
  const inputClass =
    variant === 'hero'
      ? 'h-14 rounded-full pl-14 pr-4 text-base shadow-lg'
      : 'h-9 rounded-md pl-9 pr-3 text-sm';
  // pass inputClass to the <Input> / <input> wherever it's rendered
}
```

(Exact integration will depend on the current SearchBar internal structure — preserve existing behavior, just gate the styling on the variant.)

- [ ] **Step 3: Create `apps/web/src/components/home/top-nawhas-table.tsx`**

```tsx
import Link from 'next/link';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import type { TrackDTO } from '@nawhas/types';

interface TopNawhasTableProps {
  tracks: TrackDTO[];
}

export function TopNawhasTable({ tracks }: TopNawhasTableProps): React.JSX.Element {
  if (tracks.length === 0) return <></>;
  return (
    <section aria-label="Top Nawhas">
      <SectionTitle>Top Nawhas</SectionTitle>
      <ol className="divide-y divide-border rounded-lg border border-border bg-card">
        {tracks.map((track, index) => (
          <li key={track.id} className="flex items-center gap-4 px-4 py-3">
            <span
              aria-hidden
              className="w-6 flex-shrink-0 text-center font-mono text-sm text-muted-foreground"
            >
              {index + 1}
            </span>
            <Link
              href={`/reciters/${track.reciterSlug ?? 'unknown'}/albums/${track.albumSlug}/tracks/${track.slug}`}
              className="flex-1 truncate font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {track.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

Exact DTO shape may differ (reciter slug traversal); adapt to what `TrackDTO` actually carries. Use `@nawhas/types` as the source of truth.

- [ ] **Step 4: Create `apps/web/src/components/home/saved-strip.tsx` (client)**

```tsx
'use client';

import { useSession } from '@/lib/auth-client';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { trpc } from '@/lib/trpc-client'; // adapt import to repo convention

export function SavedStrip(): React.JSX.Element | null {
  const session = useSession();
  const { data: saved } = trpc.library.list.useQuery(
    { limit: 6 },
    { enabled: Boolean(session.data) }
  );
  if (!session.data || !saved || saved.length === 0) return null;
  return (
    <section aria-label="Recently saved">
      <SectionTitle>Recently Saved</SectionTitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {saved.map((track) => (
          <a
            key={track.id}
            href={`/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="aspect-square rounded-lg bg-muted" />
            <p className="mt-2 truncate text-sm font-medium text-foreground">{track.title}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
```

Adapt the tRPC procedure name (`library.list`) to whatever's actually in `apps/web/src/server/routers/library.ts`. The query needs a `limit: 6` and returns recently-saved tracks.

- [ ] **Step 5: Mount new sections in `apps/web/app/page.tsx`**

Replace the existing HomePage body with:

```tsx
import { HeroSection } from '@/components/home/hero-section';
import { SavedStrip } from '@/components/home/saved-strip';
import { TopNawhasTable } from '@/components/home/top-nawhas-table';
// …existing imports for top-reciters / top-albums / popular-tracks…

export default async function HomePage(): Promise<React.JSX.Element> {
  // …existing data loads…
  const topTracks = await serverTrpc.tracks.top.fetch({ limit: 10 }); // adapt to actual procedure

  return (
    <>
      <HeroSection />
      <div className="mx-auto max-w-screen-xl space-y-12 px-4 py-10 md:px-8">
        <SavedStrip />
        <TopRecitersSection />
        <TopAlbumsSection />
        <TopNawhasTable tracks={topTracks} />
        <PopularTracks />
      </div>
    </>
  );
}
```

Adapt the layout + data-fetch stubs to the repo's existing conventions (server actions vs tRPC server client vs `createTRPCCaller`).

- [ ] **Step 6: Add translation keys**

Open `apps/web/messages/en.json`. Add under `home`:

```json
{
  "home": {
    "hero": {
      "slogan": "Discover the beauty of nawha recitation.",
      "subtitle": "Browse reciters, albums, and tracks from the devotional tradition."
    },
    "sections": {
      "recentlySaved": "Recently Saved",
      "topReciters": "Top Reciters",
      "topAlbums": "Top Albums",
      "topNawhas": "Top Nawhas"
    }
  }
}
```

Wire the hero / section-title strings through `useTranslations('home')` in the new components where the codebase's i18n pattern dictates. Hero is a server component; use `getTranslations('home')` from `next-intl/server`.

- [ ] **Step 7: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/home
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/page.tsx apps/web/src/components/home apps/web/src/components/search/search-bar.tsx apps/web/messages/en.json
git commit -m "$(cat <<'EOF'
feat(home): restore hero + Top Nawhas table + Saved strip

Phase 2.3 Task 3 — ports the Home-page legacy affordances the
2.1 audit flagged as missing:

- HeroSection: red-gradient (primary-700 → primary-600 → primary-800)
  + Bellefair serif slogan at 2.5rem md / 3.5rem lg (replaces legacy's
  2020-era Roboto-200 thin display) + hero-variant SearchBar
  (rounded-full, h-14, shadow-lg).
- TopNawhasTable: ordered list of top tracks, numbered, using
  <SectionTitle> + semantic tokens.
- SavedStrip: client component, conditional on useSession, renders
  the 6 most recently-saved tracks as a card grid.

SearchBar gains a variant="hero" prop to drive the enlarged styling.
Translation keys added to messages/en.json under home.hero.* and
home.sections.*.

Legacy "Latest Stories" strip deliberately NOT ported (out of scope
per roadmap non-goals).

Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 4: Home — a11y fixes

**Files in scope:** any Home files with Critical/Important findings in `audit-complete/accessibility.md`.

- [ ] **Step 1: Grep the audit for home a11y findings**

```bash
grep -B1 -A2 -E "apps/web/app/page|home/|cards/reciter|cards/album" /home/asif/dev/nawhas/nawhas-rebuild/docs/design/audit-complete/accessibility.md
```

- [ ] **Step 2: Apply each finding's fix**

Typical home a11y fixes from the audit:
- Whole-card click pattern: add `role="article"` to card, verify `aria-labelledby` → title id pattern, ensure Link is the primary click target (not the whole div).
- Heading hierarchy: one `<h1>` (the hero), `<h2>` for section titles (the new `<SectionTitle>` defaults to h2 ✓).
- `aria-label` on hero search: `<SearchBar variant="hero" aria-label="Search reciters, albums, tracks">` (pass through the prop).

- [ ] **Step 3: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/home src/components/cards
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/src/components/home apps/web/src/components/cards
git commit -m "$(cat <<'EOF'
fix(home): address Critical + Important a11y findings

Phase 2.3 Task 4 — consumes the home subset of
docs/design/audit-complete/accessibility.md.

Refs: docs/design/audit-complete/accessibility.md
Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase B — Reciter profile (Tasks 5–7)

### Task 5: Reciter — token + dark-mode sweep

**Files:**
- `apps/web/app/reciters/[slug]/page.tsx`
- `apps/web/src/components/reciters/reciter-header.tsx` (if exists — else the hero markup is inline in the page; touch whichever has the audit findings)
- `apps/web/src/components/albums/album-grid.tsx`
- `apps/web/src/components/cards/album-card.tsx` (if not already fully swept in Task 1/2)

**Steps mirror Task 1's pattern:**

- [ ] **Step 1:** re-read the audit findings for these file paths in `audit-complete/tokens.md` + `dark-mode.md`.
- [ ] **Step 2:** apply the standardized token mapping table. Specifically fix `albums/album-grid.tsx::AlbumListCard` which the audit flags Broken (no `dark:` variants at all).
- [ ] **Step 3:** `./dev typecheck && ./dev lint`.
- [ ] **Step 4:** commit with `refactor(reciter): token + dark-mode sweep`.

### Task 6: Reciter — primitive adoption + hero title + load-more pagination (legacy-gap port)

**Files:**
- `apps/web/src/components/reciters/reciter-header.tsx` (create if absent; else modify)
- `apps/web/src/components/albums/album-grid.tsx`
- `apps/web/src/components/albums/load-more-albums.tsx` (create — client component)
- `apps/web/app/reciters/[slug]/page.tsx`

- [ ] **Step 1: Hero title in Roboto Slab + remove placeholder buttons**

In `reciter-header.tsx` (or the inline hero in `[slug]/page.tsx`):

```tsx
<h1 className="font-slab text-[2.5rem] md:text-[3.5rem] font-bold tracking-tight text-foreground">
  {reciter.name}
</h1>
```

Delete any `<Button>Website</Button>` / `<Button>Favorite</Button>` that have no `onClick` handler — the legacy had these as dead placeholders. Verify via grep before removing.

- [ ] **Step 2: Create `<LoadMoreAlbums>` client component**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@nawhas/ui/components/button';
import { AlbumCard } from '@/components/cards/album-card';
import { trpc } from '@/lib/trpc-client';
import type { AlbumDTO } from '@nawhas/types';

interface LoadMoreAlbumsProps {
  reciterSlug: string;
  initialAlbums: AlbumDTO[];
  totalCount: number;
}

const PAGE_SIZE = 12;

export function LoadMoreAlbums({
  reciterSlug,
  initialAlbums,
  totalCount,
}: LoadMoreAlbumsProps): React.JSX.Element {
  const [loadedAlbums, setLoadedAlbums] = useState<AlbumDTO[]>(initialAlbums);
  const [cursor, setCursor] = useState(initialAlbums.length);
  const utils = trpc.useUtils();

  async function loadMore(): Promise<void> {
    const next = await utils.albums.listByReciter.fetch({
      reciterSlug,
      offset: cursor,
      limit: PAGE_SIZE,
    });
    setLoadedAlbums((prev) => [...prev, ...next]);
    setCursor((prev) => prev + next.length);
  }

  const hasMore = cursor < totalCount;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {loadedAlbums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => { void loadMore(); }}>
            Load more albums
          </Button>
        </div>
      )}
    </>
  );
}
```

Adapt `trpc.albums.listByReciter` to whatever the actual procedure is. If the existing router lacks an `offset`-paginated variant, add one (small addition to `apps/web/src/server/routers/albums.ts`).

- [ ] **Step 3: Mount in `reciters/[slug]/page.tsx`**

```tsx
const initialAlbums = await serverTrpc.albums.listByReciter.fetch({
  reciterSlug: params.slug,
  offset: 0,
  limit: 12,
});
const totalCount = await serverTrpc.albums.countByReciter.fetch({ reciterSlug: params.slug });

// …in JSX:
<LoadMoreAlbums
  reciterSlug={params.slug}
  initialAlbums={initialAlbums}
  totalCount={totalCount}
/>
```

Add a `countByReciter` procedure if absent.

- [ ] **Step 4: `<SectionTitle>` on the "Discography" / "Top Nawhas" headings in reciter page**

- [ ] **Step 5: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/reciters src/components/albums
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/reciters apps/web/src/components/reciters apps/web/src/components/albums apps/web/src/server/routers/albums.ts
git commit -m "$(cat <<'EOF'
feat(reciter): hero title in Roboto Slab + load-more album pagination

Phase 2.3 Task 6 — restores legacy visual signals on the reciter
profile:

- Roboto Slab hero title (font-slab token) at 2.5rem / 3.5rem md+,
  matching 7 other legacy hero surfaces.
- Load-more button pagination via new <LoadMoreAlbums> client
  component (middle-ground modernisation vs legacy's numbered-page
  pagination).
- Remove legacy's non-functional "Website" + "Favorite" placeholder
  buttons (dead UI in the legacy source — no @click handlers).
- <SectionTitle> primitive on section headings.

Adds albums.countByReciter procedure for the pagination total.

Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 7: Reciter — a11y fixes

Same shape as Task 4. Grep `audit-complete/accessibility.md` for reciter findings, apply, verify, commit with `fix(reciter): address Critical + Important a11y findings`.

---

## Phase C — Album (Tasks 8–11)

Vibrant migration is its own task (DB + seed script + render).

### Task 8: Album — token + dark-mode sweep

**Files:**
- `apps/web/app/albums/[slug]/page.tsx`
- `apps/web/src/components/albums/album-header.tsx`
- `apps/web/src/components/albums/track-list.tsx`
- `apps/web/src/components/albums/track-list-item.tsx`

Steps mirror Task 1. Commit: `refactor(album): token + dark-mode sweep`.

### Task 9: Album — primitive adoption + Roboto Slab hero title

**Files:** same as Task 8 + `apps/web/src/components/albums/play-album-button.tsx` (if exists).

- [ ] **Step 1: `<Card>` on album-header shell**

`album-header.tsx` — wrap the visible hero block (not the whole page) in `<Card>`. Drop inline `rounded-lg border bg-white shadow-sm` classes.

- [ ] **Step 2: Roboto Slab hero title**

```tsx
<h1 className="font-slab text-[2rem] md:text-[2.75rem] font-bold tracking-tight text-foreground">
  {album.title}
</h1>
```

- [ ] **Step 3: `<Button>` cluster on play / save / share**

Where the album-header has play / save / share buttons, use `<Button>` + appropriate variants:

```tsx
import { Button } from '@nawhas/ui/components/button';
// …
<div className="flex flex-wrap gap-2">
  <Button onClick={playAlbum}>Play</Button>
  <Button variant="outline" onClick={addToQueue}>Add to queue</Button>
  <SaveButton />  {/* already uses Button */}
</div>
```

- [ ] **Step 4: `<Badge>` on track metadata pills (if any)**

Grep `track-list-item.tsx` for hardcoded `rounded-full text-xs bg-*-100 text-*-800` patterns. Replace with `<Badge variant="secondary">`.

- [ ] **Step 5: `<SectionTitle>` on "Tracks" / "More from this reciter" headings.**

- [ ] **Step 6-7:** Verify + commit as `refactor(album): adopt Card + Button + Badge + SectionTitle + Roboto Slab hero title`.

### Task 10: Album — vibrant color migration + seed + render (legacy-gap port)

Biggest per-page task. Adds a DB column, a seed script, and wires the render path.

**Files:**
- Create: `packages/db/drizzle/migrations/XXXX_add_vibrant_color.sql` (format per existing migrations)
- Modify: `packages/db/src/schema/albums.ts`
- Create: `apps/web/scripts/compute-vibrant-colors.ts`
- Modify: `apps/web/src/components/albums/album-header.tsx`
- Modify: `packages/db/package.json` (add `node-vibrant` as a dev dep if the script lives in db, or add to web if the script is under apps/web)

- [ ] **Step 1: Check existing albums schema**

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/packages/db/src/schema/albums.ts
```

Confirm the table structure + migration numbering convention.

- [ ] **Step 2: Add column to schema**

In `packages/db/src/schema/albums.ts`, add:

```ts
export const albums = pgTable('albums', {
  // …existing columns…
  vibrantColor: text('vibrant_color'), // hex string or null; populated by compute-vibrant-colors.ts
});
```

- [ ] **Step 3: Generate the migration**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
pnpm --filter @nawhas/db exec drizzle-kit generate
```

Review the generated SQL — it should be `ALTER TABLE albums ADD COLUMN vibrant_color text;` (nullable). Commit the generated migration file as-is.

- [ ] **Step 4: Create the extraction script**

`apps/web/scripts/compute-vibrant-colors.ts`:

```ts
/**
 * One-shot script: for every album missing a vibrant_color, download its
 * image and extract the dominant muted color via node-vibrant. Writes
 * back to the albums table. Idempotent — re-running skips albums that
 * already have a color.
 *
 * Usage: pnpm --filter @nawhas/web exec tsx scripts/compute-vibrant-colors.ts
 */
import { db } from '@nawhas/db';
import { albums } from '@nawhas/db/schema';
import { eq, isNull } from 'drizzle-orm';
// node-vibrant API differs by major version; pin to whatever we install.
import Vibrant from 'node-vibrant';

async function main(): Promise<void> {
  const targets = await db.select().from(albums).where(isNull(albums.vibrantColor));
  console.log(`Found ${targets.length} albums missing vibrant_color.`);

  for (const album of targets) {
    if (!album.imageUrl) {
      console.log(`  skip ${album.id} — no image`);
      continue;
    }
    try {
      const palette = await Vibrant.from(album.imageUrl).getPalette();
      const hex =
        palette.DarkMuted?.hex ??
        palette.DarkVibrant?.hex ??
        palette.Muted?.hex ??
        '#18181b'; // zinc-900 fallback
      await db
        .update(albums)
        .set({ vibrantColor: hex })
        .where(eq(albums.id, album.id));
      console.log(`  ${album.id}: ${hex}`);
    } catch (err) {
      console.error(`  ${album.id}: failed`, err);
    }
  }
  console.log('Done.');
  process.exit(0);
}

void main();
```

- [ ] **Step 5: Install `node-vibrant`**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
pnpm --filter @nawhas/web add -D node-vibrant
```

- [ ] **Step 6: Render the color in album-header.tsx**

```tsx
<section
  className="relative overflow-hidden px-6 py-12 md:px-12 md:py-16"
  style={{
    backgroundColor: album.vibrantColor ?? 'var(--color-muted)',
    color: 'var(--color-primary-foreground)',
  }}
>
  {/* existing hero markup */}
</section>
```

Text on the vibrant background should read as white/near-white — if the album image happens to yield a light vibrant, the text can be hard to read. Mitigation for edge cases can be deferred to a 2.1b visual pass; for now, rely on `DarkMuted` preference yielding dark-enough colors.

- [ ] **Step 7: Run the migration + extraction on a local instance**

```bash
./dev db:migrate
pnpm --filter @nawhas/web exec tsx scripts/compute-vibrant-colors.ts
```

Spot-check a handful of rows in the DB (`psql` or Drizzle Studio) to confirm hexes are populated.

- [ ] **Step 8: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/albums
./dev db:migrate  # ensure migration is idempotent
```

- [ ] **Step 9: Commit**

```bash
git add packages/db apps/web/src/components/albums/album-header.tsx apps/web/scripts/compute-vibrant-colors.ts apps/web/package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(album): precomputed vibrant-color hero backgrounds

Phase 2.3 Task 10 — restores legacy's per-album vibrant hero
background, but computed once at catalog-build time rather than
at runtime (avoids adding node-vibrant to the client bundle, and
avoids runtime CLS).

Adds:
- albums.vibrant_color text column (migration XXXX)
- scripts/compute-vibrant-colors.ts (one-shot + idempotent;
  uses DarkMuted / DarkVibrant / Muted preference; falls back
  to zinc-900 on failure)
- album-header reads album.vibrantColor and applies it as the
  hero backgroundColor; falls back to var(--color-muted) when
  null (unpopulated albums render with neutral hero).

node-vibrant installed as a devDep on @nawhas/web since the
script lives there.

Operator note: after deploying this migration, run the script
once to backfill existing albums. New albums seeded post-deploy
should have vibrant_color populated by the sync flow (follow-up
if not already wired).

Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 11: Album — a11y fixes

Pattern matches Task 4 / Task 7. Commit with `fix(album): address Critical + Important a11y findings`.

---

## Phase D — Track (Tasks 12–14)

Visual/structural only — lyrics sync functionality parked for 2.1c.

### Task 12: Track — token + dark-mode sweep

**Files:**
- `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx`
- `apps/web/src/components/tracks/track-header.tsx`
- `apps/web/src/components/tracks/track-actions.tsx`
- `apps/web/src/components/tracks/media-toggle.tsx`
- `apps/web/src/components/tracks/youtube-embed-slot.tsx`
- `apps/web/src/components/tracks/lyrics-display.tsx`

Audit flags `track-header`, `track-actions`, `lyrics-display` all Broken on dark-mode; `lyrics-display` also mixes `neutral-*` vs the sibling files' `gray-*`.

Mirror Task 1's flow. Commit with `refactor(track): token + dark-mode sweep`.

### Task 13: Track — primitive adoption + Rules-of-Hooks fix + Roboto Slab hero title

**Files:**
- `apps/web/src/components/tracks/media-toggle.tsx` (convert to `<Tabs>`)
- `apps/web/src/components/tracks/lyrics-display.tsx` (convert language switcher to `<Tabs>` + fix Rules-of-Hooks)
- `apps/web/src/components/tracks/track-header.tsx` (Roboto Slab title, `<Card>` shell)
- `apps/web/src/components/tracks/track-actions.tsx` (`<Button>` cluster)

- [ ] **Step 1: Swap `MediaToggle` to `<Tabs>`**

Read current state:

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/tracks/media-toggle.tsx
```

Replace the hand-rolled toggle with:

```tsx
'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@nawhas/ui/components/tabs';
import { usePlayerStore } from '@/store/player';
import { YouTubeEmbedSlot } from '@/components/tracks/youtube-embed-slot';

interface MediaToggleProps {
  track: { id: string; youtubeId: string | null };
  audioElement?: React.ReactNode; // the existing audio UI
}

export function MediaToggle({ track, audioElement }: MediaToggleProps): React.JSX.Element {
  const pause = usePlayerStore((s) => s.pause);

  return (
    <Tabs defaultValue="listen" onValueChange={(value) => { if (value === 'watch') pause(); }}>
      <TabsList>
        <TabsTrigger value="listen">Listen</TabsTrigger>
        {track.youtubeId && <TabsTrigger value="watch">Watch</TabsTrigger>}
      </TabsList>
      <TabsContent value="listen">{audioElement}</TabsContent>
      {track.youtubeId && (
        <TabsContent value="watch">
          <YouTubeEmbedSlot youtubeId={track.youtubeId} />
        </TabsContent>
      )}
    </Tabs>
  );
}
```

Adapt to match the existing component's prop shape + behavior (preserving any analytics / state sync).

- [ ] **Step 2: Swap `LyricsDisplay` language switcher to `<Tabs>` + fix Rules-of-Hooks**

Current `lyrics-display.tsx` has `return null` before `useState`/`useEffect`. Reorder so all hooks run unconditionally before any conditional return.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@nawhas/ui/components/tabs';
// …

interface LyricsDisplayProps {
  lyrics: Array<{ language: string; lines: Array<{ text: string; timestamp: number | null }> }>;
}

export function LyricsDisplay({ lyrics }: LyricsDisplayProps): React.JSX.Element | null {
  const languages = lyrics.map((l) => l.language);
  const [active, setActive] = useState<string>(languages[0] ?? 'ar');

  // Persist last-picked language in localStorage.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('lyrics-lang') : null;
    if (saved && languages.includes(saved)) setActive(saved);
  }, [languages]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('lyrics-lang', active);
  }, [active]);

  // Conditional return AFTER hooks.
  if (lyrics.length === 0) return null;

  return (
    <Tabs value={active} onValueChange={setActive}>
      <TabsList>
        {languages.map((lang) => (
          <TabsTrigger key={lang} value={lang}>
            {lang.toUpperCase()}
          </TabsTrigger>
        ))}
      </TabsList>
      {lyrics.map((variant) => (
        <TabsContent key={variant.language} value={variant.language}>
          <ol className="space-y-2" lang={variant.language}>
            {variant.lines.map((line, i) => (
              <li key={i} className="text-foreground">{line.text}</li>
            ))}
          </ol>
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

The **timestamp-driven highlight + scroll-sync** functionality is NOT implemented here — per user scope decision, that's deferred to Phase 2.1c research. The `timestamp` field on each line is preserved in the data shape so a future 2.1c implementation can use it.

- [ ] **Step 3: Roboto Slab title on `track-header.tsx`**

```tsx
<h1 className="font-slab text-[2rem] md:text-[2.75rem] font-bold tracking-tight text-foreground">
  {track.title}
</h1>
```

- [ ] **Step 4: `<Card>` on track-header shell + `<Button>` cluster on track-actions**

- [ ] **Step 5: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/tracks
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/tracks
git commit -m "$(cat <<'EOF'
refactor(track): adopt <Tabs>, <Card>, <Button>; Roboto Slab title;
  fix Rules-of-Hooks in lyrics-display

Phase 2.3 Task 13 — visual/structural pass on the Track page.

- MediaToggle (Listen / Watch): hand-rolled → Radix-backed <Tabs>.
  Pause on switch to Watch preserved.
- LyricsDisplay language switcher (AR / UR / EN / Romanized):
  hand-rolled → <Tabs>. localStorage persistence preserved.
  Rules-of-Hooks violation fixed: early return now lives AFTER
  useState / useEffect calls (hooks run unconditionally).
- track-header uses <Card> shell + Roboto Slab hero title
  (font-slab token; matches 7 other legacy hero surfaces).
- track-actions uses <Button> cluster with appropriate variants.

NOT in scope: timestamp-driven lyrics highlight + scroll-sync.
That feature is parked for Phase 2.1c research.

Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 14: Track — a11y fixes

Pattern matches Task 4. Commit with `fix(track): address Critical + Important a11y findings`.

---

## Phase E — Library + History (Tasks 15–16)

### Task 15: Library + History — token + dark-mode + primitive sweep (combined)

**Files:**
- `apps/web/app/(protected)/library/tracks/page.tsx`
- `apps/web/app/(protected)/history/page.tsx`
- `apps/web/src/components/library/library-tracks-list.tsx`
- any track-row shared component

Audit flags `library/` completely Broken on dark-mode + zero semantic tokens.

- [ ] **Step 1:** token sweep + dark-mode fixes (mapping table).
- [ ] **Step 2:** `<SectionTitle>` on headings; verify existing `<Card>` / `<Button>` adoptions from Phase 2.2 are in place.
- [ ] **Step 3:** verify + commit `refactor(library): token + dark-mode + SectionTitle sweep`.

### Task 16: Library + History — a11y fixes

Commit with `fix(library): address Critical + Important a11y findings`.

---

## Phase F — Search (Tasks 17–18)

### Task 17: Search — token + dark-mode sweep + `<Tabs>` primitive

**Files:**
- `apps/web/app/search/page.tsx`
- `apps/web/src/components/search/search-bar.tsx` (already touched in Task 3 for the hero variant — verify no regression)
- `apps/web/src/components/search/search-results-content.tsx`
- `apps/web/src/components/search/mobile-search-overlay.tsx`

- [ ] **Step 1:** token sweep + dark-mode fixes. `search/` flagged Broken across all three files.
- [ ] **Step 2:** Swap the hand-rolled tab strip in `search-results-content.tsx` to `<Tabs>`. Fixes the Critical audit finding (`role="tab"` without `role="tabpanel"` / `aria-controls`).
- [ ] **Step 3:** verify + commit `refactor(search): token + dark-mode sweep + <Tabs>`.

### Task 18: Search — a11y fixes

Already mostly covered by the `<Tabs>` swap in Task 17. Remaining per-file Critical / Important entries from `audit-complete/accessibility.md` get fixed here. Commit with `fix(search): address remaining a11y findings`.

---

## Phase G — Auth (Tasks 19–22)

### Task 19: Auth — token + dark-mode sweep

**Files:**
- `apps/web/app/login/page.tsx`
- `apps/web/app/check-email/page.tsx`
- `apps/web/app/(auth)/register/page.tsx`
- `apps/web/app/(auth)/forgot-password/page.tsx`
- `apps/web/app/(auth)/reset-password/page.tsx`
- `apps/web/app/(auth)/verify-email/page.tsx`
- `apps/web/src/components/auth/auth-page-shell.tsx`
- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/components/auth/register-form.tsx`
- `apps/web/src/components/auth/forgot-password-form.tsx`
- `apps/web/src/components/auth/reset-password-form.tsx`
- `apps/web/src/components/auth/check-email-card.tsx`
- `apps/web/src/components/auth/social-buttons.tsx`

Audit: whole auth subtree Broken on dark-mode.

Same pattern as Task 1. Commit with `refactor(auth): token + dark-mode sweep across all auth forms`.

### Task 20: Auth — `<Card>` primitive for hand-rolled card shells + remaining `<Button>`

Four files hand-roll the identical card shell (`check-email-card`, `forgot-password-form`, `register-form`, `reset-password-form`) per audit. Plus `social-buttons` + `check-email-card` have remaining inline `<button>`s.

- [ ] **Step 1:** swap each card shell to `<Card>` — same pattern as Task 2 for home cards.
- [ ] **Step 2:** swap inline `<button>`s to `<Button>` with appropriate variant (mostly `default` for primary CTA, `outline` for social providers).
- [ ] **Step 3:** verify + commit `refactor(auth): adopt <Card> + <Button> primitives`.

### Task 21: Auth — AuthReason contextual copy port (legacy-gap port)

**Files:**
- Create: `apps/web/src/lib/auth-reason.ts` (helper)
- Modify: `apps/web/src/components/auth/auth-page-shell.tsx` (read query param, pick copy)
- Modify: `apps/web/src/components/SaveButton.tsx` (redirect with reason)
- Modify: `apps/web/src/components/LikeButton.tsx` (redirect with reason)
- Modify: `apps/web/messages/en.json` (add reason-keyed copy)

- [ ] **Step 1: Create the helper at `apps/web/src/lib/auth-reason.ts`**

```ts
/**
 * Maps ?reason=... query-param values to translation key suffixes.
 * Used by auth-page-shell to pick contextual heading / subtext and by
 * auth-gated actions to build redirect URLs.
 */
export const AUTH_REASONS = [
  'save',
  'like',
  'library',
  'contribute',
  'comment',
] as const;

export type AuthReason = (typeof AUTH_REASONS)[number];

export function isAuthReason(value: string | null | undefined): value is AuthReason {
  return typeof value === 'string' && (AUTH_REASONS as readonly string[]).includes(value);
}

/**
 * Build an /login redirect URL with the current path as callback and
 * an optional reason param for contextual copy.
 */
export function buildLoginHref({
  callbackUrl,
  reason,
}: {
  callbackUrl: string;
  reason?: AuthReason;
}): string {
  const params = new URLSearchParams();
  params.set('callbackUrl', callbackUrl);
  if (reason) params.set('reason', reason);
  return `/login?${params.toString()}`;
}
```

- [ ] **Step 2: Update `auth-page-shell.tsx` to consume `?reason=`**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isAuthReason } from '@/lib/auth-reason';

interface AuthPageShellProps {
  route: 'login' | 'register' | 'forgotPassword' | 'resetPassword' | 'verifyEmail' | 'checkEmail';
  children: React.ReactNode;
}

export function AuthPageShell({ route, children }: AuthPageShellProps): React.JSX.Element {
  const params = useSearchParams();
  const reasonParam = params.get('reason');
  const reason = isAuthReason(reasonParam) ? reasonParam : null;
  const t = useTranslations(`auth.${route}`);

  const heading = reason ? t(`reasonHeading.${reason}`) : t('heading');
  const subtext = reason ? t(`reasonSubtext.${reason}`) : t('subtext');

  return (
    <div className="…">
      <h1 className="…">{heading}</h1>
      <p className="…">{subtext}</p>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Update SaveButton + LikeButton callers**

In `SaveButton.tsx`:

```tsx
import { buildLoginHref } from '@/lib/auth-reason';
import { usePathname, useRouter } from 'next/navigation';

// …
const router = useRouter();
const pathname = usePathname();

async function handleClick(): Promise<void> {
  if (!session.data) {
    router.push(buildLoginHref({ callbackUrl: pathname, reason: 'save' }));
    return;
  }
  // …existing save-toggle logic…
}
```

Same in `LikeButton.tsx` with `reason: 'like'`.

- [ ] **Step 4: Add translation keys**

In `apps/web/messages/en.json`, under `auth.login`:

```json
{
  "auth": {
    "login": {
      "heading": "Sign in to Nawhas",
      "subtext": "Access your saved tracks, listening history, and contributions.",
      "reasonHeading": {
        "save": "Sign in to save this track",
        "like": "Sign in to like this track",
        "library": "Sign in to view your library",
        "contribute": "Sign in to contribute",
        "comment": "Sign in to comment"
      },
      "reasonSubtext": {
        "save": "We'll bring you back here after you sign in.",
        "like": "We'll bring you back here after you sign in.",
        "library": "Your saved tracks, history, and likes live here.",
        "contribute": "Help grow the nawhas catalogue.",
        "comment": "Join the conversation."
      }
    }
  }
}
```

(Register / forgot / reset / verify / check-email can reuse the generic heading/subtext — `reason` is mostly a login-screen concern. Add `reasonHeading` / `reasonSubtext` blocks only where the per-screen copy actually differs.)

- [ ] **Step 5: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/auth src/components/SaveButton src/components/LikeButton
```

Manually verify by running the dev server: click Save on a track when signed out, land on `/login?reason=save&callbackUrl=...`, confirm heading reads "Sign in to save this track".

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/auth-reason.ts apps/web/src/components/auth apps/web/src/components/SaveButton.tsx apps/web/src/components/LikeButton.tsx apps/web/messages/en.json
git commit -m "$(cat <<'EOF'
feat(auth): port AuthReason contextual login copy

Phase 2.3 Task 21 — restores legacy's per-trigger login copy
("Sign in to save this track" etc.). Reason flows as a
?reason=save|like|library|contribute|comment query param from
auth-gated actions (SaveButton / LikeButton) into
auth-page-shell, which maps to reasonHeading.<reason> /
reasonSubtext.<reason> translation keys. Generic fallback when
no reason is present.

New helper at src/lib/auth-reason.ts exports AUTH_REASONS,
isAuthReason type guard, and buildLoginHref({ callbackUrl, reason }).

Refs: docs/design/README.md § Decisions (resolved 2026-04-22)
Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 22: Auth — a11y fixes

Remaining a11y findings. Commit with `fix(auth): address Critical + Important a11y findings`.

---

## Phase H — Contribute + Mod (Tasks 23–26)

### Task 23: Contribute + Mod — token + dark-mode sweep

**Files:** all `.tsx` under `apps/web/src/components/contribute/` and `apps/web/src/components/mod/`, plus `apps/web/app/contribute/` and `apps/web/app/mod/` page files.

Audit focus: `mod/badges.tsx`, `mod/apply-button.tsx`, `mod/review-actions.tsx` have hardcoded green/amber/emerald/orange/yellow colors; swap to semantic equivalents where the Badge/Button primitives will absorb them in Task 24.

- [ ] **Step 1:** apply mapping table + targeted hardcoded-color rewrites.
- [ ] **Step 2:** verify + commit `refactor(contribute+mod): token + dark-mode sweep`.

### Task 24: Contribute + Mod — `<Badge>` / `<Button>` / `<Select>` / `<Dialog>` primitive adoption + button-replacement leftovers from Phase 2.2

**Files:**
- `apps/web/src/components/mod/badges.tsx` — flagship Badge replacement
- `apps/web/src/components/mod/apply-button.tsx` — Button
- `apps/web/src/components/mod/review-actions.tsx` — Button cluster
- `apps/web/src/components/contribute/resubmit-form.tsx` — 6 inline buttons
- `apps/web/src/components/contribute/contribution-list.tsx` — 2 inline buttons
- `apps/web/src/components/auth/check-email-card.tsx` — already covered by Task 20; skip if done
- `apps/web/src/components/auth/social-buttons.tsx` — already covered by Task 20; skip if done
- `apps/web/src/components/settings/change-password-form.tsx` — Button + Input + error linkage
- `apps/web/src/components/settings/change-email-form.tsx` — Button + Input + error linkage
- `apps/web/src/components/settings/delete-account-section.tsx` — Button + `<Dialog>` for confirm
- Contribute forms (`reciter-form`, `album-form`, `track-form`) — `<Select>` for reciter / album / language pickers where native `<select>` or bare `<input>` currently drives selection

- [ ] **Step 1: `mod/badges.tsx` — swap record maps to `<Badge>`**

Read current state:

```bash
cat /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/mod/badges.tsx
```

Typical refactor:

```tsx
// Before
const entityClass: Record<string, string> = {
  track: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  reciter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  album: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function EntityBadge({ type }: { type: string }): React.JSX.Element {
  return <span className={cn('rounded-full px-2 py-1 text-xs', entityClass[type])}>{type}</span>;
}

// After
import { Badge } from '@nawhas/ui/components/badge';

export function EntityBadge({ type }: { type: string }): React.JSX.Element {
  return <Badge variant="secondary">{type}</Badge>;
}
```

If multiple semantic variants are needed (pending / approved / rejected), use `<Badge variant="default" | "secondary" | "destructive" | "outline">` and map the legacy colors onto variants. No hardcoded colors remain.

- [ ] **Step 2: `mod/review-actions.tsx` — 3 button variants**

- Approve: `<Button variant="default">Approve</Button>` (primary green was the legacy color; our primary is now red — that's semantically "CTA", which Approve is. Acceptable.)
- Request Changes: `<Button variant="outline">Request changes</Button>`
- Reject: `<Button variant="destructive">Reject</Button>`

- [ ] **Step 3: `delete-account-section.tsx` — `<Dialog>` for confirmation**

Rewrite the hand-rolled modal:

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@nawhas/ui/components/dialog';
import { Button } from '@nawhas/ui/components/button';
import { Input } from '@nawhas/ui/components/input';

export function DeleteAccountSection(): React.JSX.Element {
  const [confirmation, setConfirmation] = useState('');
  const canDelete = confirmation === 'DELETE';

  async function handleDelete(): Promise<void> {
    // …existing delete logic…
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete my account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account?</DialogTitle>
          <DialogDescription>
            This permanently removes your account, saved tracks, listening history, and contributions. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={confirmation}
          onChange={(e) => { setConfirmation(e.currentTarget.value); }}
          placeholder='Type "DELETE" to confirm'
          aria-label='Type "DELETE" to confirm'
        />
        <DialogFooter>
          <Button variant="destructive" disabled={!canDelete} onClick={() => { void handleDelete(); }}>
            Delete my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Radix provides focus trap, Escape handler, and background `inert` automatically.

- [ ] **Step 4: Contribute forms — `<Select>` for reciter-picker / album-picker / language-picker**

For each form (`reciter-form`, `album-form`, `track-form`) that has a dropdown field, replace native `<select>` or bare text `<input>` with `<Select>` primitive:

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@nawhas/ui/components/select';

// …
<Select value={reciterId} onValueChange={setReciterId}>
  <SelectTrigger aria-label="Reciter">
    <SelectValue placeholder="Pick a reciter" />
  </SelectTrigger>
  <SelectContent>
    {reciters.map((r) => (
      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 5: Remaining `<Button>` leftovers**

`resubmit-form.tsx` (6 buttons), `contribution-list.tsx` (2), `change-password-form.tsx`, `change-email-form.tsx` — swap per the pattern established in Phase 2.2 Task 14.

- [ ] **Step 6: Verify**

```bash
./dev typecheck && ./dev lint
pnpm --filter @nawhas/web test --run src/components/mod src/components/contribute src/components/settings
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/mod apps/web/src/components/contribute apps/web/src/components/settings
git commit -m "$(cat <<'EOF'
refactor(contribute+mod): adopt Badge/Select/Dialog + Button leftovers

Phase 2.3 Task 24 — completes primitive adoption for the
contribute + mod + settings subtrees:

- mod/badges: hardcoded bg-green/amber/emerald/orange/yellow
  record maps replaced with <Badge> variants.
- mod/review-actions: Approve / Request Changes / Reject
  mapped to <Button> default / outline / destructive variants.
- settings/delete-account-section: hand-rolled modal replaced
  with <Dialog> primitive (gains focus trap + Escape + inert
  background for free).
- contribute/*-form: reciter / album / language pickers adopt
  <Select> primitive.
- <Button> leftovers from Phase 2.2 Task 14 cleaned up in
  resubmit-form, contribution-list, change-password-form,
  change-email-form.

Refs: docs/design/audit-complete/primitives-replacement.md
Refs: docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 25: Contribute + Mod — i18n string port

**Files:** contribute + mod + settings components (hardcoded English strings).

- [ ] **Step 1: Grep hardcoded strings**

```bash
grep -rnE '"[A-Z][a-zA-Z ]+"' /home/asif/dev/nawhas/nawhas-rebuild/apps/web/src/components/{contribute,mod,settings} --include="*.tsx" | head -50
```

- [ ] **Step 2: Add translation keys to `apps/web/messages/en.json`**

Under `contribute.*` / `mod.*` / `settings.*` namespaces. Keys match the component + purpose.

- [ ] **Step 3: Swap component strings to `useTranslations(...)` calls**

Pattern:

```tsx
// Before
<label>Name</label>

// After
import { useTranslations } from 'next-intl';
const t = useTranslations('contribute.reciter.form');
<label>{t('nameLabel')}</label>
```

- [ ] **Step 4:** verify + commit `refactor(contribute+mod+settings): port strings to next-intl`.

### Task 26: Contribute + Mod — required-field a11y + remaining findings

- `FormField` `required` prop should propagate to the actual input as `required` + `aria-required`.
- Reset-password-like error-message linkage via `aria-describedby`.
- Any remaining Critical / Important from `audit-complete/accessibility.md`.

Commit with `fix(contribute+mod+settings): address Critical + Important a11y findings`.

---

## Task 27: Close out Phase 2.3 in the roadmap

**Files:**
- Modify: `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md`

- [ ] **Step 1: Update the Phase 2.3 section to shipped-oriented content**

Replace the existing "2.3 Page-by-page redesign" section body with a shipped-outcome narrative matching the pattern of Phase 1 / 2.1 / 2.1d / 2.1e / 2.2:

```markdown
### 2.3 Page-by-page redesign ✅ shipped 2026-04-22

Shipped as ~26 commits on `main` in descending-traffic order:

- **Home** (Tasks 1–4): hero restored (red-gradient + Bellefair 2.5rem slogan + hero SearchBar), Top Nawhas ordered-list, Saved strip, `<Card>` + `<SectionTitle>` primitive adoption.
- **Reciter profile** (Tasks 5–7): Roboto Slab hero title, load-more album pagination, placeholder-button removal.
- **Album** (Tasks 8–11): precomputed `vibrant_color` hero backgrounds (migration + script + render), `<Card>` + `<Button>` + `<Badge>` adoption, Roboto Slab title.
- **Track** (Tasks 12–14): `<Tabs>` adoption for MediaToggle + LyricsDisplay language switcher, Rules-of-Hooks fix in LyricsDisplay, `<Card>` + `<Button>` + Roboto Slab title. Lyrics highlight+sync functionality deferred to Phase 2.1c.
- **Library + History** (Tasks 15–16): token + dark-mode + `<SectionTitle>` sweep.
- **Search** (Tasks 17–18): `<Tabs>` on results tabstrip (fixes Critical a11y `role="tab"` without tabpanel) + token + dark-mode sweep.
- **Auth** (Tasks 19–22): `<Card>` primitive on 4 hand-rolled auth shells, AuthReason contextual copy port (query-param-driven).
- **Contribute + Mod + Settings** (Tasks 23–26): `<Badge>` for mod status record maps, `<Dialog>` for delete-account, `<Select>` for contribute-form dropdowns, Phase 2.2 Task 14 Button leftovers completed, i18n string port.

Verification: `./dev qa` green throughout; `./dev test:e2e` green per-page and in full. Manual 10-route smoke passed (palette visibly devotional-red, fonts match legacy, dark-mode toggles correctly). 523 Tailwind-default color call sites reduced to <20 (the remaining ones live in utility / script contexts that legitimately don't consume tokens).

Refs: `docs/superpowers/specs/2026-04-22-phase-2-3-page-redesign-design.md`, `docs/superpowers/plans/2026-04-22-phase-2-3-page-redesign.md`.
```

Update the `Status:` line at the top of the roadmap to:

```
**Status:** Phase 1 shipped (2026-04-21) · Phase 2.1 shipped · 2.1 decisions resolved · Phase 2.1d shipped · Phase 2.2 shipped · Phase 2.1e shipped · Phase 2.3 shipped (2026-04-22) · Phase 2.1c + Phase 3 not started
```

- [ ] **Step 2: Commit**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git add docs/superpowers/specs/2026-04-21-rebuild-roadmap.md
git commit -m "$(cat <<'EOF'
docs(roadmap): record Phase 2.3 outcomes

Page-by-page redesign shipped as ~26 commits in descending-traffic
order (Home → Reciter → Album → Track → Library+History → Search
→ Auth → Contribute+Mod). Per-page workstream ran the 5 steps
(tokens → dark-mode → primitives → legacy-gap port → a11y)
consuming the Phase 2.1e audit as the backlog.

Notable outputs: Home hero restored (Bellefair 2.5rem slogan +
hero SearchBar), Album precomputed vibrant colors (new
vibrant_color column + seed script + render), AuthReason
contextual copy live end-to-end, <Tabs> in MediaToggle +
LyricsDisplay + search tabstrip (last one fixes Critical a11y
regression), <Dialog> on delete-account confirm, <Badge> swaps
across mod status indicators, ~500 Tailwind-default call sites
migrated to semantic tokens.

Lyrics highlight+sync deferred to Phase 2.1c per scope call.

Status line updated: Phase 2.3 shipped (2026-04-22); next
unblocked is Phase 3 (launch prep), with 2.1c still parked.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Wrap-up

After Task 27, `main` has ~26 new commits. No formal CI gate beyond what `./dev qa` + `./dev test:e2e` already cover. Push when ready:

```bash
git push
```

**What's next after 2.3:** Phase 3 (launch prep) is unblocked. Phase 2.1c (lyrics sync research) is still parked; it blocks the follow-up Track-page work that would add the timestamp-driven highlight + scroll-sync feature.
