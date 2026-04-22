import type { ReciterWithAlbumsDTO } from '@nawhas/types';

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
      {/* Avatar — initials placeholder */}
      <div
        aria-hidden="true"
        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted text-3xl font-semibold text-muted-foreground"
      >
        {initials}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground">{reciter.name}</h1>
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
