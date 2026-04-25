import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { TrackList } from '../track-list';
import type { TrackDTO } from '@nawhas/types';

// Stub TrackListRow — it's a client component with its own tests.
// Render just enough for order and content assertions.
vi.mock('../track-list-row', () => ({
  TrackListRow: ({
    track,
    trackNumber,
    href,
  }: {
    track: TrackDTO;
    trackNumber: number;
    href: string;
  }) => (
    <li data-testid="track-list-row" data-track-number={trackNumber} data-href={href}>
      {track.title}
    </li>
  ),
}));

afterEach(() => cleanup());

function makeTrack(id: string, title: string, trackNumber: number | null = null): TrackDTO {
  return {
    id,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    albumId: 'a1',
    trackNumber,
    audioUrl: null,
    youtubeId: null,
    duration: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };
}

describe('TrackList', () => {
  it('renders an ordered list with the correct aria-label (plural)', async () => {
    const tracks = [makeTrack('1', 'Track One'), makeTrack('2', 'Track Two')];
    render(
      await TrackList({ tracks, reciterSlug: 'ali-safdar', albumSlug: 'panjtan-pak' }),
    );
    const list = screen.getByRole('list', { name: '2 tracks' });
    expect(list.tagName).toBe('OL');
  });

  it('renders an ordered list with singular aria-label for one track', async () => {
    const tracks = [makeTrack('1', 'Solo Track')];
    render(
      await TrackList({ tracks, reciterSlug: 'ali-safdar', albumSlug: 'panjtan-pak' }),
    );
    expect(screen.getByRole('list', { name: '1 track' })).toBeDefined();
  });

  it('renders track titles in document order', async () => {
    const tracks = [
      makeTrack('1', 'First Track'),
      makeTrack('2', 'Second Track'),
      makeTrack('3', 'Third Track'),
    ];
    render(
      await TrackList({ tracks, reciterSlug: 'ali-safdar', albumSlug: 'panjtan-pak' }),
    );
    const rows = screen.getAllByTestId('track-list-row');
    expect(rows[0]?.textContent).toBe('First Track');
    expect(rows[1]?.textContent).toBe('Second Track');
    expect(rows[2]?.textContent).toBe('Third Track');
  });

  it('passes correct href to each TrackListRow', async () => {
    const tracks = [makeTrack('1', 'Ya Hussain')];
    render(
      await TrackList({ tracks, reciterSlug: 'ali-safdar', albumSlug: 'panjtan-pak' }),
    );
    const row = screen.getByTestId('track-list-row');
    expect(row.getAttribute('data-href')).toBe(
      '/reciters/ali-safdar/albums/panjtan-pak/tracks/ya-hussain',
    );
  });

  it('uses trackNumber from track when set, falling back to index+1', async () => {
    const tracks = [
      makeTrack('1', 'Track A', 5),
      makeTrack('2', 'Track B', null), // no trackNumber → index 1 → fallback 2
    ];
    render(
      await TrackList({ tracks, reciterSlug: 'ali-safdar', albumSlug: 'panjtan-pak' }),
    );
    const rows = screen.getAllByTestId('track-list-row');
    expect(rows[0]?.getAttribute('data-track-number')).toBe('5');
    expect(rows[1]?.getAttribute('data-track-number')).toBe('2');
  });

  it('shows "No tracks available yet." when tracks array is empty', async () => {
    render(
      await TrackList({ tracks: [], reciterSlug: 'ali-safdar', albumSlug: 'panjtan-pak' }),
    );
    expect(screen.getByText('No tracks available yet.')).toBeDefined();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('renders within a section labelled by the "Tracks" heading', async () => {
    const tracks = [makeTrack('1', 'Track One')];
    render(
      await TrackList({ tracks, reciterSlug: 'ali-safdar', albumSlug: 'panjtan-pak' }),
    );
    const section = screen.getByRole('region', { name: 'Tracks' });
    expect(section).toBeDefined();
  });

  it('omits the "Add track" pill when no addTrackHref is provided', async () => {
    render(
      await TrackList({
        tracks: [makeTrack('1', 'Track One')],
        reciterSlug: 'ali-safdar',
        albumSlug: 'panjtan-pak',
      }),
    );
    expect(screen.queryByRole('link', { name: /Add track/i })).toBeNull();
  });

  it('renders the "+ Add track" pill linking to addTrackHref when provided', async () => {
    render(
      await TrackList({
        tracks: [makeTrack('1', 'Track One')],
        reciterSlug: 'ali-safdar',
        albumSlug: 'panjtan-pak',
        addTrackHref: '/contribute/track/new',
      }),
    );
    const link = screen.getByRole('link', { name: /Add track/i });
    expect(link.getAttribute('href')).toBe('/contribute/track/new');
  });
});
