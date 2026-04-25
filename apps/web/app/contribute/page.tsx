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
      <h1 className="mb-2 font-serif text-4xl font-medium text-[var(--text)]">{t('heading')}</h1>
      <p className="mb-8 text-base text-[var(--text-dim)]">
        {t('intro')}
      </p>

      {/* New content */}
      <section aria-label={t('addNewSectionLabel')} className="mb-8">
        <h2 className="mb-4 font-serif text-2xl font-medium text-[var(--text)]">
          {t('addNewHeading')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {items.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="block rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <span className="font-serif text-xl font-medium text-[var(--text)]">{label}</span>
              <span className="mt-1 block text-sm text-[var(--text-dim)]">{description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Contributions history */}
      <section aria-label={t('yourContributionsSectionLabel')}>
        <h2 className="mb-4 font-serif text-2xl font-medium text-[var(--text)]">
          {t('yourContributionsHeading')}
        </h2>
        <Link
          href="/profile/contributions"
          className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          {t('viewHistory')}
        </Link>
      </section>
    </main>
  );
}
