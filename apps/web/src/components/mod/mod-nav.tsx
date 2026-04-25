'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ModNavItem {
  href: string;
  label: string;
}

interface ModNavProps {
  items: ModNavItem[];
}

/**
 * Client component: mod sub-nav with active state derived from pathname.
 * Active link gets aria-current="page" per Wave 3 pattern.
 */
export function ModNav({ items }: ModNavProps): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Moderation navigation"
      className="flex items-center gap-1 border-b border-[var(--border)] pb-4"
    >
      {items.map(({ href, label }) => {
        const isActive = href === '/mod' ? pathname === '/mod' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'rounded-[6px] px-3 py-1.5 text-[14px] transition-colors',
              'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
              isActive
                ? 'bg-[var(--surface-2)] font-medium text-[var(--text)]'
                : 'text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)]',
            ].join(' ')}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
