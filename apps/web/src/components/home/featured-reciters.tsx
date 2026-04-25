import Link from 'next/link';
import { ReciterAvatar } from '@nawhas/ui';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import type { ReciterFeaturedDTO } from '@nawhas/types';

interface FeaturedRecitersProps {
  reciters: ReciterFeaturedDTO[];
}

/**
 * Home-page "Top Reciters" section.
 *
 * POC layout: flat (no card chrome) avatar + name + "{N} albums · {N} tracks"
 * subtitle, in a 2/3/4-column responsive grid. Aggregated counts come from
 * `home.getFeatured` so the section stays a single SQL round-trip.
 *
 * Server Component — pure presentation, no interactivity.
 */
export function FeaturedReciters({ reciters }: FeaturedRecitersProps): React.JSX.Element | null {
  if (reciters.length === 0) {
    return null;
  }

  const headingId = 'featured-reciters-heading';

  return (
    <section aria-labelledby={headingId}>
      <SectionTitle id={headingId}>Top Reciters</SectionTitle>

      <ul
        role="list"
        className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4"
      >
        {reciters.map((reciter) => (
          <li key={reciter.id}>
            <Link
              href={`/reciters/${reciter.slug}`}
              className="group flex flex-col items-center gap-3 rounded-lg p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              aria-label={`View ${reciter.name}'s profile`}
            >
              <div className="h-24 w-24">
                <ReciterAvatar
                  name={reciter.name}
                  avatarUrl={reciter.avatarUrl ?? null}
                  size="lg"
                  fluid
                />
              </div>
              <span className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                {reciter.name}
              </span>
              <span className="text-xs text-[var(--text-faint)]">
                {reciter.albumCount} albums · {reciter.trackCount} tracks
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
