import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import type { TrackListItemDTO } from '@nawhas/types';

interface TopNawhasTableProps {
  tracks: TrackListItemDTO[];
}

/**
 * Top Nawhas ordered-list, numbered 1..N with clickable titles that route
 * to the canonical track detail page. Surfaces POC literal tokens
 * (--card-bg / --border / --text / --text-dim) for cohesion with the rest
 * of the home page.
 *
 * NOTE: The canonical <TrackRow> primitive from @nawhas/ui hard-codes its
 * title link to `/track/${slug}` — that route does not exist in this app
 * (canonical path is `/reciters/:reciterSlug/albums/:albumSlug/tracks/:trackSlug`).
 * Wave 1 Row 5 introduces a TrackRow href-extension; until then this section
 * keeps its bespoke row markup so links remain valid.
 *
 * Returns null when there are no tracks so the home page layout collapses
 * cleanly in empty-DB scenarios (tests, fresh installs).
 *
 * Server Component — pure presentation, no interactivity.
 */
export async function TopNawhasTable({
  tracks,
}: TopNawhasTableProps): Promise<React.JSX.Element | null> {
  const t = await getTranslations('home.sections');
  if (tracks.length === 0) return null;

  const headingId = 'top-nawhas-heading';

  return (
    <section aria-labelledby={headingId}>
      <SectionTitle id={headingId}>{t('topNawhas')}</SectionTitle>

      <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]">
        {tracks.map((track, index) => (
          <li
            key={track.id}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface)]"
          >
            <span
              aria-hidden="true"
              className="w-8 shrink-0 text-center font-serif text-2xl text-[var(--text-faint)]"
            >
              {index + 1}
            </span>
            <Link
              href={trackHref(track)}
              className="flex min-w-0 flex-1 flex-col rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <span className="truncate text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors">
                {track.title}
              </span>
              <span className="truncate text-xs text-[var(--text-dim)]">
                {track.reciterName}
                {track.albumTitle ? ` · ${track.albumTitle}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function trackHref(track: TrackListItemDTO): string {
  return `/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`;
}
