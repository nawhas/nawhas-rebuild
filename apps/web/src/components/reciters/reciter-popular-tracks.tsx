import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CoverArt } from '@nawhas/ui';
import type { TrackListItemDTO } from '@nawhas/types';

interface ReciterPopularTracksProps {
  tracks: TrackListItemDTO[];
}

/**
 * Reciter-detail "Popular Tracks" section — POC layout.
 *
 * 3-column responsive grid of cover-art cards (cover + title + album year).
 * Backed temporarily by `track.getPopularByReciter` (newest-first proxy);
 * real popularity windowing tracked alongside the home-page Trending
 * follow-up in the rebuild roadmap.
 *
 * Returns null when the list is empty so the surrounding layout collapses.
 *
 * Server Component — pure presentation.
 */
export async function ReciterPopularTracks({
  tracks,
}: ReciterPopularTracksProps): Promise<React.JSX.Element | null> {
  if (tracks.length === 0) return null;
  const t = await getTranslations('reciter.popularTracks');
  const headingId = 'reciter-popular-tracks-heading';

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="mb-6 font-serif text-2xl font-medium text-[var(--text)]"
      >
        {t('heading')}
      </h2>

      <ul
        role="list"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3"
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
              {track.albumYear != null && (
                <p className="text-xs text-[var(--text-dim)]">{track.albumYear}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
