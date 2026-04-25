import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import type { TrackListItemDTO } from '@nawhas/types';

interface TopNawhasTableProps {
  tracks: TrackListItemDTO[];
}

/**
 * Top Nawhas ordered-list, numbered 1..N with clickable titles that route
 * to the canonical track detail page.
 *
 * Stays bespoke (does not consume <TrackRow>) by design: TrackRow's
 * column-grid layout is built for table-density browsing with separate
 * reciter / poet / duration / plays cells. A top-N ranking is denser
 * with a stacked title + "{reciter} · {album}" subtitle, which is what
 * we render here. Same hover-bg-rule and POC tokens as TrackRow.
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
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
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
