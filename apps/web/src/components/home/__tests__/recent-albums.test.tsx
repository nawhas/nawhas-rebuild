import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// Stub AlbumCard to avoid pulling in CoverArt / @nawhas/ui in this test
vi.mock('@/components/cards/album-card', () => ({
  AlbumCard: ({ album }: { album: { title: string; slug: string } }) => (
    <a href={`/albums/${album.slug}`} aria-label={`View album: ${album.title}`}>
      {album.title}
    </a>
  ),
}));

// Stub @nawhas/ui/components/section-title
vi.mock('@nawhas/ui/components/section-title', () => ({
  SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id}>{children}</h2>
  ),
}));

import { RecentAlbums } from '../recent-albums';
import type { AlbumDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeAlbum(id: string, title: string, slug: string): AlbumDTO {
  return {
    id,
    title,
    slug,
    reciterId: 'r1',
    year: 2020,
    artworkUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as AlbumDTO;
}

describe('RecentAlbums', () => {
  it('returns null when the albums array is empty', () => {
    const { container } = render(<RecentAlbums albums={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the section heading', () => {
    render(
      <RecentAlbums albums={[makeAlbum('a1', 'Panjtan Pak', 'panjtan-pak')]} />,
    );
    expect(screen.getByText('Recent Albums')).toBeDefined();
  });

  it('renders one AlbumCard per album', () => {
    const albums = [
      makeAlbum('a1', 'Panjtan Pak', 'panjtan-pak'),
      makeAlbum('a2', 'Labbaik', 'labbaik'),
      makeAlbum('a3', 'Salam', 'salam'),
    ];
    render(<RecentAlbums albums={albums} />);
    expect(screen.getByText('Panjtan Pak')).toBeDefined();
    expect(screen.getByText('Labbaik')).toBeDefined();
    expect(screen.getByText('Salam')).toBeDefined();
  });

  it('links to /albums/[slug] for each album', () => {
    const albums = [
      makeAlbum('a1', 'Panjtan Pak', 'panjtan-pak'),
      makeAlbum('a2', 'Labbaik', 'labbaik'),
    ];
    render(<RecentAlbums albums={albums} />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/albums/panjtan-pak');
    expect(hrefs).toContain('/albums/labbaik');
  });
});
