import type { ReciterWithAlbumsDTO } from '@nawhas/types';
import { getPlaceholderStyle, PLACEHOLDER_CLASSES } from '@/lib/placeholder-color';

interface ReciterHeaderProps {
  reciter: ReciterWithAlbumsDTO;
}

/**
 * Reciter profile header: initials avatar, name, and album count.
 *
 * Server Component — no interactivity required.
 */
export function ReciterHeader({ reciter }: ReciterHeaderProps): React.JSX.Element {
  // Derive initials from the reciter's name (up to two words).
  const initials = reciter.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  const albumCount = reciter.albums.length;

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:items-start sm:text-left">
      {/* Avatar — deterministic tinted placeholder. */}
      <div
        aria-hidden="true"
        style={getPlaceholderStyle(reciter.slug)}
        className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-semibold ${PLACEHOLDER_CLASSES}`}
      >
        {initials}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-slab text-[2.5rem] font-bold tracking-tight text-foreground md:text-[3.5rem]">
          {reciter.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {albumCount === 0
            ? 'No albums yet'
            : albumCount === 1
              ? '1 album'
              : `${albumCount} albums`}
        </p>
      </div>
    </div>
  );
}
