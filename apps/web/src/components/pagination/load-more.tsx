'use client';

import { useTranslations } from 'next-intl';

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
  const t = useTranslations('common');

  return (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={isLoading}
      aria-busy={isLoading}
      className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-6 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? t('loading') : t('loadMore')}
    </button>
  );
}
