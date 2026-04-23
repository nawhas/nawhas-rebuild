import Link from 'next/link';
import { Card } from '@nawhas/ui/components/card';
import type { ReciterDTO } from '@nawhas/types';
import { getPlaceholderStyle, PLACEHOLDER_CLASSES } from '@/lib/placeholder-color';

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
      className="group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`View ${reciter.name}'s profile`}
    >
      <Card className="flex flex-col items-center gap-3 p-4 text-center transition-colors hover:bg-muted">
        {/* Avatar — deterministic tinted placeholder until avatar images are supported. */}
        <div
          aria-hidden="true"
          style={getPlaceholderStyle(reciter.slug)}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold ${PLACEHOLDER_CLASSES}`}
        >
          {initials}
        </div>

        <span className="text-sm font-medium text-foreground group-hover:text-muted-foreground">
          {reciter.name}
        </span>
      </Card>
    </Link>
  );
}
