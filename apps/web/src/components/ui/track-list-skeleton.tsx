import { Skeleton } from './skeleton';

interface TrackListSkeletonProps {
  /** Number of skeleton track rows to render. Defaults to 8. */
  count?: number;
}

/**
 * Skeleton placeholder matching TrackList dimensions.
 * Renders bordered rows that mirror the real track list layout.
 *
 * Server Component — purely presentational.
 */
export function TrackListSkeleton({ count = 8 }: TrackListSkeletonProps): React.JSX.Element {
  return (
    <div aria-hidden="true">
      {/* Section heading placeholder */}
      <Skeleton className="mb-4 h-6 w-20" />

      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            {/* Track number */}
            <Skeleton className="h-4 w-4 shrink-0" />
            {/* Track title */}
            <Skeleton className="h-4 flex-1" />
            {/* Duration */}
            <Skeleton className="h-3 w-8 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
