import { getTranslations } from 'next-intl/server';
import type { AlbumDTO } from '@nawhas/types';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { LoadMoreAlbums } from '@/components/albums/load-more-albums';

interface ReciterDiscographyProps {
  reciterSlug: string;
  initialAlbums: AlbumDTO[];
  initialCursor: string | null;
}

/**
 * Displays a reciter's discography as a paginated album grid.
 *
 * Server Component — renders the section heading, then delegates the
 * interactive "Load More" grid to the <LoadMoreAlbums> client component.
 */
export async function ReciterDiscography({
  reciterSlug,
  initialAlbums,
  initialCursor,
}: ReciterDiscographyProps): Promise<React.JSX.Element> {
  const t = await getTranslations('reciter.discography');

  return (
    <section aria-labelledby="discography-heading">
      <SectionTitle id="discography-heading">{t('heading')}</SectionTitle>

      {initialAlbums.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
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
