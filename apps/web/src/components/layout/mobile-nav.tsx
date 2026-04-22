'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from '@/lib/auth-client';
import { NavLinks } from './nav-links';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import type { User } from '@/lib/auth';

interface MobileNavProps {
  links: ReadonlyArray<{ href: string; label: string }>;
  user: User | null;
}

/**
 * Hamburger button and collapsible mobile menu shown at viewports < 768px.
 *
 * Client Component — requires useState for open/close toggle.
 */
export function MobileNav({ links, user }: MobileNavProps): React.JSX.Element {
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
        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
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
          className="absolute inset-x-0 top-16 z-40 border-b border-border bg-card text-card-foreground px-4 pb-4 pt-2 shadow-menu"
        >
          <NavLinks links={links} className="flex flex-col" onClick={close} />

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted-foreground">{t('theme')}</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            {user ? (
              <div className="space-y-1">
                <div className="px-3 py-2">
                  {user.name && (
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={close}
                  className="block rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  {t('profile')}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full rounded px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={close}
                className="block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary-700 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
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
