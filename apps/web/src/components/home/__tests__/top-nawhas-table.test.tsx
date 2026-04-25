import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// Stub next/link → plain <a>
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

// Stub @nawhas/ui/components/section-title
vi.mock('@nawhas/ui/components/section-title', () => ({
  SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id}>{children}</h2>
  ),
}));

import { TopNawhasTable } from '../top-nawhas-table';
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

describe('TopNawhasTable', () => {
  it('returns null when the tracks array is empty', async () => {
    const { container } = render(await TopNawhasTable({ tracks: [] }));
    expect(container.firstChild).toBeNull();
  });

  it('renders the section heading', async () => {
    render(await TopNawhasTable({ tracks: [makeTrack('t1')] }));
    // en.json: home.sections.topNawhas = "Top Nawhas"
    expect(screen.getByText('Top Nawhas')).toBeDefined();
  });

  it('renders track titles', async () => {
    const tracks = [
      makeTrack('t1', { title: 'Salam Hussain' }),
      makeTrack('t2', { title: 'Ya Ali Madad' }),
    ];
    render(await TopNawhasTable({ tracks }));
    expect(screen.getByText('Salam Hussain')).toBeDefined();
    expect(screen.getByText('Ya Ali Madad')).toBeDefined();
  });

  it('renders consecutive position numbers 1..N', async () => {
    const tracks = [
      makeTrack('t1', { title: 'Track A' }),
      makeTrack('t2', { title: 'Track B' }),
      makeTrack('t3', { title: 'Track C' }),
    ];
    render(await TopNawhasTable({ tracks }));
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('renders a deep link to /reciters/[reciterSlug]/albums/[albumSlug]/tracks/[trackSlug]', async () => {
    const track = makeTrack('t1', {
      title: 'Salam Hussain',
      reciterSlug: 'ali-safdar',
      albumSlug: 'panjtan-pak',
      slug: 'salam-hussain',
    });
    render(await TopNawhasTable({ tracks: [track] }));
    const link = screen.getByRole('link', { name: /salam hussain/i });
    expect(link.getAttribute('href')).toBe(
      '/reciters/ali-safdar/albums/panjtan-pak/tracks/salam-hussain',
    );
  });

  it('renders "{reciterName} · {albumTitle}" subtitle format', async () => {
    const track = makeTrack('t1', {
      reciterName: 'Ali Safdar',
      albumTitle: 'Panjtan Pak',
    });
    render(await TopNawhasTable({ tracks: [track] }));
    expect(screen.getByText('Ali Safdar · Panjtan Pak')).toBeDefined();
  });

  it('renders subtitle with only reciter name when albumTitle is missing', async () => {
    const track = makeTrack('t1', {
      reciterName: 'Ali Safdar',
      albumTitle: '',
    });
    render(await TopNawhasTable({ tracks: [track] }));
    expect(screen.getByText('Ali Safdar')).toBeDefined();
  });
});
