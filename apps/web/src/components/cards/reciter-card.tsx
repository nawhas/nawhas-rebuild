import Link from 'next/link';
import { ReciterAvatar } from '@nawhas/ui';
import type { ReciterDTO, ReciterFeaturedDTO } from '@nawhas/types';

interface ReciterCardProps {
  /**
   * Reciter to render. When passed a `ReciterFeaturedDTO` (i.e. a row from
   * `reciter.list` or `home.getFeatured`), the card surfaces the
   * "{N} tracks · {N} albums" subtitle. Plain `ReciterDTO` rows render
   * without the subtitle.
   */
  reciter: ReciterDTO | ReciterFeaturedDTO;
}

/**
 * Card displaying a reciter's avatar (or gradient initials fallback), name,
 * and — when counts are available — a "{N} tracks · {N} albums" subtitle.
 * Links to the reciter's profile page.
 *
 * Server Component — no interactivity required.
 */
export function ReciterCard({ reciter }: ReciterCardProps): React.JSX.Element {
  const hasCounts = 'albumCount' in reciter && 'trackCount' in reciter;

  return (
    <Link
      href={`/reciters/${reciter.slug}`}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-center transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      aria-label={`View ${reciter.name}'s profile`}
    >
      <div className="h-16 w-16">
        <ReciterAvatar name={reciter.name} avatarUrl={reciter.avatarUrl ?? null} size="md" fluid />
      </div>
      <span className="text-base font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
        {reciter.name}
      </span>
      {hasCounts && (
        <span className="text-xs text-[var(--text-faint)]">
          {reciter.trackCount} tracks · {reciter.albumCount} albums
        </span>
      )}
    </Link>
  );
}
