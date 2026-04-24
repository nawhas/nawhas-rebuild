interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton shimmer block.
 * Renders an animated pulse placeholder in a given shape.
 *
 * Server Component — purely presentational.
 */
export function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[8px] bg-[var(--surface)] ${className}`}
    />
  );
}
