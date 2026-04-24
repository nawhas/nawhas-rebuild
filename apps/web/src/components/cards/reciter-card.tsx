import Link from 'next/link';
import { ReciterAvatar } from '@nawhas/ui';
import type { ReciterDTO } from '@nawhas/types';

interface ReciterCardProps {
  reciter: ReciterDTO;
}

/**
 * Card displaying a reciter's avatar (or gradient initials fallback) and name.
 * Links to the reciter's profile page.
 *
 * Server Component — no interactivity required.
 */
export function ReciterCard({ reciter }: ReciterCardProps): React.JSX.Element {
  return (
    <Link
      href={`/reciters/${reciter.slug}`}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={`View ${reciter.name}'s profile`}
    >
      <ReciterAvatar name={reciter.name} avatarUrl={reciter.avatarUrl ?? null} size="md" />
      <span className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
        {reciter.name}
      </span>
    </Link>
  );
}
