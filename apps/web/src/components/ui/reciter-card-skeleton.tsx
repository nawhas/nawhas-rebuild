import { Skeleton } from './skeleton';

/**
 * Skeleton placeholder matching ReciterCard dimensions.
 * Prevents layout shift while reciter data loads.
 *
 * Server Component — purely presentational.
 */
export function ReciterCardSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center gap-3 rounded-lg p-4"
    >
      {/* Avatar circle — matches h-16 w-16 rounded-full in ReciterCard */}
      <Skeleton className="h-16 w-16 rounded-full" />
      {/* Name line */}
      <Skeleton className="h-4 w-20" />
    </div>
  );
}
