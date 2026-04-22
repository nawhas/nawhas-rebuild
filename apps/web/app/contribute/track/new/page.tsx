import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildMetadata } from '@/lib/metadata';
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
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-foreground">{t('newTrackTitle')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('newTrackSubtitle')}
      </p>
      <TrackForm action="create" />
    </main>
  );
}
