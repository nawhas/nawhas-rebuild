import { Skeleton } from './skeleton';

/**
 * Skeleton placeholder matching AlbumListCard / AlbumCard dimensions.
 * Prevents layout shift while album data loads.
 *
 * Server Component — purely presentational.
 */
export function AlbumCardSkeleton(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg">
      {/* Artwork — aspect-square matches album cover */}
      <Skeleton className="aspect-square w-full rounded-lg" />
      {/* Metadata lines */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
