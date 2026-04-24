import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { ReciterHeader } from '../reciter-header';
import type { ReciterWithAlbumsDTO, AlbumDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeAlbum(id: string): AlbumDTO {
  return {
    id,
    title: `Album ${id}`,
    slug: `album-${id}`,
    reciterId: 'r1',
    year: 2020,
    artworkUrl: null,
    vibrantColor: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as unknown as AlbumDTO;
}

function makeReciter(
  overrides: Partial<ReciterWithAlbumsDTO> = {},
): ReciterWithAlbumsDTO {
  return {
    id: 'r1',
    name: 'Ali Safdar',
    slug: 'ali-safdar',
    country: null,
    birthYear: null,
    description: null,
    avatarUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    albums: [],
    ...overrides,
  } as ReciterWithAlbumsDTO;
}

describe('ReciterHeader', () => {
  it('renders the reciter name as an H1', () => {
    render(<ReciterHeader reciter={makeReciter()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Ali Safdar');
  });

  it('renders a ReciterAvatar with the reciter name as accessible label', () => {
    render(<ReciterHeader reciter={makeReciter()} />);
    // ReciterAvatar contract: role="img" + aria-label=name (gradient fallback path)
    const avatar = screen.getByRole('img', { name: 'Ali Safdar' });
    expect(avatar).toBeDefined();
  });

  it('renders an <img> when reciter has an avatarUrl', () => {
    const reciterWithAvatar = makeReciter({
      avatarUrl: 'https://example.com/avatar.png',
    });
    render(<ReciterHeader reciter={reciterWithAvatar} />);
    const img = screen.getByRole('img', { name: 'Ali Safdar' });
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.png');
  });

  it('shows "No albums yet" when the reciter has no albums', () => {
    render(<ReciterHeader reciter={makeReciter({ albums: [] })} />);
    expect(screen.getByText('No albums yet')).toBeDefined();
  });

  it('shows "1 album" when the reciter has exactly one album', () => {
    render(
      <ReciterHeader reciter={makeReciter({ albums: [makeAlbum('a1')] })} />,
    );
    expect(screen.getByText('1 album')).toBeDefined();
  });

  it('shows "N albums" when the reciter has multiple albums', () => {
    render(
      <ReciterHeader
        reciter={makeReciter({
          albums: [makeAlbum('a1'), makeAlbum('a2'), makeAlbum('a3')],
        })}
      />,
    );
    expect(screen.getByText('3 albums')).toBeDefined();
  });
});
