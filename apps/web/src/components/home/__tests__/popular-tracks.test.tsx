import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// Stub SectionTitle — path import from @nawhas/ui/components/section-title
vi.mock('@nawhas/ui/components/section-title', () => ({
  SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id}>{children}</h2>
  ),
}));

import { PopularTracks } from '../popular-tracks';
import type { TrackDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeTrack(
  id: string,
  title: string,
  duration: number | null = null,
): TrackDTO {
  return {
    id,
    title,
    slug: `track-${id}`,
    albumId: 'a1',
    trackNumber: null,
    audioUrl: null,
    youtubeId: null,
    duration,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as TrackDTO;
}

describe('PopularTracks', () => {
  it('returns null when the tracks array is empty', () => {
    const { container } = render(<PopularTracks tracks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the section heading', () => {
    render(<PopularTracks tracks={[makeTrack('t1', 'Salam Hussain')]} />);
    expect(screen.getByText('Popular Tracks')).toBeDefined();
  });

  it('renders track titles', () => {
    const tracks = [
      makeTrack('t1', 'Salam Hussain'),
      makeTrack('t2', 'Ya Ali Madad'),
    ];
    render(<PopularTracks tracks={tracks} />);
    expect(screen.getByText('Salam Hussain')).toBeDefined();
    expect(screen.getByText('Ya Ali Madad')).toBeDefined();
  });

  it('renders a numbered list with consecutive 1..N positions', () => {
    const tracks = [
      makeTrack('t1', 'Track A'),
      makeTrack('t2', 'Track B'),
      makeTrack('t3', 'Track C'),
    ];
    render(<PopularTracks tracks={tracks} />);
    // The numbers are rendered as aria-hidden spans; query by text
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('formats duration as m:ss when duration is present', () => {
    // 3 minutes 5 seconds = 185 seconds → "3:05"
    render(<PopularTracks tracks={[makeTrack('t1', 'Track A', 185)]} />);
    expect(screen.getByText('3:05')).toBeDefined();
  });

  it('formats duration correctly for sub-minute values', () => {
    // 65 seconds → "1:05"
    render(<PopularTracks tracks={[makeTrack('t1', 'Track A', 65)]} />);
    expect(screen.getByText('1:05')).toBeDefined();
  });

  it('omits duration display when duration is null', () => {
    render(<PopularTracks tracks={[makeTrack('t1', 'Track A', null)]} />);
    // No colon-separated time should appear
    const { container } = render(<PopularTracks tracks={[makeTrack('t2', 'Track B', null)]} />);
    const tabularNums = container.querySelectorAll('.tabular-nums');
    expect(tabularNums.length).toBe(0);
  });

  it('does not render clickable links to individual track pages', () => {
    render(<PopularTracks tracks={[makeTrack('t1', 'Track A')]} />);
    // Bespoke layout — no anchor links (no track detail page link)
    const links = screen.queryAllByRole('link');
    expect(links.length).toBe(0);
  });
});
