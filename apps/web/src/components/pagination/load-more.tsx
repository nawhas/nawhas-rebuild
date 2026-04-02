'use client';

interface LoadMoreProps {
  onLoadMore: () => void;
  isLoading: boolean;
}

/**
 * Generic "Load More" button for cursor-paginated lists.
 *
 * Client Component — handles click interaction and loading state display.
 */
export function LoadMore({ onLoadMore, isLoading }: LoadMoreProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={isLoading}
      aria-busy={isLoading}
      className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? 'Loading…' : 'Load More'}
    </button>
  );
}
