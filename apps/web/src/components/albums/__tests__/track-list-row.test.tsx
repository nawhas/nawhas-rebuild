import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import type { TrackDTO } from '@nawhas/types';

// Stub @nawhas/ui TrackRow — renders enough for assertions.
vi.mock('@nawhas/ui', () => ({
  TrackRow: ({
    slug,
    title,
    href,
    leadingSlot,
  }: {
    slug: string;
    title: string;
    href: string;
    leadingSlot?: React.ReactNode;
  }) => (
    <div data-testid="track-row" data-slug={slug} data-href={href}>
      {leadingSlot}
      <span>{title}</span>
    </div>
  ),
}));

// Stub TrackPlayButton — it has its own tests and uses the player store.
// We just need it to render something accessible.
vi.mock('@/components/player/track-play-button', () => ({
  TrackPlayButton: ({ track, trackNumber }: { track: TrackDTO; trackNumber: number }) => (
    <button aria-label={`Play ${track.title}`} data-track-number={trackNumber}>
      Play
    </button>
  ),
}));

// Mock the player store so addToQueue is a controllable spy.
const mockAddToQueue = vi.fn();
vi.mock('@/store/player', () => ({
  usePlayerStore: (selector: (s: { addToQueue: typeof mockAddToQueue }) => unknown) =>
    selector({ addToQueue: mockAddToQueue }),
}));

// Import after mocks are set up.
import { TrackListRow } from '../track-list-row';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeTrack(overrides: Partial<TrackDTO> = {}): TrackDTO {
  return {
    id: 't1',
    title: 'Ya Hussain',
    slug: 'ya-hussain',
    albumId: 'a1',
    trackNumber: 1,
    audioUrl: null,
    youtubeId: null,
    duration: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('TrackListRow', () => {
  it('renders the track title via TrackRow', () => {
    render(
      <TrackListRow
        track={makeTrack()}
        trackNumber={1}
        href="/reciters/ali-safdar/albums/panjtan-pak/tracks/ya-hussain"
        reciterSlug="ali-safdar"
      />,
    );
    expect(screen.getByText('Ya Hussain')).toBeDefined();
  });

  it('passes slug, title, and href to TrackRow', () => {
    render(
      <TrackListRow
        track={makeTrack()}
        trackNumber={1}
        href="/reciters/ali-safdar/albums/panjtan-pak/tracks/ya-hussain"
        reciterSlug="ali-safdar"
      />,
    );
    const row = screen.getByTestId('track-row');
    expect(row.getAttribute('data-slug')).toBe('ya-hussain');
    expect(row.getAttribute('data-href')).toBe(
      '/reciters/ali-safdar/albums/panjtan-pak/tracks/ya-hussain',
    );
  });

  it('renders the add-to-queue button with the correct aria-label', () => {
    render(
      <TrackListRow
        track={makeTrack()}
        trackNumber={1}
        href="/reciters/ali-safdar/albums/panjtan-pak/tracks/ya-hussain"
        reciterSlug="ali-safdar"
      />,
    );
    const btn = screen.getByRole('button', { name: 'Add Ya Hussain to queue' });
    expect(btn).toBeDefined();
  });

  it('calls addToQueue with the track when the add-to-queue button is clicked', () => {
    const track = makeTrack();
    render(
      <TrackListRow
        track={track}
        trackNumber={1}
        href="/reciters/ali-safdar/albums/panjtan-pak/tracks/ya-hussain"
        reciterSlug="ali-safdar"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Ya Hussain to queue' }));
    expect(mockAddToQueue).toHaveBeenCalledOnce();
    expect(mockAddToQueue).toHaveBeenCalledWith(track);
  });

  it('passes the leading slot (TrackPlayButton) to TrackRow', () => {
    render(
      <TrackListRow
        track={makeTrack()}
        trackNumber={3}
        href="/reciters/ali-safdar/albums/panjtan-pak/tracks/ya-hussain"
        reciterSlug="ali-safdar"
      />,
    );
    // TrackPlayButton stub renders a button with aria-label "Play <title>"
    const playBtn = screen.getByRole('button', { name: 'Play Ya Hussain' });
    expect(playBtn).toBeDefined();
    expect(playBtn.getAttribute('data-track-number')).toBe('3');
  });
});
