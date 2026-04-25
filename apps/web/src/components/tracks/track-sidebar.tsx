import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CoverArt } from '@nawhas/ui';
import type { TrackListItemDTO, TrackWithRelationsDTO } from '@nawhas/types';

interface TrackSidebarProps {
  track: TrackWithRelationsDTO;
  related: TrackListItemDTO[];
}

/**
 * Track-detail right-hand sidebar — POC layout.
 *
 * Two stacked cards:
 *   1. Album mini-card (cover + title + year, linked to album detail)
 *   2. Related tracks list — up to 8 other tracks by the same reciter,
 *      each linking to its canonical track URL.
 *
 * Server Component — pure presentation.
 */
export async function TrackSidebar({ track, related }: TrackSidebarProps): Promise<React.JSX.Element> {
  const t = await getTranslations('trackDetail.sidebar');

  return (
    <aside className="flex flex-col gap-8" aria-label={t('regionLabel')}>
      <section aria-labelledby="track-sidebar-album-heading">
        <h3
          id="track-sidebar-album-heading"
          className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-faint)]"
        >
          {t('albumHeading')}
        </h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <Link
            href={`/albums/${track.album.slug}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            <div className="aspect-square w-full overflow-hidden rounded-xl">
              <CoverArt
                slug={track.album.slug}
                artworkUrl={track.album.artworkUrl}
                fluid
                elevation="flat"
              />
            </div>
            <p className="mt-4 text-sm font-medium text-[var(--text)]">
              {track.album.title}
            </p>
            {track.album.year != null && (
              <p className="mt-1 text-xs text-[var(--text-faint)]">{track.album.year}</p>
            )}
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="track-sidebar-related-heading">
          <h3
            id="track-sidebar-related-heading"
            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-faint)]"
          >
            {t('relatedHeading')}
          </h3>
          <ul
            role="list"
            className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
          >
            {related.map((rel) => (
              <li key={rel.id}>
                <Link
                  href={`/reciters/${rel.reciterSlug}/albums/${rel.albumSlug}/tracks/${rel.slug}`}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-[-2px]"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    <CoverArt slug={rel.slug} fluid elevation="flat" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
                      {rel.title}
                    </p>
                    <p className="truncate text-xs text-[var(--text-faint)]">
                      {rel.reciterName}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
