import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Contribute',
  description: 'Submit reciters, albums, and tracks to the Nawhas library.',
});

/**
 * /contribute — Contributor landing page.
 *
 * Access guard is enforced by the /contribute layout.
 * Shows what a contributor can submit and links to each form.
 */
export default async function ContributePage(): Promise<React.JSX.Element> {
  const t = await getTranslations('contribute.landing');

  const items = [
    { href: '/contribute/reciter/new', label: t('newReciter'), description: t('newReciterDescription') },
    { href: '/contribute/album/new', label: t('newAlbum'), description: t('newAlbumDescription') },
    { href: '/contribute/track/new', label: t('newTrack'), description: t('newTrackDescription') },
  ];

  return (
    <main id="main-content" className="mx-auto max-w-2xl py-10 px-4">
      <h1 className="mb-2 text-3xl font-bold text-foreground">{t('heading')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {t('intro')}
      </p>

      {/* New content */}
      <section aria-label={t('addNewSectionLabel')} className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-foreground uppercase tracking-wider">
          {t('addNewHeading')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col rounded-lg border border-border bg-card p-4 hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="font-medium text-foreground">{label}</span>
              <span className="mt-1 text-xs text-muted-foreground">{description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Contributions history */}
      <section aria-label={t('yourContributionsSectionLabel')}>
        <h2 className="mb-3 text-base font-semibold text-foreground uppercase tracking-wider">
          {t('yourContributionsHeading')}
        </h2>
        <Link
          href="/profile/contributions"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {t('viewHistory')}
        </Link>
      </section>
    </main>
  );
}
