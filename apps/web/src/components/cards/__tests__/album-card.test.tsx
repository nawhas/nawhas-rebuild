import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// CoverArt (from @nawhas/ui) calls useTranslations('coverArt'). The web-app
// vitest.setup.ts mocks next-intl globally for imports resolved from this
// package, but the @nawhas/ui copy resolves through a different module URL
// in pnpm-workspace test runs, so the mock doesn't catch. We stub CoverArt
// directly for AlbumCard's render tests; the real CoverArt has its own
// render coverage in packages/ui.
vi.mock('@nawhas/ui', () => ({
  CoverArt: ({
    slug,
    artworkUrl,
    label,
  }: {
    slug: string;
    artworkUrl?: string | null;
    label?: string;
  }) =>
    artworkUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- test stub, not production code
      <img src={artworkUrl} alt={label ?? 'cover'} data-testid="cover-img" />
    ) : (
      <div data-cover-variant="cov-1" data-slug={slug} aria-label={label}>
        {label}
      </div>
    ),
}));

import { AlbumCard } from '../album-card';

afterEach(() => cleanup());

const album = {
  id: 'a1',
  slug: 'panjtan-pak',
  title: 'Panjtan Pak',
  reciterId: 'r1',
  year: 2020,
  description: null,
  artworkUrl: null,
  vibrantColor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Parameters<typeof AlbumCard>[0]['album'];

describe('AlbumCard', () => {
  it('links to the album detail route', () => {
    render(<AlbumCard album={album} />);
    const link = screen.getByRole('link', { name: /view album: panjtan pak/i });
    expect(link.getAttribute('href')).toBe('/albums/panjtan-pak');
  });

  it('renders the album title', () => {
    render(<AlbumCard album={album} />);
    // title appears twice (CoverArt label + visible label below); both are valid
    expect(screen.getAllByText('Panjtan Pak').length).toBeGreaterThanOrEqual(1);
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
