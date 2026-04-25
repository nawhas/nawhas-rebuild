import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildMetadata } from '@/lib/metadata';
import { Container } from '@/components/layout/container';
import { TrackForm } from '@/components/contribute/track-form';

export const metadata: Metadata = buildMetadata({
  title: 'New Track Submission',
  description: 'Submit a new track for review.',
});

/**
 * /contribute/track/new — New track submission form.
 * Access guard enforced by /contribute layout.
 */
export default async function NewTrackPage(): Promise<React.JSX.Element> {
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
            <li aria-current="page" className="text-[var(--text)]">New track</li>
          </ol>
        </nav>
        <h1 className="mt-4 font-serif text-4xl font-medium text-[var(--text)]">
          {t('newTrackTitle')}
        </h1>
        <p className="mt-2 text-base text-[var(--text-dim)]">
          {t('newTrackSubtitle')}
        </p>
        <div className="mt-6 rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8">
          <TrackForm action="create" />
        </div>
      </Container>
    </main>
  );
}
