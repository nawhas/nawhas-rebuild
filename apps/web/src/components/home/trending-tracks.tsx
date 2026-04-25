import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CoverArt } from '@nawhas/ui';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import type { TrackListItemDTO } from '@nawhas/types';

interface TrendingTracksProps {
  tracks: TrackListItemDTO[];
}

/**
 * Home-page "Trending This Month" strip — POC restoration (Phase 2.6).
 *
 * Visual layout matches POC: 5-column responsive grid of cover + title +
 * reciter name. Backed temporarily by `home.getTopTracks` (newest-first
 * proxy). A real popularity window — last-30-days play counts driving a
 * `home.getTrendingTracks({ window: '30d' })` procedure — is tracked as a
 * Phase 2.6 follow-up in the rebuild roadmap.
 *
 * Returns null when there are no tracks so the home page collapses
 * gracefully on empty databases.
 *
 * Server Component — pure presentation, no interactivity.
 */
export async function TrendingTracks({
  tracks,
}: TrendingTracksProps): Promise<React.JSX.Element | null> {
  if (tracks.length === 0) return null;
  const t = await getTranslations('home.sections');
  const headingId = 'trending-tracks-heading';

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <SectionTitle id={headingId} className="mb-0">
          {t('trendingThisMonth')}
        </SectionTitle>
        <Link
          href="/library"
          className="whitespace-nowrap text-sm text-[var(--accent-soft)] transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          {t('seeAll')}
        </Link>
      </div>

      <ul
        role="list"
        className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {tracks.map((track) => (
          <li key={track.id}>
            <Link
              href={`/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              <div className="aspect-square overflow-hidden rounded-2xl">
                <CoverArt slug={track.slug} fluid elevation="flat" />
              </div>
              <p className="mt-3 truncate text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
                {track.title}
              </p>
              <p className="truncate text-xs text-[var(--text-dim)]">
                {track.reciterName}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
