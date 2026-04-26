import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ReciterAvatar } from '@nawhas/ui';
import type { ReciterWithAlbumsDTO } from '@nawhas/types';

interface ReciterHeaderProps {
  reciter: ReciterWithAlbumsDTO;
}

/**
 * Reciter profile header — POC layout.
 *
 * 2-col grid (200px avatar + content): h1 name, optional bio paragraph,
 * optional location pin, album + track count stats, action pills
 * (Suggest edit / Add album).
 *
 * Server Component — pure presentation; renders translated strings via
 * `getTranslations`.
 */
export async function ReciterHeader({ reciter }: ReciterHeaderProps): Promise<React.JSX.Element> {
  const t = await getTranslations('reciter.header');

  const editHref = `/contribute/edit/reciter/${reciter.slug}`;
  const addAlbumHref = '/contribute/album/new';

  return (
    <header className="grid grid-cols-1 items-start gap-8 py-8 sm:grid-cols-[200px_1fr] sm:gap-10">
      <div className="h-[200px] w-[200px] shrink-0 self-start mx-auto sm:mx-0">
        <ReciterAvatar
          name={reciter.name}
          avatarUrl={reciter.avatarUrl ?? null}
          size="lg"
          fluid
        />
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-[2.5rem] font-bold tracking-tight text-[var(--text)] md:text-[3rem]">
          {reciter.name}
        </h1>

        {reciter.description && (
          <p className="max-w-[600px] text-base leading-relaxed text-[var(--text-dim)]">
            {reciter.description}
          </p>
        )}

        {reciter.country && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--text-faint)]">
            <PinIcon />
            <span>
              <span className="sr-only">{t('locationLabel')}: </span>
              {reciter.country}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div>
            <strong className="text-[var(--text)]">{reciter.albumCount}</strong>{' '}
            <span className="text-[var(--text-dim)]">{t('albumsLabel')}</span>
          </div>
          <div>
            <strong className="text-[var(--text)]">{reciter.trackCount}</strong>{' '}
            <span className="text-[var(--text-dim)]">{t('tracksLabel')}</span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2.5">
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            <PencilIcon />
            {t('suggestEdit')}
          </Link>
          <Link
            href={addAlbumHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            <span aria-hidden="true">+</span>
            {t('addAlbum')}
          </Link>
        </div>
      </div>
    </header>
  );
}

function PinIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PencilIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
