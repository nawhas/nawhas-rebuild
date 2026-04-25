'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PendingCountBadge } from './pending-count-badge';

interface ModNavItem {
  href: string;
  label: string;
  count?: number;
}

interface ModNavProps {
  items: ModNavItem[];
}

/**
 * Client component: mod sub-nav with active state derived from pathname.
 * Active link gets aria-current="page" per Wave 3 pattern.
 *
 * Items may carry an optional pending count which renders as a small
 * accent-colored badge to the right of the label. The badge component
 * returns null when the count is 0, so callers can pass `count: 0`
 * unconditionally.
 */
export function ModNav({ items }: ModNavProps): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Moderation navigation"
      className="flex items-center gap-1 border-b border-[var(--border)] pb-4"
    >
      {items.map(({ href, label, count }) => {
        const isActive = href === '/mod' ? pathname === '/mod' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'inline-flex items-center rounded-[6px] px-3 py-1.5 text-[14px] transition-colors',
              'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
              isActive
                ? 'bg-[var(--surface-2)] font-medium text-[var(--text)]'
                : 'text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)]',
            ].join(' ')}
          >
            {label}
            {count !== undefined && (
              <PendingCountBadge count={count} label={`${count} ${label} pending`} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
