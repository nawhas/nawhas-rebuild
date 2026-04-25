import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { AlbumHeader } from '../album-header';
import type { AlbumDetailDTO, TrackDTO } from '@nawhas/types';

// Mock next/link so it renders as a plain anchor.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Stub @nawhas/ui CoverArt — avoids next-intl internals in @nawhas/ui package.
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
      // eslint-disable-next-line @next/next/no-img-element -- test stub
      <img src={artworkUrl} alt={label ?? 'cover'} data-testid="cover-img" data-slug={slug} />
    ) : (
      <div data-testid="cover-fallback" data-slug={slug} aria-label={label}>
        {label}
      </div>
    ),
}));

afterEach(() => cleanup());

function makeTrack(id: string): TrackDTO {
  return {
    id,
    title: `Track ${id}`,
    slug: `track-${id}`,
    albumId: 'a1',
    trackNumber: null,
    audioUrl: null,
    youtubeId: null,
    duration: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

function makeAlbum(overrides: Partial<AlbumDetailDTO> = {}): AlbumDetailDTO {
  return {
    id: 'a1',
    title: 'Panjtan Pak',
    slug: 'panjtan-pak',
    reciterId: 'r1',
    reciterName: 'Ali Safdar',
    reciterSlug: 'ali-safdar',
    year: 2020,
    artworkUrl: null,
    description: null,
    tracks: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as AlbumDetailDTO;
}

describe('AlbumHeader', () => {
  it('renders the album title as an H1', async () => {
    render(await AlbumHeader({ album: makeAlbum() }));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Panjtan Pak');
  });

  it('renders the "Album" eyebrow', async () => {
    render(await AlbumHeader({ album: makeAlbum() }));
    expect(screen.getByText('Album')).toBeDefined();
  });

  it('renders a link to the reciter page', async () => {
    render(await AlbumHeader({ album: makeAlbum() }));
    const link = screen.getByRole('link', { name: 'Ali Safdar' });
    expect(link.getAttribute('href')).toBe('/reciters/ali-safdar');
  });

  it('shows "Released YYYY" when year is present', async () => {
    render(await AlbumHeader({ album: makeAlbum({ year: 2019 }) }));
    expect(screen.getByText('Released 2019')).toBeDefined();
  });

  it('omits the released line when year is null', async () => {
    render(await AlbumHeader({ album: makeAlbum({ year: null }) }));
    expect(screen.queryByText(/Released/)).toBeNull();
  });

  it('shows "No tracks" when the album has no tracks', async () => {
    render(await AlbumHeader({ album: makeAlbum({ tracks: [] }) }));
    expect(screen.getByText('No tracks')).toBeDefined();
  });

  it('shows "1 track" when the album has exactly one track', async () => {
    render(await AlbumHeader({ album: makeAlbum({ tracks: [makeTrack('t1')] }) }));
    expect(screen.getByText('1 track')).toBeDefined();
  });

  it('shows "N tracks" when the album has multiple tracks', async () => {
    render(
      await AlbumHeader({
        album: makeAlbum({ tracks: [makeTrack('t1'), makeTrack('t2'), makeTrack('t3')] }),
      }),
    );
    expect(screen.getByText('3 tracks')).toBeDefined();
  });

  it('renders the description when present', async () => {
    const description = 'A devotional album recorded in Karbala, 2019.';
    render(await AlbumHeader({ album: makeAlbum({ description }) }));
    expect(screen.getByText(description)).toBeDefined();
  });

  it('omits the description paragraph when not present', async () => {
    render(await AlbumHeader({ album: makeAlbum({ description: null }) }));
    // Title + reciter + meta + pills only — no extra prose paragraph.
    expect(screen.queryByText(/A devotional album/)).toBeNull();
  });

  it('renders the "Suggest edit" pill linking to the edit album route', async () => {
    render(await AlbumHeader({ album: makeAlbum() }));
    const link = screen.getByRole('link', { name: /Suggest edit/i });
    expect(link.getAttribute('href')).toBe('/contribute/edit/album/ali-safdar/panjtan-pak');
  });

  it('renders the "Add track to album" pill linking to the new-track route', async () => {
    render(await AlbumHeader({ album: makeAlbum() }));
    const link = screen.getByRole('link', { name: /Add track to album/i });
    expect(link.getAttribute('href')).toBe('/contribute/track/new');
  });

  it('passes slug and label to CoverArt', async () => {
    render(await AlbumHeader({ album: makeAlbum() }));
    const fallback = screen.getByTestId('cover-fallback');
    expect(fallback.getAttribute('data-slug')).toBe('panjtan-pak');
    expect(fallback.getAttribute('aria-label')).toBe('Panjtan Pak');
  });

  it('renders CoverArt with artworkUrl when present', async () => {
    render(
      await AlbumHeader({ album: makeAlbum({ artworkUrl: 'https://example.com/cover.jpg' }) }),
    );
    const img = screen.getByTestId('cover-img');
    expect(img.getAttribute('src')).toBe('https://example.com/cover.jpg');
    expect(img.getAttribute('data-slug')).toBe('panjtan-pak');
  });
});
