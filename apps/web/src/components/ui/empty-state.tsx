interface EmptyStateAction {
  label: string;
  href: string;
}

interface EmptyStateProps {
  /** Short headline. */
  title: string;
  /** Explanatory sentence shown below the title. */
  description: string;
  /** Optional call-to-action link rendered as a button. */
  action?: EmptyStateAction;
}

/**
 * Reusable empty state shown when a listing has no results (e.g. empty search,
 * empty library, first-time user with no saved content).
 *
 * Server Component — no interactivity required.
 */
export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      {/* Icon placeholder */}
      <div
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-gray-400 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      {action && (
        <a
          href={action.href}
          className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
