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

import { TrackSidebar } from '../track-sidebar';
import type { TrackListItemDTO, TrackWithRelationsDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeTrack(): TrackWithRelationsDTO {
  return {
    id: 't1',
    title: 'Salam Hussain',
    slug: 'salam-hussain',
    albumId: 'a1',
    trackNumber: null,
    audioUrl: null,
    youtubeId: null,
    duration: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    reciter: {
      id: 'r1',
      name: 'Ali Safdar',
      slug: 'ali-safdar',
      arabicName: null,
      country: null,
      birthYear: null,
      description: null,
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    album: {
      id: 'a1',
      title: 'Panjtan Pak',
      slug: 'panjtan-pak',
      reciterId: 'r1',
      year: 2020,
      description: null,
      artworkUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    lyrics: [],
  } as TrackWithRelationsDTO;
}

function makeRelated(id: string, title: string): TrackListItemDTO {
  return {
    id,
    title,
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
  } as TrackListItemDTO;
}

describe('TrackSidebar', () => {
  it('renders the album mini-card linking to /albums/[slug]', async () => {
    render(await TrackSidebar({ track: makeTrack(), related: [] }));
    const link = screen.getByRole('link', { name: /Panjtan Pak/i });
    expect(link.getAttribute('href')).toBe('/albums/panjtan-pak');
  });

  it('renders the album year when present', async () => {
    render(await TrackSidebar({ track: makeTrack(), related: [] }));
    expect(screen.getByText('2020')).toBeDefined();
  });

  it('omits the related-tracks section when the related list is empty', async () => {
    render(await TrackSidebar({ track: makeTrack(), related: [] }));
    expect(screen.queryByText('Related Tracks')).toBeNull();
  });

  it('renders the related-tracks section heading when items are present', async () => {
    render(
      await TrackSidebar({
        track: makeTrack(),
        related: [makeRelated('r1', 'Ya Ali')],
      }),
    );
    expect(screen.getByText('Related Tracks')).toBeDefined();
  });

  it('renders one row per related track with title + reciter', async () => {
    render(
      await TrackSidebar({
        track: makeTrack(),
        related: [
          makeRelated('r1', 'Ya Ali'),
          makeRelated('r2', 'Ya Hussain'),
        ],
      }),
    );
    expect(screen.getByText('Ya Ali')).toBeDefined();
    expect(screen.getByText('Ya Hussain')).toBeDefined();
  });

  it('links each related track to its canonical URL', async () => {
    render(
      await TrackSidebar({
        track: makeTrack(),
        related: [makeRelated('r1', 'Ya Ali')],
      }),
    );
    const link = screen.getByRole('link', { name: /Ya Ali/i });
    expect(link.getAttribute('href')).toBe(
      '/reciters/ali-safdar/albums/panjtan-pak/tracks/track-r1',
    );
  });
});
