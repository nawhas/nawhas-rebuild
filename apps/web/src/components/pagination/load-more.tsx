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
      className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-6 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? t('loading') : t('loadMore')}
    </button>
  );
}
