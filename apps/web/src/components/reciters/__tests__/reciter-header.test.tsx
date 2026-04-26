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

// Stub @nawhas/ui ReciterAvatar to avoid pulling in next-intl internals.
vi.mock('@nawhas/ui', () => ({
  ReciterAvatar: ({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) =>
    avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- test stub
      <img src={avatarUrl} alt={name} role="img" />
    ) : (
      <div role="img" aria-label={name}>
        {name}
      </div>
    ),
}));

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
    albumCount: 0,
    trackCount: 0,
    ...overrides,
  } as ReciterWithAlbumsDTO;
}

describe('ReciterHeader', () => {
  it('renders the reciter name as an H1', async () => {
    render(await ReciterHeader({ reciter: makeReciter() }));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Ali Safdar');
  });

  it('renders a ReciterAvatar with the reciter name as accessible label', async () => {
    render(await ReciterHeader({ reciter: makeReciter() }));
    const avatar = screen.getByRole('img', { name: 'Ali Safdar' });
    expect(avatar).toBeDefined();
  });

  it('renders an <img> when reciter has an avatarUrl', async () => {
    render(
      await ReciterHeader({
        reciter: makeReciter({ avatarUrl: 'https://example.com/avatar.png' }),
      }),
    );
    const img = screen.getByRole('img', { name: 'Ali Safdar' });
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.png');
  });

  it('renders the album + track counts with their labels', async () => {
    render(
      await ReciterHeader({
        reciter: makeReciter({
          albums: [makeAlbum('a1'), makeAlbum('a2')],
          albumCount: 2,
          trackCount: 18,
        }),
      }),
    );
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('18')).toBeDefined();
    expect(screen.getByText('Albums')).toBeDefined();
    expect(screen.getByText('Tracks')).toBeDefined();
  });

  it('renders the description (bio) paragraph when present', async () => {
    const description = 'Renowned reciter from Karbala, active since 1995.';
    render(await ReciterHeader({ reciter: makeReciter({ description }) }));
    expect(screen.getByText(description)).toBeDefined();
  });

  it('omits the description paragraph when null', async () => {
    render(await ReciterHeader({ reciter: makeReciter({ description: null }) }));
    expect(screen.queryByText(/Renowned reciter/)).toBeNull();
  });

  it('renders the country as a location line when present', async () => {
    render(await ReciterHeader({ reciter: makeReciter({ country: 'Iraq' }) }));
    expect(screen.getByText('Iraq')).toBeDefined();
  });

  it('omits the location line when country is null', async () => {
    render(await ReciterHeader({ reciter: makeReciter({ country: null }) }));
    expect(screen.queryByText(/Iraq|Iran|Pakistan/)).toBeNull();
  });

  it('renders the "Suggest edit" pill linking to the edit-reciter route', async () => {
    render(await ReciterHeader({ reciter: makeReciter() }));
    const link = screen.getByRole('link', { name: /Suggest edit/i });
    expect(link.getAttribute('href')).toBe('/contribute/edit/reciter/ali-safdar');
  });

  it('renders the "Add album" pill linking to the new-album route', async () => {
    render(await ReciterHeader({ reciter: makeReciter() }));
    const link = screen.getByRole('link', { name: /Add album/i });
    expect(link.getAttribute('href')).toBe('/contribute/album/new');
  });
});
