import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { TrackDTO } from '@nawhas/types';
import { TrackListRow } from './track-list-row';

interface TrackListProps {
  tracks: TrackDTO[];
  reciterSlug: string;
  albumSlug: string;
  /** Optional add-track URL — surfaces a small "+ Add track" pill in the heading row when provided. */
  addTrackHref?: string;
}

/**
 * Ordered track list for the album detail page.
 *
 * Server Component — data is passed as props from the album page.
 * Each row is rendered via the TrackListRow client wrapper, which
 * threads the per-row TrackPlayButton + add-to-queue affordances
 * around the canonical <TrackRow> primitive from @nawhas/ui.
 *
 * Borders between rows come from `divide-y` on this <ol> — TrackRow
 * itself is borderless (consumers own the divider style so it works
 * regardless of how rows are wrapped).
 */
export async function TrackList({
  tracks,
  reciterSlug,
  albumSlug,
  addTrackHref,
}: TrackListProps): Promise<React.JSX.Element> {
  const t = await getTranslations('albumDetail');

  return (
    <section aria-labelledby="track-list-heading">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="track-list-heading"
          className="font-serif text-2xl font-medium text-[var(--text)]"
        >
          {t('tracksHeading')}
        </h2>
        {addTrackHref !== undefined && (
          <Link
            href={addTrackHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            <span aria-hidden="true">+</span>
            {t('addTrackShort')}
          </Link>
        )}
      </div>

      {tracks.length === 0 ? (
        <p className="text-[var(--text-dim)]">No tracks available yet.</p>
      ) : (
        <ol
          aria-label={`${tracks.length} track${tracks.length !== 1 ? 's' : ''}`}
          className="flex flex-col divide-y divide-[var(--border)]"
        >
          {tracks.map((track, index) => (
            <TrackListRow
              key={track.id}
              track={track}
              trackNumber={track.trackNumber ?? index + 1}
              href={`/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${track.slug}`}
              reciterSlug={reciterSlug}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
