import Link from 'next/link';
import type { ReciterDTO } from '@nawhas/types';

interface ReciterCardProps {
  reciter: ReciterDTO;
}

/**
 * Card displaying a reciter's initials avatar and name.
 * Links to the reciter's profile page.
 *
 * Server Component — no interactivity required.
 */
export function ReciterCard({ reciter }: ReciterCardProps): React.JSX.Element {
  // Derive initials from the reciter's name (up to two words).
  const initials = reciter.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Link
      href={`/reciters/${reciter.slug}`}
      className="group flex flex-col items-center gap-3 rounded-lg p-4 text-center transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:hover:bg-gray-800"
      aria-label={`View ${reciter.name}'s profile`}
    >
      {/* Avatar — initials placeholder until avatar images are supported */}
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-700 transition-colors group-hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:group-hover:bg-gray-600"
      >
        {initials}
      </div>

      <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-100">
        {reciter.name}
      </span>
    </Link>
  );
}
