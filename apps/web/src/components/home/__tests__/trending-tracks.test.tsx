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

vi.mock('@nawhas/ui/components/section-title', () => ({
  SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id}>{children}</h2>
  ),
}));

vi.mock('@nawhas/ui', () => ({
  CoverArt: ({ slug }: { slug: string }) => <div data-testid={`cover-${slug}`} />,
}));

import { TrendingTracks } from '../trending-tracks';
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
    ...overrides,
  } as TrackListItemDTO;
}

describe('TrendingTracks', () => {
  it('returns null when the tracks array is empty', async () => {
    const { container } = render(await TrendingTracks({ tracks: [] }));
    expect(container.firstChild).toBeNull();
  });

  it('renders the "Trending This Month" section heading', async () => {
    render(await TrendingTracks({ tracks: [makeTrack('t1')] }));
    expect(screen.getByText('Trending This Month')).toBeDefined();
  });

  it('renders a "See all" link to /library', async () => {
    render(await TrendingTracks({ tracks: [makeTrack('t1')] }));
    const link = screen.getByRole('link', { name: /see all/i });
    expect(link.getAttribute('href')).toBe('/library');
  });

  it('renders one card per track with title + reciter name', async () => {
    const tracks = [
      makeTrack('t1', { title: 'Salam Hussain', reciterName: 'Ali Safdar' }),
      makeTrack('t2', { title: 'Ya Ali Madad', reciterName: 'Mir Hasan Mir' }),
    ];
    render(await TrendingTracks({ tracks }));
    expect(screen.getByText('Salam Hussain')).toBeDefined();
    expect(screen.getByText('Ya Ali Madad')).toBeDefined();
    expect(screen.getByText('Ali Safdar')).toBeDefined();
    expect(screen.getByText('Mir Hasan Mir')).toBeDefined();
  });

  it('links each card to the canonical track page', async () => {
    const track = makeTrack('t1', {
      title: 'Salam Hussain',
      reciterSlug: 'ali-safdar',
      albumSlug: 'panjtan-pak',
      slug: 'salam-hussain',
    });
    render(await TrendingTracks({ tracks: [track] }));
    const link = screen.getByRole('link', { name: /salam hussain/i });
    expect(link.getAttribute('href')).toBe(
      '/reciters/ali-safdar/albums/panjtan-pak/tracks/salam-hussain',
    );
  });
});
