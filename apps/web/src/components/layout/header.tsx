import Link from 'next/link';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { Container } from './container';
import { NavLinks } from './nav-links';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { SearchBar } from '@/components/search/search-bar';
import { MobileSearchOverlay } from '@/components/search/mobile-search-overlay';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

/**
 * Shared header UI used by both static and dynamic variants.
 *
 * Interactive sub-trees (UserMenu, MobileNav) are Client Components.
 */
async function SiteHeaderBase({
  user,
}: {
  user: User | null;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('nav');

  const NAV_LINKS = [
    { href: '/', label: t('home') },
    { href: '/reciters', label: t('browseReciters') },
    { href: '/albums', label: t('browseAlbums') },
  ] as const satisfies ReadonlyArray<{ href: string; label: string }>;

  return (
    <nav
      role="navigation"
      aria-label={t('mainNavLabel')}
      className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur supports-[backdrop-filter]:bg-[var(--header-bg)]"
    >
      {/* Skip link for keyboard users — visible only on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
      >
        {t('skipToMainContent')}
      </a>

      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Wordmark — Fraunces serif in POC accent red */}
          <Link
            href="/"
            aria-label={t('logoLabel')}
            className="rounded font-serif text-2xl font-medium text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
          >
            {t('logoText')}
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
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
              >
                {t('signIn')}
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

/**
 * ISR-safe header for public pages.
 *
 * Does not call request-bound APIs (headers/cookies), so pages can remain
 * statically rendered or ISR without static-to-dynamic conflicts.
 */
export async function SiteHeaderStatic(): Promise<React.JSX.Element> {
  return SiteHeaderBase({ user: null });
}

/**
 * Auth-aware header for dynamic routes.
 */
export async function SiteHeaderDynamic(): Promise<React.JSX.Element> {
  let user: User | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    user = session?.user ?? null;
  } catch {
    // Auth unavailable (e.g. DB down) — render unauthenticated state.
    user = null;
  }

  return SiteHeaderBase({ user });
}
