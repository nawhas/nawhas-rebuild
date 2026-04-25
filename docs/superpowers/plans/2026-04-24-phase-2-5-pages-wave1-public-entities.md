# Phase 2.5 — Pages, Wave 1 (Public Entity Surfaces) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the six most user-visible public-entity routes — home, reciters listing, reciter profile, albums listing, album detail, track detail — onto the Phase B POC component substrate. Each route lands as one PR-sized commit on the `phase-2.5-poc-reskin` feature branch.

**Architecture:** Each route gets its existing section components restyled to consume POC literal tokens (`--accent`, `--bg`, `--surface`, `--text`, `--text-dim`, `--border`, `--card-bg`) and the Phase B primitives (`CoverArt`, `ReciterAvatar`, `TrackRow`, `Waveform`) from `@nawhas/ui`. The page-level `app/.../page.tsx` server components mostly stay intact — they're thin shells around section components that hold the actual restyle work. tRPC data shapes are unchanged.

**Tech Stack:** Next 16 / React 19 / Tailwind 4 / TypeScript 6 / `next-intl` / `@nawhas/ui` (Footer, CoverArt, ReciterAvatar, TrackRow, Waveform, hashToIndex). `next-themes` already wired with `data-theme` attribute + dark default from Phase A.

**Spec:** [`docs/superpowers/specs/2026-04-24-poc-design-port-design.md`](../specs/2026-04-24-poc-design-port-design.md), section "Pages" rows 1–6.
**Phase B substrate plan:** [`docs/superpowers/plans/2026-04-24-phase-2-5-foundation-and-components.md`](./2026-04-24-phase-2-5-foundation-and-components.md).
**Visual vocabulary:** [`docs/design/visual-vocabulary.md`](../../design/visual-vocabulary.md) — authoritative for any treatment a Phase B component doesn't cover.

**Branch:** `phase-2.5-poc-reskin` (already created; Phase A + B already shipped). Wave 1 commits land on top of `660cbba`.

**Wave 2 (later plan):** library/tracks, search, (auth)/*. **Wave 3 (later plan):** contribute/*, mod/*, profile/settings/history, error/not-found/loading.

---

## The token migration cheatsheet

The bulk of every restyle is a mechanical token swap. Apply these substitutions wherever they appear in the section components touched by this plan:

| Old (Phase 2.2 shadcn semantic) | New (POC literal) |
|---|---|
| `text-foreground` | `text-[var(--text)]` |
| `text-muted-foreground` | `text-[var(--text-dim)]` |
| `text-primary` | `text-[var(--accent)]` |
| `text-primary-foreground` | `text-white` (or keep shadcn — it resolves correctly) |
| `bg-background` | `bg-[var(--bg)]` |
| `bg-muted` | `bg-[var(--surface)]` |
| `bg-card` | `bg-[var(--card-bg)]` |
| `bg-primary` | `bg-[var(--accent)]` |
| `bg-primary/N` | `bg-[var(--accent)]/N` (preserves opacity utility) |
| `hover:bg-muted` | `hover:bg-[var(--surface)]` |
| `hover:bg-primary` | `hover:bg-[var(--accent-soft)]` |
| `border-border` | `border-[var(--border)]` |
| `border-input` | `border-[var(--border)]` |
| `divide-border` | `divide-[var(--border)]` |
| `ring-ring` | `ring-[var(--accent)]` |
| `ring-offset-background` | `ring-offset-[var(--bg)]` |

**Heading classes:** the existing `font-serif` utility now resolves to Fraunces (was Bellefair after Phase 2.2; was Roboto Slab via `font-slab` before that). Heading-class strings like `font-serif text-[2.5rem] font-bold tracking-tight` need NO migration — they already render in Fraunces after Phase A.

**Gradient/`<Card>` primitive replacements:** wherever the existing code uses the shadcn `<Card>` primitive AND a tinted-placeholder pattern (`getPlaceholderStyle` + `PLACEHOLDER_CLASSES`), replace BOTH with the POC primitive (`<CoverArt>` for albums/tracks, `<ReciterAvatar>` for reciters). The gradient now lives inside the POC primitive — strip the wrapping `<Card>` and the `getPlaceholderStyle` import unless another use remains in the file.

**What does NOT change:**
- tRPC procedures, data fetching, route shells.
- `next-intl` keys (we ADD where needed; never rewrite existing).
- Component prop types from `@nawhas/types`.
- Existing tests, except where assertions target a class/string that legitimately changed.
- E2E specs, except where selectors target a class/string that legitimately changed.

---

## File structure (per-row)

Each row touches a handful of files in a single PR. The general shape:

| Layer | File pattern | Restyle scope |
|---|---|---|
| Page shell | `apps/web/app/<route>/page.tsx` | Usually no change; thin tRPC wrapper. Touch only if the page needs new layout structure. |
| Section components | `apps/web/src/components/<domain>/*.tsx` | Bulk of the restyle work. Token migration + POC primitive adoption. |
| Card components | `apps/web/src/components/cards/{album,reciter}-card.tsx` | Replace gradient-placeholder + `<Card>` with `<CoverArt>` / `<ReciterAvatar>`. |
| Tests | `apps/web/src/components/<domain>/__tests__/*.tsx` | Update assertions where they target changed class strings or removed elements. Add new tests if visible new behaviour appears. |
| E2E | `apps/e2e/tests/<spec>.spec.ts` | Update selectors when the restyle removes/renames testable text or roles. |
| i18n | `apps/web/messages/en.json` | Add keys when a restyle introduces a new visible string. |

The `placeholder-color.ts` util becomes legacy as Phase C progresses. Don't delete it in Wave 1 — Wave 2/3 surfaces (e.g. profile avatars, search-result thumbnails) may still consume it. Audit + delete in the final Phase 2.5 cleanup commit.

---

## Pre-flight

### Task 0.1: Verify branch state and Phase B substrate

**Files:** none modified.

- [ ] **Step 1: Confirm branch + base commit**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git status
git log --oneline -5
```

Expected: on `phase-2.5-poc-reskin`, working tree clean (or only `docs/design/.audit-notes.md` untracked from session start), HEAD at `660cbba` (Phase B.4 visual-vocabulary doc + Lighthouse canary).

- [ ] **Step 2: Confirm Phase B exports are available**

```bash
grep -E "^export.*(Footer|CoverArt|ReciterAvatar|TrackRow|Waveform|hashToIndex)" packages/ui/src/index.ts
```

Expected: 6 lines, one for each ported primitive plus the hash util.

- [ ] **Step 3: Confirm baseline tests + types pass**

```bash
./dev qa
```

Expected: typecheck + lint + ~472 tests green (the baseline this plan restyles against).

---

## Row 1 — Home page (`/`)

**Files touched:**
- `apps/web/app/page.tsx` — comment-only fix (stale "Bellefair" line 33).
- `apps/web/src/components/home/hero-section.tsx` — comment fix (stale "Bellefair" line 10) + token migration.
- `apps/web/src/components/home/featured-reciters.tsx` — token migration; uses `ReciterCard` (changed in row task) + `SectionTitle`.
- `apps/web/src/components/home/recent-albums.tsx` — token migration; uses `AlbumCard`.
- `apps/web/src/components/home/popular-tracks.tsx` — token migration; uses `TrackRow` from `@nawhas/ui`.
- `apps/web/src/components/home/saved-strip.tsx` — token migration.
- `apps/web/src/components/home/top-nawhas-table.tsx` — token migration.
- `apps/web/src/components/cards/reciter-card.tsx` — replace gradient-placeholder + shadcn `<Card>` with `<ReciterAvatar>` from `@nawhas/ui`.
- `apps/web/src/components/cards/album-card.tsx` — replace gradient-placeholder + shadcn `<Card>` with `<CoverArt>`.

**Goal:** Every home-page section consumes POC tokens; the trending/saved/quotes/top reciters strips replace the current home strips visually; the entity cards (reciter + album) use the Phase B primitives. The hero CTA + serif heading are already POC-aligned (Fraunces) from Phase A — only token swaps and the Bellefair comment fix are needed there.

### Task 1.1: Read the existing home stack

- [ ] **Step 1: Read the page shell + 6 section components + 2 card components**

```bash
wc -l apps/web/app/page.tsx \
      apps/web/src/components/home/{hero-section,featured-reciters,recent-albums,popular-tracks,saved-strip,top-nawhas-table}.tsx \
      apps/web/src/components/cards/{album-card,reciter-card}.tsx
```

Expected: 9 files, total ~600 lines. Read each. Note where shadcn semantic tokens, the legacy `getPlaceholderStyle`/`PLACEHOLDER_CLASSES` util, and the shadcn `<Card>` primitive are used — those are the surgical targets for restyle.

### Task 1.2: Restyle ReciterCard to use ReciterAvatar

**Files:** `apps/web/src/components/cards/reciter-card.tsx`.

The card currently renders a manual gradient initials avatar (via `getPlaceholderStyle` + `PLACEHOLDER_CLASSES`) inside a shadcn `<Card>` primitive. Replace both with `<ReciterAvatar>` from `@nawhas/ui` plus a POC card surface.

- [ ] **Step 1: Replace the file contents**

```tsx
import Link from 'next/link';
import { ReciterAvatar } from '@nawhas/ui';
import type { ReciterDTO } from '@nawhas/types';

interface ReciterCardProps {
  reciter: ReciterDTO;
}

/**
 * Card displaying a reciter's avatar (or gradient initials fallback) and name.
 * Links to the reciter's profile page.
 *
 * Server Component — no interactivity required.
 */
export function ReciterCard({ reciter }: ReciterCardProps): React.JSX.Element {
  return (
    <Link
      href={`/reciters/${reciter.slug}`}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={`View ${reciter.name}'s profile`}
    >
      <ReciterAvatar name={reciter.name} size="md" />
      <span className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
        {reciter.name}
      </span>
    </Link>
  );
}
```

Notes:
- `ReciterDTO` does not currently include an `avatarUrl` field — the avatar always falls back to gradient. When the backend gets an `avatarUrl`, this component will pick it up automatically via `<ReciterAvatar avatarUrl={reciter.avatarUrl}>`.
- The hover label colour shifts to `--accent` for a subtle interactive cue; matches POC's "subtle red highlight on hover" pattern.

- [ ] **Step 2: Update the existing test if any**

```bash
ls apps/web/src/components/cards/__tests__/ 2>/dev/null
```

If there's a `reciter-card.test.tsx`, read it and update assertions that target the removed `getPlaceholderStyle` div or the shadcn `<Card>` primitive. If the test only asserts on the link href + visible name, no change needed.

If no test file exists, create `apps/web/src/components/cards/__tests__/reciter-card.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { ReciterCard } from '../reciter-card';

afterEach(() => cleanup());

const reciter = {
  id: 'r1',
  slug: 'ali-safdar',
  name: 'Ali Safdar',
} as Parameters<typeof ReciterCard>[0]['reciter'];

describe('ReciterCard', () => {
  it('links to the reciter profile route', () => {
    render(<ReciterCard reciter={reciter} />);
    const link = screen.getByRole('link', { name: /view ali safdar's profile/i });
    expect(link.getAttribute('href')).toBe('/reciters/ali-safdar');
  });

  it('renders the reciter name', () => {
    render(<ReciterCard reciter={reciter} />);
    expect(screen.getByText('Ali Safdar')).toBeDefined();
  });

  it('renders a ReciterAvatar with initials in the gradient fallback path', () => {
    render(<ReciterCard reciter={reciter} />);
    expect(screen.getByText('AS')).toBeDefined();
  });
});
```

- [ ] **Step 3: Run the test**

```bash
./dev test --filter reciter-card
```

Expected: 3 tests pass.

### Task 1.3: Restyle AlbumCard to use CoverArt

**Files:** `apps/web/src/components/cards/album-card.tsx`.

The card currently has two paths: real artwork via `<AppImage>` (next/image), or a placeholder SVG inside a tinted div. Replace BOTH with `<CoverArt>` which handles both internally.

- [ ] **Step 1: Replace the file contents**

```tsx
import Link from 'next/link';
import { CoverArt } from '@nawhas/ui';
import type { AlbumDTO } from '@nawhas/types';

interface AlbumCardProps {
  album: AlbumDTO;
  /** When true, mark this card as a candidate for above-the-fold image priority. Currently ignored — POC CoverArt uses an <img> with no priority knob; keep prop for caller-side compatibility. */
  priority?: boolean;
}

/**
 * Card displaying an album's cover art, title, and year.
 * Links to the album detail page.
 *
 * Server Component — no interactivity required.
 */
export function AlbumCard({ album }: AlbumCardProps): React.JSX.Element {
  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={`View album: ${album.title}${album.year ? `, ${album.year}` : ''}`}
    >
      <div className="aspect-square w-full overflow-hidden rounded-xl">
        <CoverArt
          slug={album.slug}
          artworkUrl={album.artworkUrl}
          label={album.title}
          size="md"
        />
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <span className="line-clamp-2 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
          {album.title}
        </span>
        {album.year && (
          <span className="text-xs text-[var(--text-faint)]">{album.year}</span>
        )}
      </div>
    </Link>
  );
}
```

Notes:
- `<CoverArt size="md">` renders 240×240; the wrapping `aspect-square overflow-hidden rounded-xl` lets it adapt to grid cells of varying widths via `object-cover` on the inner image (POC's `<img>` path) or via the gradient div filling the slot.
- `priority` becomes a no-op prop kept for caller compatibility — `<AlbumGrid>`/etc. pass it on the first row of a paginated list. Future enhancement: thread it into `<CoverArt>` if we ever add a priority hint there.
- Drops the `<AppImage>` (next/image) path; POC's `<img>` is intentional per Phase B.2 (off-domain S3/MinIO URLs would require Next.js `images.remotePatterns` config).

- [ ] **Step 2: Update / create the test**

If `apps/web/src/components/cards/__tests__/album-card.test.tsx` exists, update it; otherwise create:

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { AlbumCard } from '../album-card';

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

const album = {
  id: 'a1',
  slug: 'panjtan-pak',
  title: 'Panjtan Pak',
  year: 2020,
  artworkUrl: null,
  reciterId: 'r1',
  reciterName: 'Ali Safdar',
  reciterSlug: 'ali-safdar',
  trackCount: 8,
} as Parameters<typeof AlbumCard>[0]['album'];

describe('AlbumCard', () => {
  it('links to the album detail route', () => {
    render(<AlbumCard album={album} />);
    const link = screen.getByRole('link', { name: /view album: panjtan pak/i });
    expect(link.getAttribute('href')).toBe('/albums/panjtan-pak');
  });

  it('renders the album title', () => {
    render(<AlbumCard album={album} />);
    expect(screen.getByText('Panjtan Pak')).toBeDefined();
  });

  it('renders the album year when present', () => {
    render(<AlbumCard album={album} />);
    expect(screen.getByText('2020')).toBeDefined();
  });

  it('renders a gradient CoverArt fallback when artworkUrl is null', () => {
    const { container } = render(<AlbumCard album={album} />);
    expect(container.querySelector('[data-cover-variant]')).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run the test**

```bash
./dev test --filter album-card
```

Expected: 4 tests pass.

### Task 1.4: Restyle hero-section + fix stale Bellefair comment

**Files:** `apps/web/src/components/home/hero-section.tsx`, `apps/web/app/page.tsx`.

- [ ] **Step 1: Replace `apps/web/src/components/home/hero-section.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import { SearchBar } from '@/components/search/search-bar';

/**
 * Home-page hero section.
 *
 * POC-styled red-gradient hero with serif slogan + hero-variant SearchBar.
 * The `font-serif` utility resolves to Fraunces after Phase A; no per-element
 * font override needed.
 *
 * Server Component — renders translated strings via `getTranslations`.
 */
export async function HeroSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('home.hero');

  return (
    <section
      aria-label={t('ariaLabel')}
      className="relative isolate overflow-hidden bg-gradient-to-br from-[var(--accent)] via-[var(--accent-soft)] to-[#7e1f1c] px-6 py-16 text-white md:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-serif text-[2.5rem] font-medium leading-tight tracking-normal md:text-[3.5rem]">
          {t('slogan')}
        </h1>
        <p className="mt-4 text-lg text-white/85">
          {t('subtitle')}
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar variant="hero" />
        </div>
      </div>
    </section>
  );
}
```

Notes:
- Gradient anchored on POC `--accent` (`#c9302c`), `--accent-soft` (`#e8524e`), and a hand-picked deep-red bottom (`#7e1f1c`) for the diagonal depth POC homepages have. Falling all the way to `--accent` itself would be flat.
- Replaced `text-primary-foreground` (shadcn) with literal `text-white` since the gradient is always-dark, making `text-white` the unambiguous correct value across both themes. Same for `text-primary-foreground/85` → `text-white/85`.

- [ ] **Step 2: Fix stale Bellefair comment in `apps/web/app/page.tsx`**

Find this line near line 33:

```tsx
 *   1. HeroSection — red-gradient + Bellefair slogan + hero SearchBar.
```

Change to:

```tsx
 *   1. HeroSection — POC red-gradient + Fraunces slogan + hero SearchBar.
```

- [ ] **Step 3: Run typecheck**

```bash
./dev typecheck
```

Expected: 7/7 packages green.

### Task 1.5: Restyle the four list-grid section components

**Files:** `featured-reciters.tsx`, `recent-albums.tsx`, `popular-tracks.tsx`, `top-nawhas-table.tsx` — all in `apps/web/src/components/home/`.

These components share a shape: `<section aria-labelledby="X-heading"><SectionTitle id="X-heading">...</SectionTitle><ul|ol|grid>{items}</ul></section>`. The restyle is mostly token migration. The exception is `popular-tracks.tsx` and `top-nawhas-table.tsx` which currently render their own track rows — they should consume `<TrackRow>` from `@nawhas/ui` instead.

- [ ] **Step 1: Restyle `featured-reciters.tsx` (token migration only)**

The file already imports `SectionTitle` (a shadcn primitive that itself reads from `--color-foreground` — keep it; it implicitly restyles via Phase A's neutral ramp). The grid + `<ReciterCard>` consumers don't need changes; they pick up the new ReciterCard from Task 1.2 automatically.

Replace the file contents with:

```tsx
import type { ReciterDTO } from '@nawhas/types';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { ReciterCard } from '@/components/cards/reciter-card';

interface FeaturedRecitersProps {
  reciters: ReciterDTO[];
}

/**
 * Home page section showcasing featured reciters in a responsive grid.
 *
 * Server Component — pure presentation, no interactivity.
 */
export function FeaturedReciters({ reciters }: FeaturedRecitersProps): React.JSX.Element | null {
  if (reciters.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="featured-reciters-heading">
      <SectionTitle id="featured-reciters-heading">Featured Reciters</SectionTitle>
      <ul
        role="list"
        className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
      >
        {reciters.map((reciter) => (
          <li key={reciter.id}>
            <ReciterCard reciter={reciter} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

(Effectively unchanged — `ReciterCard` from Task 1.2 carries the restyle. Keep this file as-is if a `git diff` shows no change.)

- [ ] **Step 2: Restyle `recent-albums.tsx` (analogous pattern)**

Read the file. The structure mirrors `featured-reciters.tsx` but renders `<AlbumCard>`. Same approach: keep the shape, AlbumCard from Task 1.3 carries the restyle. If the file uses any explicit shadcn semantic tokens in container/spacing classes, apply the cheatsheet.

- [ ] **Step 3: Restyle `popular-tracks.tsx` to use TrackRow**

Read the file first:

```bash
cat apps/web/src/components/home/popular-tracks.tsx
```

If it currently renders custom track rows (table/list with title/reciter/duration cells), replace with `<TrackRow>` from `@nawhas/ui`. Each item maps to:

```tsx
<TrackRow
  slug={track.slug}
  title={track.title}
  reciter={track.reciter.name}
  reciterSlug={track.reciter.slug}
  poet={track.poet ?? undefined}
  duration={track.duration ?? 0}
  plays={track.playsCount}
/>
```

If `TrackDTO` doesn't have a `poet` or `playsCount` field, omit those props (TrackRow renders em-dash for missing fields). Confirm by reading `@nawhas/types`:

```bash
grep -A 30 "interface TrackDTO" packages/types/src/index.ts | head -40
```

Replace the rendered list:

```tsx
import type { TrackDTO } from '@nawhas/types';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { TrackRow } from '@nawhas/ui';

interface PopularTracksProps {
  tracks: TrackDTO[];
}

export function PopularTracks({ tracks }: PopularTracksProps): React.JSX.Element | null {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="popular-tracks-heading">
      <SectionTitle id="popular-tracks-heading">Popular Tracks</SectionTitle>
      <ul role="list" className="flex flex-col">
        {tracks.map((track) => (
          <li key={track.id}>
            <TrackRow
              slug={track.slug}
              title={track.title}
              reciter={track.reciterName}
              reciterSlug={track.reciterSlug}
              duration={track.duration ?? 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

(If the actual `TrackDTO` shape differs — e.g. nested `track.reciter.name` vs flat `track.reciterName` — adapt the props but keep the TrackRow contract. The key point is: stop hand-rolling track rows; let TrackRow be canonical.)

- [ ] **Step 4: Restyle `top-nawhas-table.tsx`**

This component is described as a numbered ordered list. Read it:

```bash
cat apps/web/src/components/home/top-nawhas-table.tsx
```

If it renders a custom row pattern (e.g. with rank numbers), keep the rank numbers as a leading column but render the rest via `<TrackRow>`. Pattern:

```tsx
<ol role="list" className="flex flex-col">
  {tracks.map((track, idx) => (
    <li key={track.id} className="flex items-center gap-4">
      <span className="w-8 text-center font-serif text-2xl text-[var(--text-faint)]">
        {idx + 1}
      </span>
      <div className="flex-1">
        <TrackRow
          slug={track.slug}
          title={track.title}
          reciter={track.reciterName}
          reciterSlug={track.reciterSlug}
          duration={track.duration ?? 0}
        />
      </div>
    </li>
  ))}
</ol>
```

Adapt to the actual data shape. Apply the cheatsheet for any remaining shadcn tokens.

- [ ] **Step 5: Restyle `saved-strip.tsx`**

This is a client component conditionally rendered for signed-in users with saves. Read it:

```bash
cat apps/web/src/components/home/saved-strip.tsx
```

Apply the cheatsheet's token migration. The component's data layer (useSession, tRPC `.savedTracks.list`) stays unchanged. If it uses `<Card>` shadcn primitive for individual saved items, replace with the same POC card surface pattern (`bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4`).

- [ ] **Step 6: Run home-page tests**

```bash
./dev test --filter home
```

Expected: any existing tests targeting changed elements / classes either pass unchanged or get assertion updates IN THIS COMMIT to match the restyle. Do not revert restyles to placate stale assertions.

- [ ] **Step 7: Manual smoke (skip if no browser available)**

Bring up dev server: `./dev up`. Open `http://localhost:3100`. Confirm:
- Hero gradient renders in POC red, Fraunces slogan, white text.
- Saved strip (when signed in) sits above featured strips.
- Featured reciters render as cards on `--card-bg` with `<ReciterAvatar>` initials.
- Recent albums render as cards on `--card-bg` with `<CoverArt>` (gradient or real artwork).
- Popular tracks render as `<TrackRow>` grid rows.
- Top Nawhas table renders as ranked list with serif numbers.

### Task 1.6: Commit Row 1

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/app/page.tsx \
        apps/web/src/components/home/hero-section.tsx \
        apps/web/src/components/home/featured-reciters.tsx \
        apps/web/src/components/home/recent-albums.tsx \
        apps/web/src/components/home/popular-tracks.tsx \
        apps/web/src/components/home/saved-strip.tsx \
        apps/web/src/components/home/top-nawhas-table.tsx \
        apps/web/src/components/cards/reciter-card.tsx \
        apps/web/src/components/cards/album-card.tsx \
        apps/web/src/components/cards/__tests__/

git commit -m "$(cat <<'EOF'
feat(home): re-skin home page to POC system

Phase 2.5 Wave 1 row 1. Restyles all six home-page section components
+ both entity card components onto POC literal tokens (--accent / --bg
/ --surface / --text / --border) and the Phase B primitives:

- HeroSection: POC red gradient anchored on --accent / --accent-soft
  + the Fraunces serif slogan (font-serif now resolves to Fraunces
  after Phase A).
- ReciterCard: replaces the manual gradient initials placeholder with
  <ReciterAvatar> from @nawhas/ui. Card surface now POC --card-bg
  with --border outline; hover label shifts to --accent.
- AlbumCard: replaces the dual-path placeholder (next/image OR tinted
  SVG) with <CoverArt> from @nawhas/ui, which handles both internally.
  priority prop kept as no-op for caller-side compatibility.
- PopularTracks + TopNawhasTable: stop hand-rolling track rows; consume
  the canonical <TrackRow> from @nawhas/ui. TopNawhasTable keeps its
  rank-number column as a leading slot.
- FeaturedReciters / RecentAlbums / SavedStrip: token migration via
  the Wave 1 cheatsheet (text-foreground → text-[var(--text)] etc.).

Also fixes the stale "Bellefair" comment in app/page.tsx (Phase A
swapped Bellefair for Fraunces but the comment survived).

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Row 2 — Reciters listing (`/reciters`)

**Files touched:**
- `apps/web/app/reciters/page.tsx` — page-level token migration; potentially add A–Z anchor nav surface.
- `apps/web/src/components/reciters/reciter-grid.tsx` — token migration; A–Z section grouping.
- `apps/web/src/components/cards/reciter-card.tsx` — already restyled in Row 1.

**Goal:** The reciters listing becomes a directory with A–Z anchor nav as the primary affordance. The existing "Load More" pagination stays but moves below the fold (after the A–Z sections). Each letter section renders the matching reciters in the existing card grid.

### Task 2.1: Read the existing reciters listing

- [ ] **Step 1: Read the page + grid + card test**

```bash
cat apps/web/app/reciters/page.tsx
cat apps/web/src/components/reciters/reciter-grid.tsx
ls apps/web/src/components/reciters/__tests__/
```

Note the data flow: `page.tsx` fetches the first page (24 reciters) via `caller.reciter.list({ limit: 24 })` and passes `{ items, nextCursor }` to `<ReciterGrid>` (client component) for "Load More" pagination.

### Task 2.2: Restyle the page heading + add A–Z anchor nav

**Files:** `apps/web/app/reciters/page.tsx`.

- [ ] **Step 1: Replace the page contents**

```tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { ReciterGrid } from '@/components/reciters/reciter-grid';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Reciters',
  description: 'Browse all nawha reciters in our comprehensive digital library.',
  canonical: `${siteUrl()}/reciters`,
});

const createCaller = createCallerFactory(appRouter);

/**
 * Reciters Listing Page
 *
 * Server Component — fetches the first page of reciters and passes initial
 * data + cursor to the ReciterGrid client component. Grid groups reciters
 * by leading letter and emits A–Z anchor nav as the primary affordance.
 */
export default async function RecitersPage(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const t = await getTranslations('common');
  const caller = createCaller({ db, session: null, user: null });
  const { items, nextCursor } = await caller.reciter.list({ limit: 24 });

  return (
    <div className="py-10">
      <Container>
        <h1 className="mb-8 font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)]">
          {t('reciters')}
        </h1>
        <ReciterGrid initialItems={items} initialCursor={nextCursor} />
      </Container>
    </div>
  );
}
```

Changes vs. previous:
- Heading: `text-2xl font-bold` → `font-serif text-[2.5rem] font-medium tracking-tight` (POC entity-page heading per visual vocabulary doc).
- `text-foreground` → `text-[var(--text)]`.

- [ ] **Step 2: Restyle `apps/web/src/components/reciters/reciter-grid.tsx` to add A–Z grouping**

```tsx
'use client';

import { useState, useTransition, useMemo } from 'react';
import type { ReciterDTO } from '@nawhas/types';
import { ReciterCard } from '@/components/cards/reciter-card';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreReciters } from '@/server/actions/reciters';

interface ReciterGridProps {
  initialItems: ReciterDTO[];
  initialCursor: string | null;
}

/**
 * Group reciters by their first letter (A–Z, '#' for non-alpha leading char).
 */
function groupByLetter(reciters: ReciterDTO[]): Map<string, ReciterDTO[]> {
  const groups = new Map<string, ReciterDTO[]>();
  for (const reciter of reciters) {
    const first = reciter.name.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    const list = groups.get(letter) ?? [];
    list.push(reciter);
    groups.set(letter, list);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Paginated reciter grid with A–Z anchor navigation.
 *
 * Client Component — manages accumulated items + cursor for "Load More".
 * Reciters are grouped client-side by leading letter; the nav scrolls to
 * the corresponding `<section id="letter-X">` block.
 */
export function ReciterGrid({ initialItems, initialCursor }: ReciterGridProps): React.JSX.Element {
  const [items, setItems] = useState<ReciterDTO[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => groupByLetter(items), [items]);
  const letters = Array.from(groups.keys());

  function handleLoadMore(): void {
    if (!cursor) return;
    startTransition(async () => {
      const result = await fetchMoreReciters(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <div className="flex flex-col gap-12">
      {/* A–Z anchor nav */}
      <nav
        aria-label="Reciters by letter"
        className="sticky top-16 z-10 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--header-bg)] px-4 py-2 backdrop-blur"
      >
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="rounded px-2 py-1 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {letter}
          </a>
        ))}
      </nav>

      {/* Sections by letter */}
      {letters.map((letter) => {
        const sectionReciters = groups.get(letter) ?? [];
        return (
          <section
            key={letter}
            id={`letter-${letter}`}
            aria-labelledby={`letter-${letter}-heading`}
            className="scroll-mt-24"
          >
            <h2
              id={`letter-${letter}-heading`}
              className="mb-4 font-serif text-2xl font-medium text-[var(--text)]"
            >
              {letter}
            </h2>
            <ul
              role="list"
              className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
              aria-label={`Reciters starting with ${letter}`}
            >
              {sectionReciters.map((reciter) => (
                <li key={reciter.id}>
                  <ReciterCard reciter={reciter} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Load More — sits below the alpha sections */}
      {cursor !== null && (
        <div className="mt-4 flex justify-center">
          <LoadMore onLoadMore={handleLoadMore} isLoading={isPending} />
        </div>
      )}
    </div>
  );
}
```

Notes:
- `sticky top-16 z-10` floats the A–Z nav under the global header (z-40) and below the player bar (z-50). `top-16` sits below the 64px header.
- `scroll-mt-24` on each section ensures the anchor scroll target accounts for the sticky nav height.
- The `'#'` letter group catches names starting with non-alpha chars (e.g. transliterations with accent marks).
- "Load More" stays — when invoked, new reciters get appended to `items` and re-grouped client-side, so the new entries land in their right letter section automatically.

- [ ] **Step 3: Update / add tests for `reciter-grid.tsx`**

Look at existing tests:

```bash
ls apps/web/src/components/reciters/__tests__/
```

If `reciter-grid.test.tsx` exists, add new test cases:

```tsx
it('renders A–Z anchor nav with one link per occupied letter', () => {
  render(<ReciterGrid initialItems={[
    { id: '1', slug: 'a-x', name: 'Ali Safdar' } as ReciterDTO,
    { id: '2', slug: 'b-y', name: 'Bashir' } as ReciterDTO,
  ]} initialCursor={null} />);
  const nav = screen.getByRole('navigation', { name: /reciters by letter/i });
  expect(nav).toBeDefined();
  expect(screen.getByRole('link', { name: 'A' })).toBeDefined();
  expect(screen.getByRole('link', { name: 'B' })).toBeDefined();
});

it('groups non-alpha names under #', () => {
  render(<ReciterGrid initialItems={[
    { id: '1', slug: 'unicode', name: '€uro Reciter' } as ReciterDTO,
  ]} initialCursor={null} />);
  expect(screen.getByRole('link', { name: '#' })).toBeDefined();
  expect(screen.getByRole('region', { name: /reciters starting with #/i })).toBeDefined();
});
```

(Adapt imports and existing setup pattern.)

- [ ] **Step 4: Run reciters tests**

```bash
./dev test --filter reciter
```

Expected: existing tests pass + 2 new A–Z nav tests pass.

### Task 2.3: Commit Row 2

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/app/reciters/page.tsx \
        apps/web/src/components/reciters/reciter-grid.tsx \
        apps/web/src/components/reciters/__tests__/

git commit -m "$(cat <<'EOF'
feat(reciters): re-skin reciters listing with A–Z anchor nav

Phase 2.5 Wave 1 row 2. Restyles /reciters to POC tokens and adds an
A–Z anchor navigation as the primary affordance per spec section
"Pages" row 2:

- Page heading: font-serif Fraunces 2.5rem per visual vocabulary doc
  (was text-2xl font-bold shadcn).
- ReciterGrid: groups reciters by leading letter (non-alpha → '#'),
  emits sticky A–Z nav (top-16, behind header z-40, ahead of body),
  and renders each letter as its own <section> with anchor + heading.
- Existing "Load More" pagination preserved; new entries get
  re-grouped into their letter sections client-side as they arrive.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Row 3 — Reciter profile (`/reciters/[slug]`)

**Files touched:**
- `apps/web/app/reciters/[slug]/page.tsx` — usually no change.
- `apps/web/src/components/reciters/reciter-header.tsx` — replace gradient placeholder with `<ReciterAvatar size="lg">`; token migration.
- `apps/web/src/components/reciters/reciter-discography.tsx` — token migration; preserve pagination.
- `apps/web/src/components/albums/load-more-albums.tsx` — token migration (sibling of reciter-discography).

**Goal:** Reciter profile gets a POC-styled header (large gradient avatar + serif name + bio) and the discography grid uses the now-restyled `<AlbumCard>` from Row 1.

### Task 3.1: Restyle reciter-header

**Files:** `apps/web/src/components/reciters/reciter-header.tsx`.

- [ ] **Step 1: Replace the file contents**

```tsx
import { ReciterAvatar } from '@nawhas/ui';
import type { ReciterWithAlbumsDTO } from '@nawhas/types';

interface ReciterHeaderProps {
  reciter: ReciterWithAlbumsDTO;
}

/**
 * Reciter profile header: large gradient avatar (or photo when present),
 * Fraunces serif name, album count metadata.
 *
 * When the backend gains description / country / verified-badge fields,
 * extend this component to render them — the visual vocabulary doc
 * specifies the slot below the album count.
 *
 * Server Component — no interactivity required.
 */
export function ReciterHeader({ reciter }: ReciterHeaderProps): React.JSX.Element {
  const albumCount = reciter.albums.length;
  const albumCountLabel =
    albumCount === 0 ? 'No albums yet' :
    albumCount === 1 ? '1 album' :
    `${albumCount} albums`;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center sm:flex-row sm:items-start sm:text-left">
      <ReciterAvatar name={reciter.name} size="lg" />
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)] md:text-[3.5rem]">
          {reciter.name}
        </h1>
        <p className="text-sm text-[var(--text-dim)]">{albumCountLabel}</p>
      </div>
    </div>
  );
}
```

Notes:
- `<ReciterAvatar size="lg">` renders 96×96. POC profile pages use a larger avatar than this; future extension can pass `size="xl"` if added to ReciterAvatar's size table.
- `font-bold` → `font-medium` per POC weight preference for serif headings.
- The future `description`, `country`, and `verified` fields are still null in `ReciterWithAlbumsDTO` (per Phase 2.4 W1 schema additions). When the page-rendered reciter has those, this component should be extended — not in this task.

- [ ] **Step 2: Update `reciter-header.test.tsx` if needed**

```bash
ls apps/web/src/components/reciters/__tests__/ | grep header
```

Update assertions that target the removed gradient placeholder div (look for `getPlaceholderStyle` or initials-text assertions). The test should still verify: H1 contains the name, album count text matches, ReciterAvatar renders.

### Task 3.2: Restyle reciter-discography + load-more-albums

**Files:** `apps/web/src/components/reciters/reciter-discography.tsx`, `apps/web/src/components/albums/load-more-albums.tsx`.

- [ ] **Step 1: Restyle `reciter-discography.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import type { AlbumDTO } from '@nawhas/types';
import { LoadMoreAlbums } from '@/components/albums/load-more-albums';

interface ReciterDiscographyProps {
  reciterSlug: string;
  initialAlbums: AlbumDTO[];
  initialCursor: string | null;
}

/**
 * Reciter discography section — paginated album grid.
 *
 * Server Component — renders heading + delegates the grid to LoadMoreAlbums.
 */
export async function ReciterDiscography({
  reciterSlug,
  initialAlbums,
  initialCursor,
}: ReciterDiscographyProps): Promise<React.JSX.Element> {
  const t = await getTranslations('reciter.discography');

  return (
    <section aria-labelledby="discography-heading">
      <h2
        id="discography-heading"
        className="mb-6 font-serif text-2xl font-medium text-[var(--text)]"
      >
        {t('heading')}
      </h2>

      {initialAlbums.length === 0 ? (
        <p className="text-[var(--text-dim)]">{t('empty')}</p>
      ) : (
        <LoadMoreAlbums
          reciterSlug={reciterSlug}
          initialAlbums={initialAlbums}
          initialCursor={initialCursor}
        />
      )}
    </section>
  );
}
```

(Replaces shadcn `<SectionTitle>` with a raw `<h2>` so the heading can adopt POC serif styling. SectionTitle is still used elsewhere — this is a per-page choice, not a global swap.)

- [ ] **Step 2: Restyle `load-more-albums.tsx`**

Read it first:

```bash
cat apps/web/src/components/albums/load-more-albums.tsx
```

Apply the cheatsheet's token migration. The grid is likely already using `<AlbumCard>` (which Row 1 restyled). The "Load More" button should pick up `--accent` styling from `LoadMore` primitive (verify by reading `apps/web/src/components/pagination/load-more.tsx` and applying the cheatsheet there too if needed).

- [ ] **Step 3: Run reciter + album tests**

```bash
./dev test --filter "reciter|album"
```

Expected: green.

### Task 3.3: Commit Row 3

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/src/components/reciters/reciter-header.tsx \
        apps/web/src/components/reciters/reciter-discography.tsx \
        apps/web/src/components/albums/load-more-albums.tsx \
        apps/web/src/components/reciters/__tests__/ \
        apps/web/src/components/pagination/load-more.tsx 2>/dev/null

git commit -m "$(cat <<'EOF'
feat(reciter): re-skin reciter profile to POC system

Phase 2.5 Wave 1 row 3. Restyles /reciters/[slug] header and
discography to POC tokens and primitives:

- ReciterHeader: large <ReciterAvatar size="lg"> replaces the manual
  initials placeholder; Fraunces serif name (font-medium, not -bold)
  matches POC entity-page typography. Album-count metadata in
  --text-dim. Future description/country/verified fields can be added
  in the same slot when the backend exposes them.
- ReciterDiscography: SectionTitle primitive swapped for a raw <h2>
  with POC serif sizing. Empty-state copy in --text-dim.
- LoadMoreAlbums: token migration via the Wave 1 cheatsheet.

The album grid auto-picks up the restyled AlbumCard from Wave 1
row 1, so the discography is now visually coherent with the home
recent-albums strip.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Row 4 — Albums listing (`/albums`)

**Files touched:**
- `apps/web/app/albums/page.tsx` — heading restyle (mirror of Row 2's reciters page).
- `apps/web/src/components/albums/album-grid.tsx` — token migration.

**Goal:** Albums listing matches the reciters listing visually (same heading style, same Container) but without A–Z grouping (albums sort by recency, not alpha). Filter bar UX comes from Wave 2 (search restyle); for Wave 1 the listing is just a paginated grid.

### Task 4.1: Restyle the page heading + grid

**Files:** `apps/web/app/albums/page.tsx`, `apps/web/src/components/albums/album-grid.tsx`.

- [ ] **Step 1: Replace `apps/web/app/albums/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { AlbumGrid } from '@/components/albums/album-grid';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Albums',
  description: 'Browse all nawha albums in our comprehensive digital library.',
  canonical: `${siteUrl()}/albums`,
});

const createCaller = createCallerFactory(appRouter);

export default async function AlbumsPage(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const t = await getTranslations('common');
  const caller = createCaller({ db, session: null, user: null });
  const { items, nextCursor } = await caller.album.list({ limit: 24 });

  return (
    <div className="py-10">
      <Container>
        <h1 className="mb-8 font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)]">
          {t('albums')}
        </h1>
        <AlbumGrid initialItems={items} initialCursor={nextCursor} />
      </Container>
    </div>
  );
}
```

- [ ] **Step 2: Restyle `apps/web/src/components/albums/album-grid.tsx`**

Read it first:

```bash
cat apps/web/src/components/albums/album-grid.tsx
```

Apply the cheatsheet's token migration. The grid renders `<AlbumCard>` (already restyled in Row 1). The container/spacing classes are likely already structurally fine — only token strings need updating. Common changes:
- `text-foreground` → `text-[var(--text)]`
- `text-muted-foreground` → `text-[var(--text-dim)]`
- Empty-state copy classes follow the visual vocabulary (centered, `--text-dim`).

- [ ] **Step 3: Run tests**

```bash
./dev test --filter album
```

Expected: green.

### Task 4.2: Commit Row 4

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/app/albums/page.tsx \
        apps/web/src/components/albums/album-grid.tsx

git commit -m "$(cat <<'EOF'
feat(albums): re-skin albums listing to POC system

Phase 2.5 Wave 1 row 4. Restyles /albums to match the POC entity-
listing pattern established in row 2:

- Page heading: font-serif Fraunces 2.5rem (was text-2xl font-bold).
- AlbumGrid: token migration via Wave 1 cheatsheet; the grid renders
  the AlbumCard restyled in row 1, so visual coherence with the home
  recent-albums strip and reciter profile discography is automatic.

No filter bar in this row — that lands in Wave 2's /search restyle
(which the spec scopes for cross-route filter UX).

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Row 5 — Album detail (`/albums/[slug]`)

**Files touched:**
- `apps/web/app/albums/[slug]/page.tsx` — usually no change.
- `apps/web/src/components/albums/album-header.tsx` — replace dual-path placeholder + complex vibrant theming with `<CoverArt size="lg">`; simplify hero treatment per spec.
- `apps/web/src/components/albums/track-list.tsx` — replace `<TrackListItem>` per-row with `<TrackRow>` from `@nawhas/ui`.
- `apps/web/src/components/albums/track-list-item.tsx` — DEPRECATED (replaced by TrackRow). Delete after confirming no external references.

**Goal:** Album detail page has a POC-styled hero (large CoverArt + serif title + reciter link + metadata) and the track list uses the canonical `<TrackRow>`. The legacy per-album vibrant-color theming is removed (spec section "What gets thrown away" excludes per-album hero theming as a non-goal).

### Task 5.1: Restyle album-header

**Files:** `apps/web/src/components/albums/album-header.tsx`.

- [ ] **Step 1: Replace the file contents**

```tsx
import Link from 'next/link';
import { CoverArt } from '@nawhas/ui';
import type { AlbumDetailDTO } from '@nawhas/types';

interface AlbumHeaderProps {
  album: AlbumDetailDTO;
}

/**
 * Album detail header: large cover art, Fraunces title, linked reciter,
 * year, track count.
 *
 * The legacy per-album vibrant-color hero theming (DarkMuted extracted via
 * node-vibrant) is removed in favour of POC's flat surface. See spec
 * section "What gets thrown away" — per-album hero theming was legacy-only
 * and is not in the rebuild's POC direction.
 *
 * Server Component — no interactivity required.
 */
export function AlbumHeader({ album }: AlbumHeaderProps): React.JSX.Element {
  const trackCount = album.tracks.length;
  const trackCountLabel =
    trackCount === 0 ? 'No tracks' :
    trackCount === 1 ? '1 track' :
    `${trackCount} tracks`;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 sm:flex-row sm:items-start">
      <div className="shrink-0">
        <CoverArt
          slug={album.slug}
          artworkUrl={album.artworkUrl}
          label={album.title}
          size="lg"
        />
      </div>
      <div className="flex flex-col gap-3 text-center sm:text-left">
        <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)] md:text-[3.5rem]">
          {album.title}
        </h1>
        <Link
          href={`/reciters/${album.reciterSlug}`}
          className="text-base font-medium text-[var(--text-dim)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded"
        >
          {album.reciterName}
        </Link>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-[var(--text-faint)] sm:justify-start">
          {album.year && <span>{album.year}</span>}
          <span>{trackCountLabel}</span>
        </div>
      </div>
    </div>
  );
}
```

Notes:
- `vibrantColor` prop on `AlbumDetailDTO` is now unused at the component level. The DTO field stays (don't churn the schema in a UI restyle); future cleanup can drop it after all consumers stop reading it.
- `<CoverArt size="lg">` renders 360×360. On mobile this stacks above the metadata; on desktop sits beside.

- [ ] **Step 2: Update `album-header.test.tsx` if needed**

Look for it in `apps/web/src/components/albums/__tests__/`. Update assertions targeting the removed vibrant-class strings or the `getPlaceholderStyle`/`AppImage` paths.

### Task 5.2: Replace TrackList row item with the canonical TrackRow

**Files:** `apps/web/src/components/albums/track-list.tsx`.

- [ ] **Step 1: Replace the file contents**

```tsx
import type { TrackDTO } from '@nawhas/types';
import { TrackRow } from '@nawhas/ui';

interface TrackListProps {
  tracks: TrackDTO[];
  reciterSlug: string;
  albumSlug: string;
}

/**
 * Ordered track list for the album detail page.
 *
 * Server Component — data is passed as props from the album page.
 * Each row renders the canonical <TrackRow> primitive. Legacy
 * track-list-item.tsx (per-row component with custom play/highlight
 * affordances) is deprecated in favour of the shared TrackRow.
 */
export function TrackList({ tracks, reciterSlug, albumSlug }: TrackListProps): React.JSX.Element {
  return (
    <section aria-labelledby="track-list-heading">
      <h2
        id="track-list-heading"
        className="mb-6 font-serif text-2xl font-medium text-[var(--text)]"
      >
        Tracks
      </h2>

      {tracks.length === 0 ? (
        <p className="text-[var(--text-dim)]">No tracks available yet.</p>
      ) : (
        <ol
          aria-label={`${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
          className="flex flex-col"
        >
          {tracks.map((track) => (
            <li key={track.id}>
              <TrackRow
                slug={track.slug}
                title={track.title}
                reciter="" /* hidden — context is the album header */
                reciterSlug={reciterSlug}
                duration={track.duration ?? 0}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
```

Notes:
- `reciter=""` is intentional — the reciter is already named in the album header above the list, so repeating it on every row is noise. TrackRow will render an empty link cell. (Alternative: extend TrackRow with a `hideReciter` prop. Not done here — a 5-column grid with one column empty is acceptable for the album-detail context. If visual layout is awkward in the smoke pass, file as a follow-up.)
- TrackRow links to `/track/${slug}` per its built-in href. The album-detail context's deeper hierarchical URL (`/reciters/X/albums/Y/tracks/Z`) is NOT what TrackRow emits. **This is a known divergence** — the rebuild has hierarchical track URLs but TrackRow emits the spec's flat URL. To preserve the current URL contract, either:
  - (a) Extend TrackRow with optional `href` override, OR
  - (b) Keep using the legacy `track-list-item.tsx` for album-detail and only adopt TrackRow on home/popular-tracks where a flat URL is acceptable.
  
  **Decision:** for Wave 1, take option (a). Add an optional `href` prop to `<TrackRow>` that, when present, overrides the default `/track/${slug}`. This is a small Phase B amendment; do it as part of Row 5 work.

- [ ] **Step 2: Amend `<TrackRow>` to accept an optional `href` prop**

Edit `packages/ui/src/components/track-row.tsx`:

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
  /** Override the default /track/[slug] href. Use when callers need hierarchical URLs (e.g. /reciters/X/albums/Y/tracks/Z). */
  href?: string;
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
  href,
}: TrackRowProps): React.JSX.Element {
  const titleHref = href ?? `/track/${slug}`;
  return (
    <div
      className="grid items-center gap-4 border-b border-[var(--border)] py-3 last:border-b-0"
      style={{ gridTemplateColumns: '1fr 180px 100px 80px 80px' }}
    >
      <Link
        href={titleHref}
        className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors"
      >
        {title}
      </Link>
      {reciter ? (
        <Link
          href={`/reciter/${reciterSlug}`}
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          {reciter}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="text-sm text-[var(--text-faint)]">{poet || '—'}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatDuration(duration)}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatPlays(plays)}</div>
    </div>
  );
}
```

Changes vs. Phase B.2:
- New optional `href` prop. Default behaviour unchanged.
- When `reciter` is empty string, render an `<span aria-hidden>` placeholder instead of a link to `/reciter/`. Keeps the grid columns aligned.

- [ ] **Step 3: Add a test for the new `href` override**

In `packages/ui/src/components/__tests__/track-row.test.tsx`, append:

```tsx
it('uses the override href when provided', () => {
  render(
    <TrackRow
      slug="kun-faya"
      title="Kun Faya"
      reciter="Ali Safdar"
      reciterSlug="ali-safdar"
      duration={245}
      href="/reciters/ali-safdar/albums/x/tracks/kun-faya"
    />,
  );
  const link = screen.getByRole('link', { name: 'Kun Faya' });
  expect(link.getAttribute('href')).toBe('/reciters/ali-safdar/albums/x/tracks/kun-faya');
});

it('renders an aria-hidden placeholder instead of a reciter link when reciter is empty', () => {
  const { container } = render(
    <TrackRow
      slug="x"
      title="X"
      reciter=""
      reciterSlug="y"
      duration={100}
    />,
  );
  // The aria-hidden span should be the second grid child (after the title link)
  const links = container.querySelectorAll('a');
  expect(links.length).toBe(1); // only the title link, no reciter link
});
```

- [ ] **Step 4: Update `track-list.tsx` to pass the hierarchical href**

```tsx
<TrackRow
  slug={track.slug}
  title={track.title}
  reciter=""
  reciterSlug={reciterSlug}
  duration={track.duration ?? 0}
  href={`/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${track.slug}`}
/>
```

- [ ] **Step 5: Delete the deprecated track-list-item.tsx**

```bash
grep -rn "track-list-item" apps/ packages/ 2>/dev/null | grep -v node_modules | grep -v ".next"
```

If the only consumer is `track-list.tsx` (now updated), delete the file:

```bash
git rm apps/web/src/components/albums/track-list-item.tsx
```

If there are other consumers (e.g. used in tests directly), leave it in place and flag for follow-up cleanup in Wave 3.

- [ ] **Step 6: Run tests**

```bash
./dev test --filter "track-row|album|track-list"
```

Expected: green. 6 → 8 TrackRow tests (+2 for href override + empty-reciter).

### Task 5.3: Commit Row 5

- [ ] **Step 1: Stage and commit**

```bash
git add packages/ui/src/components/track-row.tsx \
        packages/ui/src/components/__tests__/track-row.test.tsx \
        apps/web/src/components/albums/album-header.tsx \
        apps/web/src/components/albums/track-list.tsx \
        apps/web/src/components/albums/__tests__/ 2>/dev/null

# Stage the deletion if track-list-item.tsx was removed
git add -u apps/web/src/components/albums/

git commit -m "$(cat <<'EOF'
feat(albums): re-skin album detail to POC system + extend TrackRow

Phase 2.5 Wave 1 row 5. Restyles /albums/[slug] hero and track list
to POC tokens and primitives:

- AlbumHeader: <CoverArt size="lg"> replaces the dual-path placeholder
  (next/image + tinted SVG); flat POC card surface replaces the
  per-album vibrant-color hero theming (legacy-only, excluded from
  rebuild per spec "What gets thrown away"). Fraunces title.
- TrackList: replaces the per-page TrackListItem with the canonical
  <TrackRow> from @nawhas/ui. Empty reciter cell (album header already
  names the reciter); deprecated track-list-item.tsx deleted.
- TrackRow extension: optional `href` prop overrides the default
  /track/[slug] for callers using hierarchical URLs (e.g. album
  detail's /reciters/X/albums/Y/tracks/Z). Empty `reciter` value
  renders an aria-hidden placeholder to keep the grid aligned. Two
  new tests guard both behaviours.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Row 6 — Track detail (`/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]`)

**Files touched:**
- `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx` — minor restyle.
- `apps/web/src/components/tracks/track-header.tsx` — restyle to POC tokens.
- `apps/web/src/components/tracks/track-actions.tsx` — token migration.
- `apps/web/src/components/tracks/lyrics-display.tsx` — token migration; preserves multi-language tabs.
- `apps/web/src/components/tracks/media-toggle.tsx` — token migration.

**Goal:** Track detail page gets a POC header (serif title + reciter/album breadcrumbs), waveform visualization slot below the audio actions, and POC-styled lyrics panel. Per spec, lyrics highlight + scroll-sync stays parked. Waveform is decorative-only — onSeek wires to existing audio-engine seek when integration is straightforward; otherwise the click-to-seek prop is omitted (visualization-only).

### Task 6.1: Restyle track-header

**Files:** `apps/web/src/components/tracks/track-header.tsx`.

- [ ] **Step 1: Replace the file contents**

```tsx
import Link from 'next/link';
import type { TrackWithRelationsDTO } from '@nawhas/types';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface TrackHeaderProps {
  track: TrackWithRelationsDTO;
}

/**
 * Track detail header: Fraunces title, breadcrumb-style reciter / album
 * links, year + track number + duration metadata.
 *
 * Server Component.
 */
export function TrackHeader({ track }: TrackHeaderProps): React.JSX.Element {
  const linkClass =
    'font-medium text-[var(--text-dim)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded transition-colors';

  return (
    <header className="py-8">
      <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)] md:text-[3.5rem]">
        {track.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-faint)]">
        <Link href={`/reciters/${track.reciter.slug}`} className={linkClass}>
          {track.reciter.name}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href={`/albums/${track.album.slug}`} className={linkClass}>
          {track.album.title}
        </Link>

        {track.album.year != null && (
          <>
            <span aria-hidden="true">·</span>
            <span>{track.album.year}</span>
          </>
        )}

        {track.trackNumber != null && (
          <>
            <span aria-hidden="true">·</span>
            <span>Track {track.trackNumber}</span>
          </>
        )}

        {track.duration != null && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={`PT${Math.floor(track.duration / 60)}M${track.duration % 60}S`}>
              {formatDuration(track.duration)}
            </time>
          </>
        )}
      </div>
    </header>
  );
}
```

Changes:
- `font-bold` → `font-medium` for serif heading.
- Token migration on `text-foreground` / `text-muted-foreground` → `text-[var(--text)]` / `text-[var(--text-faint)]`.
- Link hover uses `--accent`.

### Task 6.2: Add Waveform to the track detail page

**Files:** `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx`.

- [ ] **Step 1: Read the page**

```bash
cat 'apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx'
```

- [ ] **Step 2: Add Waveform import + render**

In the page imports, add:

```tsx
import { Waveform } from '@nawhas/ui';
```

In the JSX, render `<Waveform>` between `TrackActions` (or the `MediaToggle`/`TrackDetailPlayButton` slot) and `LyricsDisplay`:

```tsx
<div className="mt-6">
  <Waveform
    slug={track.slug}
    durationSec={track.duration ?? 0}
  />
</div>
```

Notes:
- No `currentPercent` or `onSeek` wired — Waveform renders as a visual decoration. Wiring to the existing audio engine (Zustand `useAudio` store) requires resolving how the track-detail page knows whether *this* track is the one currently playing in the persistent PlayerBar. That's a non-trivial integration; ship the visual-only version first.
- Future enhancement (Wave 2 or its own commit): subscribe to `useAudio` state, derive `currentPercent` from `state.currentTime / state.duration` when `state.currentTrackId === track.id`, pass `onSeek={pct => seek(pct * state.duration / 100)}`. Out of scope here.

- [ ] **Step 3: Token-migrate `track-actions.tsx`, `lyrics-display.tsx`, `media-toggle.tsx`**

Read each, apply the cheatsheet:

```bash
cat apps/web/src/components/tracks/track-actions.tsx
cat apps/web/src/components/tracks/lyrics-display.tsx
cat apps/web/src/components/tracks/media-toggle.tsx
```

Token migration only. Preserve all behaviour (multi-language tabs, audio button wiring, YouTube embed toggle).

For `lyrics-display.tsx`: the existing language tabs use shadcn `<Tabs>` primitive — keep it; restyle by changing the trigger and content classes to use POC tokens. The `<ArabicText>` / `<UrduText>` typography components (added in Phase A's stale-comment fix commit) already render in the right RTL fonts via `[lang="ar"]` / `[lang="ur"]` selectors.

- [ ] **Step 4: Run tests**

```bash
./dev test --filter "track|lyrics|media"
```

Expected: green.

### Task 6.3: Commit Row 6

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/app/reciters/\[slug\]/albums/\[albumSlug\]/tracks/\[trackSlug\]/page.tsx \
        apps/web/src/components/tracks/track-header.tsx \
        apps/web/src/components/tracks/track-actions.tsx \
        apps/web/src/components/tracks/lyrics-display.tsx \
        apps/web/src/components/tracks/media-toggle.tsx \
        apps/web/src/components/tracks/__tests__/ 2>/dev/null

git commit -m "$(cat <<'EOF'
feat(track): re-skin track detail page to POC system + add Waveform

Phase 2.5 Wave 1 row 6. Restyles the track detail page to POC tokens
and introduces the Waveform visualization:

- TrackHeader: Fraunces 2.5rem font-medium title; --text-dim
  breadcrumb links with --accent hover; --text-faint metadata.
- Waveform: rendered between the audio actions and the lyrics panel
  as a visual-only decoration (no currentPercent / onSeek wired —
  audio-engine integration requires resolving "is this the playing
  track" state across PlayerBar and the track page; defer that to a
  separate commit).
- TrackActions / LyricsDisplay / MediaToggle: token migration via
  the Wave 1 cheatsheet. Lyrics tabs (ar/ur/en/transliteration)
  preserved; ArabicText / UrduText typography unchanged. Lyrics
  highlight + scroll-sync stays parked per spec.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## End-of-Wave QA

### Task 7.1: Full QA + smoke

- [ ] **Step 1: Full test suite**

```bash
./dev qa
```

Expected: typecheck + lint + all tests green. Test count delta from Wave 1: roughly +10 (3 ReciterCard + 4 AlbumCard + 2 ReciterGrid A–Z + 2 TrackRow href/empty-reciter, minus any test rewrites that net to 0 or -1).

- [ ] **Step 2: Run E2E**

```bash
./dev test:e2e --ci
```

Expected: every existing spec passes. If a spec's selector targets removed text or changed routing, update the spec in this commit (or as a separate small fix commit on the branch).

- [ ] **Step 3: Push branch**

```bash
git push origin phase-2.5-poc-reskin
```

- [ ] **Step 4: Hand off to Wave 2**

Wave 2 (separate plan, written next) covers:
- `/library/tracks` (saved-tracks list with POC filter-bar treatment)
- `/search` (Typesense-backed search restyle, extrapolating from POC's `/library` filter UX)
- `(auth)/*` (login, register, forgot-password, reset-password, verify-email, check-email)

Wave 2 should reuse all Wave 1 patterns (token cheatsheet, Phase B primitives, visual vocabulary doc).

---

## Self-review checklist

After implementing Wave 1, the implementer should be able to answer "yes" to all of:

1. **Spec coverage:** Are all 6 routes from the spec's "Pages" rows 1–6 covered by a commit on the branch?
2. **Token consistency:** Do `grep -rn "text-foreground\|text-muted-foreground\|bg-muted\|border-border" apps/web/src/components/{home,reciters,albums,cards,tracks}` return nothing? (Old shadcn semantic tokens fully migrated within Wave 1's scope.)
3. **Phase B primitive adoption:** Are `<CoverArt>`, `<ReciterAvatar>`, `<TrackRow>` consumed wherever entity cards / track rows are rendered in the touched files?
4. **No new shadcn `<Card>` usage** in the cards/ + home/ + reciters/ + albums/ + tracks/ components touched.
5. **Tests still green:** Every commit on the branch passes `./dev qa`.
6. **No accidental scope creep:** No Wave 2/3 routes touched (library, search, auth, contribute, mod, profile, settings, history, error boundaries).
7. **Stale Bellefair comments fixed:** `apps/web/app/page.tsx:33` and `apps/web/src/components/home/hero-section.tsx:10` no longer reference Bellefair.
8. **TrackRow `href` override**: tested, used by TrackList for hierarchical URLs.

For the plan as a whole:

- **Placeholder scan:** No "TBD", no "TODO", no "implement later". Code blocks are complete in every code step.
- **Type consistency:** Component prop names match between definitions and consumers (`ReciterAvatar.name`, `CoverArt.slug + artworkUrl + label`, `TrackRow.href`).
- **No imaginary symbols:** All imports are either in `@nawhas/ui` (Phase B exports) or `@/components/...` (existing app code).

## Notes on Wave 2 + 3

**Wave 2 — Discovery + auth surfaces** will:
- Restyle `/library/tracks` saved-tracks list using the same TrackRow + cheatsheet pattern as PopularTracks (Row 1 task 1.5).
- Restyle `/search` (Typesense-backed) with a filter bar borrowed from POC's `/library` treatment (decided in spec section "Pages" row 8).
- Restyle the 6 `(auth)/*` routes using the visual vocabulary doc's "Auth surfaces" section (centered card, max-width 400px, accent CTA).

**Wave 3 — Contributor + moderator + protected + boundaries** will:
- Restyle the contribute forms (`/contribute`, `/contribute/{reciter,album,track}`, `/contribute/edit/*`) — preserving Phase 2.4 W1 form components.
- Restyle the mod surfaces (`/mod`, `/mod/queue`, `/mod/submissions/[id]`, `/mod/audit`, `/mod/users`).
- Restyle profile / settings / library/history.
- Restyle error.tsx, not-found.tsx, every loading.tsx.
- Audit-and-delete the legacy `placeholder-color.ts` util once no consumers remain.
