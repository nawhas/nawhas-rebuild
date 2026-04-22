import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import type { TrackListItemDTO } from '@nawhas/types';

interface TopNawhasTableProps {
  tracks: TrackListItemDTO[];
}

/**
 * Top Nawhas ordered-list, numbered 1..N with clickable titles that route
 * to the canonical track detail page. Uses the shared <SectionTitle> primitive
 * + semantic border/card tokens so the surface reads on light + dark themes
 * without overrides.
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

      <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {tracks.map((track, index) => (
          <li
            key={track.id}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <span
              aria-hidden="true"
              className="w-6 shrink-0 text-center font-mono text-sm text-muted-foreground"
            >
              {index + 1}
            </span>
            <Link
              href={trackHref(track)}
              className="flex min-w-0 flex-1 flex-col rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate text-sm font-medium text-foreground">
                {track.title}
              </span>
              <span className="truncate text-xs text-muted-foreground">
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
