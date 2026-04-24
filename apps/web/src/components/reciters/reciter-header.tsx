import { ReciterAvatar } from '@nawhas/ui';
import type { ReciterWithAlbumsDTO } from '@nawhas/types';

interface ReciterHeaderProps {
  reciter: ReciterWithAlbumsDTO;
}

/**
 * Reciter profile header: large gradient avatar (or photo when present),
 * Fraunces serif name, album count metadata.
 *
 * When the backend gains description / country / verified-badge fields,
 * extend this component to render them — the visual vocabulary doc
 * specifies the slot below the album count.
 *
 * Server Component — no interactivity required.
 */
export function ReciterHeader({ reciter }: ReciterHeaderProps): React.JSX.Element {
  const albumCount = reciter.albums.length;
  const albumCountLabel =
    albumCount === 0
      ? 'No albums yet'
      : albumCount === 1
        ? '1 album'
        : `${albumCount} albums`;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center sm:flex-row sm:items-start sm:text-left">
      <ReciterAvatar
        name={reciter.name}
        avatarUrl={reciter.avatarUrl ?? null}
        size="lg"
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)] md:text-[3.5rem]">
          {reciter.name}
        </h1>
        <p className="text-sm text-[var(--text-dim)]">{albumCountLabel}</p>
      </div>
    </div>
  );
}
