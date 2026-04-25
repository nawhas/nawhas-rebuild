import { cache } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from './container';
import { NavLinks } from './nav-links';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { SearchBar } from '@/components/search/search-bar';
import { MobileSearchOverlay } from '@/components/search/mobile-search-overlay';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const createCaller = createCallerFactory(appRouter);

/**
 * Fetch pending submission + access-request counts for the moderation
 * badge surfaced next to the "Mod" link. Returns null on any error so a
 * transient failure does not break the header for moderators.
 *
 * Wrapped with React `cache()` so multiple call sites within one render
 * share a single tRPC caller invocation.
 */
const getPendingCounts = cache(
  async (
    sessionData: Awaited<ReturnType<typeof auth.api.getSession>>,
  ): Promise<{ submissions: number; accessRequests: number } | null> => {
    if (!sessionData) return null;
    try {
      const caller = createCaller({
        db,
        session: sessionData.session,
        user: sessionData.user,
      });
      return await caller.moderation.pendingCounts();
    } catch {
      return null;
    }
  },
);

/**
 * Shared header UI used by both static and dynamic variants.
 *
 * Interactive sub-trees (UserMenu, MobileNav) are Client Components.
 */
async function SiteHeaderBase({
  user,
  pendingCount,
}: {
  user: User | null;
  pendingCount: number;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('nav');

  const NAV_LINKS = [
    { href: '/', label: t('home') },
    { href: '/library', label: t('library') },
    { href: '/reciters', label: t('browseReciters') },
    { href: '/albums', label: t('browseAlbums') },
    { href: '/changes', label: t('recentChanges') },
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
          {/* Wordmark — gradient "N" mark + Fraunces serif wordmark, matching POC */}
          <Link
            href="/"
            aria-label={t('logoLabel')}
            className="inline-flex items-center gap-2.5 rounded font-serif text-[22px] font-medium text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#7a1c1a_100%)] text-sm font-semibold text-white"
            >
              N
            </span>
            {t('logoText')}
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <NavLinks links={NAV_LINKS} className="hidden items-center md:flex" />

          {/* Desktop search bar — hidden on mobile */}
          <SearchBar />

          {/* Desktop auth + theme toggle — hidden on mobile */}
          <div className="hidden items-center gap-3 md:flex">
            {user && (user.role === 'contributor' || user.role === 'moderator') && (
              <Link
                href="/contribute"
                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
              >
                <span aria-hidden="true" className="text-[15px] leading-none">+</span>
                {t('contribute')}
              </Link>
            )}
            <ThemeToggle />
            {user ? (
              <UserMenu user={user} pendingCount={pendingCount} />
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
          <MobileNav links={NAV_LINKS} user={user} pendingCount={pendingCount} />
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
  return SiteHeaderBase({ user: null, pendingCount: 0 });
}

/**
 * Auth-aware header for dynamic routes.
 *
 * For moderators, additionally fetches pending submission + access-request
 * counts so the "Mod" link in the user menu / mobile nav can surface a
 * pending-count badge.
 */
export async function SiteHeaderDynamic(): Promise<React.JSX.Element> {
  let user: User | null = null;
  let pendingCount = 0;
  try {
    const sessionData = await auth.api.getSession({ headers: await headers() });
    user = sessionData?.user ?? null;
    if (user?.role === 'moderator') {
      const counts = await getPendingCounts(sessionData);
      pendingCount = counts ? counts.submissions + counts.accessRequests : 0;
    }
  } catch {
    // Auth unavailable (e.g. DB down) — render unauthenticated state.
    user = null;
    pendingCount = 0;
  }

  return SiteHeaderBase({ user, pendingCount });
}
