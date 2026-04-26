import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@nawhas/ui', () => ({
  CoverArt: ({ slug }: { slug: string }) => <div data-testid={`cover-${slug}`} />,
}));

import { ReciterPopularTracks } from '../reciter-popular-tracks';
import type { TrackListItemDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeTrack(
  id: string,
  overrides: Partial<TrackListItemDTO> = {},
): TrackListItemDTO {
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
    reciterSlug: 'ali-safdar',
    reciterName: 'Ali Safdar',
    albumSlug: 'panjtan-pak',
    albumTitle: 'Panjtan Pak',
    albumYear: 2020,
    ...overrides,
  } as TrackListItemDTO;
}

describe('ReciterPopularTracks', () => {
  it('returns null when the tracks array is empty', async () => {
    const { container } = render(await ReciterPopularTracks({ tracks: [] }));
    expect(container.firstChild).toBeNull();
  });

  it('renders the "Popular Tracks" heading', async () => {
    render(await ReciterPopularTracks({ tracks: [makeTrack('t1')] }));
    expect(screen.getByText('Popular Tracks')).toBeDefined();
  });

  it('renders one card per track with title + album year', async () => {
    const tracks = [
      makeTrack('t1', { title: 'Salam Hussain', albumYear: 2020 }),
      makeTrack('t2', { title: 'Ya Ali', albumYear: 2018 }),
    ];
    render(await ReciterPopularTracks({ tracks }));
    expect(screen.getByText('Salam Hussain')).toBeDefined();
    expect(screen.getByText('Ya Ali')).toBeDefined();
    expect(screen.getByText('2020')).toBeDefined();
    expect(screen.getByText('2018')).toBeDefined();
  });

  it('omits the year line when albumYear is null', async () => {
    render(await ReciterPopularTracks({ tracks: [makeTrack('t1', { albumYear: null })] }));
    expect(screen.queryByText('2020')).toBeNull();
  });

  it('links each card to the canonical track URL', async () => {
    const track = makeTrack('t1', {
      title: 'Salam Hussain',
      reciterSlug: 'ali-safdar',
      albumSlug: 'panjtan-pak',
      slug: 'salam-hussain',
    });
    render(await ReciterPopularTracks({ tracks: [track] }));
    const link = screen.getByRole('link', { name: /salam hussain/i });
    expect(link.getAttribute('href')).toBe(
      '/reciters/ali-safdar/albums/panjtan-pak/tracks/salam-hussain',
    );
  });
});
