'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from '@/lib/auth-client';
import { NavLinks } from './nav-links';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PendingCountBadge } from '@/components/mod/pending-count-badge';
import type { User } from '@/lib/auth';

interface MobileNavProps {
  links: ReadonlyArray<{ href: string; label: string }>;
  user: User | null;
  pendingCount?: number;
}

/**
 * Hamburger button and collapsible mobile menu shown at viewports < 768px.
 *
 * Client Component — requires useState for open/close toggle.
 */
export function MobileNav({ links, user, pendingCount = 0 }: MobileNavProps): React.JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close(): void {
    setOpen(false);
  }

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'Escape') {
      close();
      triggerRef.current?.focus();
    }
  }

  async function handleSignOut(): Promise<void> {
    close();
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t('closeMenu') : t('openMenu')}
        className="rounded-[6px] p-2 text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-6 w-6"
          aria-hidden="true"
        >
          {open ? (
            /* X icon */
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            /* Hamburger icon */
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-menu"
          role="navigation"
          aria-label={t('mobileNavLabel')}
          onKeyDown={handleMenuKeyDown}
          className="absolute inset-x-0 top-16 z-40 border-b border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] px-4 pb-4 pt-2 shadow-menu"
        >
          <NavLinks links={links} className="flex flex-col" onClick={close} />

          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[var(--text-dim)]">{t('theme')}</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            {user ? (
              <div className="space-y-1">
                <div className="px-3 py-2">
                  {user.name && (
                    <p className="text-sm font-medium text-[var(--text)]">{user.name}</p>
                  )}
                  <p className="text-xs text-[var(--text-dim)]">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={close}
                  className="block rounded-[6px] px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
                >
                  {t('profile')}
                </Link>
                {(user.role === 'contributor' || user.role === 'moderator') && (
                  <Link
                    href="/contribute"
                    onClick={close}
                    className="block rounded-[6px] px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
                  >
                    {t('contribute')}
                  </Link>
                )}
                {user.role === 'moderator' && (
                  <Link
                    href="/mod"
                    onClick={close}
                    className="flex items-center justify-between rounded-[6px] px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
                  >
                    <span>{t('moderatorDashboard')}</span>
                    {pendingCount > 0 ? (
                      <PendingCountBadge
                        count={pendingCount}
                        label={`${pendingCount} items pending moderation`}
                      />
                    ) : (
                      <PendingCountBadge count={pendingCount} />
                    )}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full rounded-[6px] px-3 py-2 text-left text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
                >
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={close}
                className="block w-full rounded-[8px] bg-[var(--accent)] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
              >
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
