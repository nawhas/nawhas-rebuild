import { getTranslations } from 'next-intl/server';
import type { AlbumDTO } from '@nawhas/types';
import { LoadMoreAlbums } from '@/components/albums/load-more-albums';

interface ReciterDiscographyProps {
  reciterSlug: string;
  initialAlbums: AlbumDTO[];
  initialCursor: string | null;
}

/**
 * Reciter discography section — paginated album grid.
 *
 * Server Component — renders heading + delegates the grid to LoadMoreAlbums.
 */
export async function ReciterDiscography({
  reciterSlug,
  initialAlbums,
  initialCursor,
}: ReciterDiscographyProps): Promise<React.JSX.Element> {
  const t = await getTranslations('reciter.discography');

  return (
    <section aria-labelledby="discography-heading">
      <h2
        id="discography-heading"
        className="mb-6 font-serif text-2xl font-medium text-[var(--text)]"
      >
        {t('heading')}
      </h2>

      {initialAlbums.length === 0 ? (
        <p className="text-[var(--text-dim)]">{t('empty')}</p>
      ) : (
        <LoadMoreAlbums
          reciterSlug={reciterSlug}
          initialAlbums={initialAlbums}
          initialCursor={initialCursor}
        />
      )}
    </section>
  );
}
