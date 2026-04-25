import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CoverArt } from '@nawhas/ui';
import type { AlbumDetailDTO } from '@nawhas/types';

interface AlbumHeaderProps {
  album: AlbumDetailDTO;
}

/**
 * Album detail header: 320px cover + Fraunces title + reciter link +
 * "Released {year}" + description + action pills (Suggest edit / Add track).
 *
 * Server Component — composes Server-side i18n via `getTranslations`.
 */
export async function AlbumHeader({ album }: AlbumHeaderProps): Promise<React.JSX.Element> {
  const t = await getTranslations('albumDetail');

  const trackCount = album.tracks.length;
  const trackCountLabel =
    trackCount === 0 ? 'No tracks' :
    trackCount === 1 ? '1 track' :
    `${trackCount} tracks`;

  const editHref = `/contribute/edit/album/${album.reciterSlug}/${album.slug}`;
  const addTrackHref = '/contribute/track/new';

  return (
    <div className="grid grid-cols-1 items-start gap-12 sm:grid-cols-[320px_1fr] sm:gap-[60px]">
      <div className="aspect-square w-full max-w-[320px] shrink-0 overflow-hidden rounded-2xl">
        <CoverArt
          slug={album.slug}
          artworkUrl={album.artworkUrl}
          label={album.title}
          size="lg"
          fluid
        />
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-[0.15em] text-[var(--text-faint)]">
          {t('eyebrow')}
        </p>

        <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)] md:text-[3.5rem]">
          {album.title}
        </h1>

        <Link
          href={`/reciters/${album.reciterSlug}`}
          className="text-base font-medium text-[var(--accent-soft)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded"
        >
          {album.reciterName}
        </Link>

        <div className="flex flex-wrap gap-3 text-sm text-[var(--text-dim)]">
          {album.year && (
            <span>
              {t('releasedPrefix')} {album.year}
            </span>
          )}
          {album.year && (
            <span aria-hidden="true" className="text-[var(--text-faint)]">·</span>
          )}
          <span className="text-[var(--text-faint)]">{trackCountLabel}</span>
        </div>

        {album.description && (
          <p className="max-w-[500px] text-base leading-relaxed text-[var(--text)]">
            {album.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-2.5">
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            <PencilIcon />
            {t('suggestEdit')}
          </Link>
          <Link
            href={addTrackHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            <span aria-hidden="true">+</span>
            {t('addTrack')}
          </Link>
        </div>
      </div>
    </div>
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
