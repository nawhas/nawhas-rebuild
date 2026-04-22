import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildMetadata } from '@/lib/metadata';
import { AlbumForm } from '@/components/contribute/album-form';

export const metadata: Metadata = buildMetadata({
  title: 'New Album Submission',
  description: 'Submit a new album for review.',
});

/**
 * /contribute/album/new — New album submission form.
 * Access guard enforced by /contribute layout.
 */
export default async function NewAlbumPage(): Promise<React.JSX.Element> {
  const t = await getTranslations('contribute.pages');
  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-foreground">{t('newAlbumTitle')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('newAlbumSubtitle')}
      </p>
      <AlbumForm action="create" />
    </main>
  );
}
