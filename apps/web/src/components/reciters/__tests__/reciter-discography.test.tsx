import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import type { AlbumDTO } from '@nawhas/types';

// Mock LoadMoreAlbums — it has its own tests; here we just check that
// ReciterDiscography delegates to it with the right props.
vi.mock('@/components/albums/load-more-albums', () => ({
  LoadMoreAlbums: ({
    reciterSlug,
    initialAlbums,
    initialCursor,
  }: {
    reciterSlug: string;
    initialAlbums: AlbumDTO[];
    initialCursor: string | null;
  }) => (
    <div
      data-testid="load-more-albums"
      data-reciter-slug={reciterSlug}
      data-album-count={initialAlbums.length}
      data-cursor={initialCursor ?? ''}
    />
  ),
}));

import { ReciterDiscography } from '../reciter-discography';

afterEach(() => cleanup());

function makeAlbum(id: string): AlbumDTO {
  return {
    id,
    title: `Album ${id}`,
    slug: `album-${id}`,
    reciterId: 'r1',
    year: 2020,
    artworkUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as AlbumDTO;
}

describe('ReciterDiscography', () => {
  it('renders a "Discography" heading', async () => {
    const jsx = await ReciterDiscography({
      reciterSlug: 'ali-safdar',
      initialAlbums: [makeAlbum('a1')],
      initialCursor: null,
    });
    render(jsx);
    expect(screen.getByRole('heading', { name: /discography/i })).toBeDefined();
  });

  it('uses a region landmark labelled by the heading', async () => {
    const jsx = await ReciterDiscography({
      reciterSlug: 'ali-safdar',
      initialAlbums: [makeAlbum('a1')],
      initialCursor: null,
    });
    render(jsx);
    expect(screen.getByRole('region', { name: /discography/i })).toBeDefined();
  });

  it('renders LoadMoreAlbums when there are albums', async () => {
    const jsx = await ReciterDiscography({
      reciterSlug: 'ali-safdar',
      initialAlbums: [makeAlbum('a1'), makeAlbum('a2')],
      initialCursor: null,
    });
    render(jsx);
    const stub = screen.getByTestId('load-more-albums');
    expect(stub).toBeDefined();
    expect(stub.getAttribute('data-album-count')).toBe('2');
  });

  it('passes the reciterSlug to LoadMoreAlbums', async () => {
    const jsx = await ReciterDiscography({
      reciterSlug: 'ali-safdar',
      initialAlbums: [makeAlbum('a1')],
      initialCursor: null,
    });
    render(jsx);
    expect(screen.getByTestId('load-more-albums').getAttribute('data-reciter-slug')).toBe(
      'ali-safdar',
    );
  });

  it('passes the cursor to LoadMoreAlbums', async () => {
    const jsx = await ReciterDiscography({
      reciterSlug: 'ali-safdar',
      initialAlbums: [makeAlbum('a1')],
      initialCursor: 'cursor-xyz',
    });
    render(jsx);
    expect(screen.getByTestId('load-more-albums').getAttribute('data-cursor')).toBe('cursor-xyz');
  });

  it('shows an empty-state message when there are no albums', async () => {
    const jsx = await ReciterDiscography({
      reciterSlug: 'ali-safdar',
      initialAlbums: [],
      initialCursor: null,
    });
    render(jsx);
    // i18n key reciter.discography.empty = "No albums available yet."
    expect(screen.getByText('No albums available yet.')).toBeDefined();
  });

  it('does not render LoadMoreAlbums when albums list is empty', async () => {
    const jsx = await ReciterDiscography({
      reciterSlug: 'ali-safdar',
      initialAlbums: [],
      initialCursor: null,
    });
    render(jsx);
    expect(screen.queryByTestId('load-more-albums')).toBeNull();
  });
});
