import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildMetadata } from '@/lib/metadata';
import { Container } from '@/components/layout/container';
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
    <main id="main-content" className="py-10">
      <Container size="md">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[13px]">
            <li>
              <Link href="/contribute" className="text-[var(--text-dim)] hover:text-[var(--text)]">
                Contribute
              </Link>
            </li>
            <li className="text-[var(--text-faint)]">/</li>
            <li aria-current="page" className="text-[var(--text)]">New album</li>
          </ol>
        </nav>
        <h1 className="mt-4 font-serif text-4xl font-medium text-[var(--text)]">
          {t('newAlbumTitle')}
        </h1>
        <p className="mt-2 text-base text-[var(--text-dim)]">
          {t('newAlbumSubtitle')}
        </p>
        <div className="mt-6 rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8">
          <AlbumForm action="create" />
        </div>
      </Container>
    </main>
  );
}
