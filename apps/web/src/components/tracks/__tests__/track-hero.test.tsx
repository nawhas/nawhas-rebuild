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

vi.mock('@/components/player/track-detail-play-button', () => ({
  TrackDetailPlayButton: ({ variant }: { variant?: string }) => (
    <button type="button" data-testid={`play-${variant ?? 'default'}`} aria-label="Play">
      ▶
    </button>
  ),
}));

vi.mock('@/components/SaveButton', () => ({
  SaveButton: ({ trackId }: { trackId: string }) => (
    <button type="button" data-testid={`save-${trackId}`} aria-label="Save" />
  ),
}));

import { TrackHero } from '../track-hero';
import type { TrackWithRelationsDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeTrack(
  overrides: Partial<TrackWithRelationsDTO> = {},
): TrackWithRelationsDTO {
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
    ...overrides,
  } as TrackWithRelationsDTO;
}

describe('TrackHero', () => {
  it('renders the track title as h1', async () => {
    render(await TrackHero({ track: makeTrack() }));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Salam Hussain');
  });

  it('renders the "Nawha Track" eyebrow', async () => {
    render(await TrackHero({ track: makeTrack() }));
    expect(screen.getByText('Nawha Track')).toBeDefined();
  });

  it('renders the reciter pill linking to the reciter profile', async () => {
    render(await TrackHero({ track: makeTrack() }));
    const link = screen.getByRole('link', { name: /Ali Safdar/i });
    expect(link.getAttribute('href')).toBe('/reciters/ali-safdar');
  });

  it('renders the album year when present', async () => {
    render(await TrackHero({ track: makeTrack() }));
    expect(screen.getByText('2020')).toBeDefined();
  });

  it('omits the album year when null', async () => {
    render(
      await TrackHero({
        track: makeTrack({
          album: { ...makeTrack().album, year: null },
        }),
      }),
    );
    expect(screen.queryByText('2020')).toBeNull();
  });

  it('renders the play button in hero variant', async () => {
    render(await TrackHero({ track: makeTrack() }));
    expect(screen.getByTestId('play-hero')).toBeDefined();
  });

  it('renders the save button wired to the track id', async () => {
    render(await TrackHero({ track: makeTrack() }));
    expect(screen.getByTestId('save-t1')).toBeDefined();
  });

  it('renders the "Suggest edit" link to the contribute edit route', async () => {
    render(await TrackHero({ track: makeTrack() }));
    const link = screen.getByRole('link', { name: /Suggest edit/i });
    expect(link.getAttribute('href')).toBe(
      '/contribute/edit/track/ali-safdar/panjtan-pak/salam-hussain',
    );
  });

  it('renders an overflow stub button with an accessible label', async () => {
    render(await TrackHero({ track: makeTrack() }));
    expect(screen.getByRole('button', { name: /More options/i })).toBeDefined();
  });
});
