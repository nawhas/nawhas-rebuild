'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

interface NavLinksProps {
  links: ReadonlyArray<NavLink>;
  /** Wrapper element className */
  className?: string;
  /** Called when any link is clicked (e.g. to close a mobile menu) */
  onClick?: () => void;
}

/**
 * Renders nav links with active state derived from the current pathname.
 *
 * Client Component — requires usePathname() for active-state highlighting.
 */
export function NavLinks({ links, className = '', onClick }: NavLinksProps): React.JSX.Element {
  const pathname = usePathname();

  return (
    <div className={className}>
      {links.map(({ href, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            {...(onClick !== undefined && { onClick })}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
              isActive
                ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
