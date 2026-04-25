import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import type { TrackWithRelationsDTO } from '@nawhas/types';

// Mock next/link to a plain anchor so href assertions work.
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

// formatDuration is a thin utility — mock it so tests are format-agnostic.
vi.mock('@nawhas/ui/lib/format-duration', () => ({
  formatDuration: (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
}));

import { TrackHeader } from '../track-header';

afterEach(() => cleanup());

function makeTrack(overrides: Partial<TrackWithRelationsDTO> = {}): TrackWithRelationsDTO {
  return {
    id: 't1',
    title: 'Ya Hussain',
    slug: 'ya-hussain',
    albumId: 'a1',
    trackNumber: 3,
    audioUrl: null,
    youtubeId: null,
    duration: 185,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    reciter: {
      id: 'r1',
      name: 'Ali Safdar',
      slug: 'ali-safdar',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    album: {
      id: 'a1',
      title: 'Panjtan Pak',
      slug: 'panjtan-pak',
      reciterId: 'r1',
      year: 2020,
      artworkUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    lyrics: [],
    ...overrides,
  } as TrackWithRelationsDTO;
}

describe('TrackHeader', () => {
  it('renders the track title as an H1', () => {
    render(<TrackHeader track={makeTrack()} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Ya Hussain');
  });

  it('links to the reciter page', () => {
    render(<TrackHeader track={makeTrack()} />);
    const link = screen.getByRole('link', { name: 'Ali Safdar' });
    expect(link.getAttribute('href')).toBe('/reciters/ali-safdar');
  });

  it('links to the album page', () => {
    render(<TrackHeader track={makeTrack()} />);
    const link = screen.getByRole('link', { name: 'Panjtan Pak' });
    expect(link.getAttribute('href')).toBe('/albums/panjtan-pak');
  });

  it('shows the album year when present', () => {
    render(<TrackHeader track={makeTrack()} />);
    expect(screen.getByText('2020')).toBeDefined();
  });

  it('omits the album year when null', () => {
    render(<TrackHeader track={makeTrack({ album: { ...makeTrack().album, year: null } })} />);
    expect(screen.queryByText('2020')).toBeNull();
  });

  it('shows the track number when present', () => {
    render(<TrackHeader track={makeTrack()} />);
    expect(screen.getByText('Track 3')).toBeDefined();
  });

  it('omits the track number when null', () => {
    render(<TrackHeader track={makeTrack({ trackNumber: null })} />);
    expect(screen.queryByText(/Track \d/)).toBeNull();
  });

  it('renders a <time> element with formatted duration when duration is present', () => {
    render(<TrackHeader track={makeTrack({ duration: 185 })} />);
    // formatDuration(185) → "3:05"
    const time = screen.getByText('3:05');
    expect(time.tagName).toBe('TIME');
  });

  it('omits the duration when null', () => {
    render(<TrackHeader track={makeTrack({ duration: null })} />);
    // No <time> element in the document
    expect(screen.queryByRole('time')).toBeNull();
  });

  it('sets a correct machine-readable dateTime on the <time> element', () => {
    render(<TrackHeader track={makeTrack({ duration: 185 })} />);
    // 185s = 3m 5s → PT3M5S
    const time = screen.getByText('3:05');
    expect(time.getAttribute('dateTime')).toBe('PT3M5S');
  });
});
