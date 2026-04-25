import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CoverArt } from '@nawhas/ui';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { formatDuration } from '@nawhas/ui/lib/format-duration';
import type { TrackListItemDTO } from '@nawhas/types';

interface PopularTracksProps {
  tracks: TrackListItemDTO[];
}

/**
 * Home-page "Most Popular Tracks" section — POC 2-column card grid.
 *
 * Each card is `[80px cover] [title / reciter / duration]`, matching POC's
 * surface/border treatment. Currently shows duration; a real "plays count"
 * subtitle is tracked as a Phase 2.6 follow-up alongside the trending-data
 * follow-up (both blocked on the same play-event source).
 *
 * Server Component — pure presentation, no interactivity.
 */
export async function PopularTracks({
  tracks,
}: PopularTracksProps): Promise<React.JSX.Element | null> {
  if (tracks.length === 0) return null;
  const t = await getTranslations('home.sections');
  const headingId = 'popular-tracks-heading';

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <SectionTitle id={headingId} className="mb-0">
          {t('popularTracks')}
        </SectionTitle>
        <Link
          href="/library"
          className="whitespace-nowrap text-sm text-[var(--accent-soft)] transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          {t('seeAll')}
        </Link>
      </div>

      <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tracks.map((track) => (
          <li key={track.id}>
            <Link
              href={`/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`}
              className="group grid grid-cols-[80px_1fr] items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              <div className="aspect-square overflow-hidden rounded-lg">
                <CoverArt slug={track.slug} fluid elevation="flat" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                  {track.title}
                </p>
                <p className="truncate text-xs text-[var(--text-dim)]">
                  {track.reciterName}
                </p>
                {track.duration != null && (
                  <p className="mt-1 text-[11px] tabular-nums text-[var(--text-faint)]">
                    {formatDuration(track.duration)}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
