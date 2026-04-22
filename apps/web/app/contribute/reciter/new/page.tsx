import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildMetadata } from '@/lib/metadata';
import { ReciterForm } from '@/components/contribute/reciter-form';

export const metadata: Metadata = buildMetadata({
  title: 'New Reciter Submission',
  description: 'Submit a new reciter for review.',
});

/**
 * /contribute/reciter/new — New reciter submission form.
 * Access guard enforced by /contribute layout.
 */
export default async function NewReciterPage(): Promise<React.JSX.Element> {
  const t = await getTranslations('contribute.pages');
  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-foreground">{t('newReciterTitle')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('newReciterSubtitle')}
      </p>
      <ReciterForm action="create" />
    </main>
  );
}
