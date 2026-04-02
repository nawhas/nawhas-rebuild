import type { AlbumDTO } from '@nawhas/types';
import { AlbumCard } from '@/components/cards/album-card';

interface RecentAlbumsProps {
  albums: AlbumDTO[];
}

/**
 * Home page section showcasing recently added albums in a responsive grid.
 *
 * Server Component — pure presentation, no interactivity.
 */
export function RecentAlbums({ albums }: RecentAlbumsProps): React.JSX.Element | null {
  if (albums.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="recent-albums-heading">
      <h2
        id="recent-albums-heading"
        className="mb-6 text-xl font-semibold text-gray-900"
      >
        Recent Albums
      </h2>

      <ul
        role="list"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
        {albums.map((album) => (
          <li key={album.id}>
            <AlbumCard album={album} />
          </li>
        ))}
      </ul>
    </section>
  );
}
