import type { AlbumDTO } from '@nawhas/types';
import { AlbumCard } from '@/components/cards/album-card';

interface ReciterDiscographyProps {
  albums: AlbumDTO[];
}

/**
 * Displays a reciter's full discography as an album grid.
 *
 * Server Component — no interactivity required.
 */
export function ReciterDiscography({ albums }: ReciterDiscographyProps): React.JSX.Element {
  return (
    <section aria-labelledby="discography-heading">
      <h2 id="discography-heading" className="mb-6 text-xl font-semibold text-gray-900">
        Discography
      </h2>

      {albums.length === 0 ? (
        <p className="text-gray-500">No albums available yet.</p>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          aria-label={`${albums.length} album${albums.length !== 1 ? 's' : ''}`}
        >
          {albums.map((album) => (
            <li key={album.id}>
              <AlbumCard album={album} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
