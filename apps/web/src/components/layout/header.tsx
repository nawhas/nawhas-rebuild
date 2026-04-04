import Link from 'next/link';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { Container } from './container';
import { NavLinks } from './nav-links';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { SearchBar } from '@/components/search/search-bar';
import { MobileSearchOverlay } from '@/components/search/mobile-search-overlay';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/reciters', label: 'Browse Reciters' },
  { href: '/albums', label: 'Browse Albums' },
] as const satisfies ReadonlyArray<{ href: string; label: string }>;

/**
 * Persistent top navigation header rendered on every page via the root layout.
 *
 * Server Component — fetches auth session server-side so there is no
 * client-side flash of the unauthenticated state.
 *
 * Interactive sub-trees (UserMenu, MobileNav) are Client Components.
 */
export async function SiteHeader(): Promise<React.JSX.Element> {
  let user: User | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    user = session?.user ?? null;
  } catch {
    // Auth unavailable (e.g. during build or DB down) — render unauthenticated state
    user = null;
  }

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="relative sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Skip link for keyboard users — visible only on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:ring-2 focus:ring-gray-900 dark:focus:bg-gray-900 dark:focus:text-white"
      >
        Skip to main content
      </a>

      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Nawhas — go to home page"
            className="rounded text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:text-white"
          >
            Nawhas
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <NavLinks links={NAV_LINKS} className="hidden items-center md:flex" />

          {/* Desktop search bar — hidden on mobile */}
          <SearchBar />

          {/* Desktop auth + theme toggle — hidden on mobile */}
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile search icon — hidden on md+ */}
          <MobileSearchOverlay />

          {/* Mobile hamburger — hidden on md+ */}
          <MobileNav links={NAV_LINKS} user={user} />
        </div>
      </Container>
    </nav>
  );
}
