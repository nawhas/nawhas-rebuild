'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from '@/lib/auth-client';
import { NavLinks } from './nav-links';
import { RoleBadge } from './role-badge';
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
              <UserSection
                user={user}
                pendingCount={pendingCount}
                onClose={close}
                onSignOut={handleSignOut}
                t={t}
              />
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

interface UserSectionProps {
  user: User;
  pendingCount: number;
  onClose: () => void;
  onSignOut: () => void;
  t: ReturnType<typeof useTranslations<'nav'>>;
}

/**
 * Authenticated user block inside the mobile slide-out — mirrors the desktop
 * UserMenu dropdown (POC dropdown style): name + @username + role badge,
 * followed by My Dashboard / Public profile / Account settings, then a
 * separator before role-gated Contribute and Moderation queue, then Sign Out.
 */
function UserSection({
  user,
  pendingCount,
  onClose,
  onSignOut,
  t,
}: UserSectionProps): React.JSX.Element {
  const username = (user as { username?: string | null }).username ?? null;

  return (
    <div className="space-y-1">
      <div className="px-3 py-3">
        {user.name && (
          <p className="truncate text-sm font-semibold text-[var(--text)]">{user.name}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          {username && (
            <span className="truncate text-xs text-[var(--text-faint)]">@{username}</span>
          )}
          <RoleBadge role={user.role} />
        </div>
      </div>

      <MobileMenuLink href="/dashboard" label={t('myDashboard')} subtitle={t('myDashboardSubtitle')} onClick={onClose} />
      {username && (
        <MobileMenuLink
          href={`/contributor/${username}`}
          label={t('publicProfile')}
          subtitle={t('publicProfileSubtitle')}
          onClick={onClose}
        />
      )}
      <MobileMenuLink href="/profile" label={t('profile')} subtitle={t('accountSettingsSubtitle')} onClick={onClose} />

      {(user.role === 'contributor' || user.role === 'moderator') && (
        <>
          <div className="my-2 border-t border-[var(--border)]" />
          <MobileMenuLink
            href="/contribute"
            label={t('contribute')}
            subtitle={t('contributeSubtitle')}
            onClick={onClose}
          />
          {user.role === 'moderator' && (
            <Link
              href="/mod"
              onClick={onClose}
              className="flex items-start justify-between gap-2 rounded-[6px] px-3 py-2 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-[var(--accent)]">{t('moderatorDashboard')}</span>
                <span className="text-[11px] text-[var(--text-faint)]">{t('moderationQueueSubtitle')}</span>
              </span>
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
        </>
      )}

      <div className="my-2 border-t border-[var(--border)]" />
      <button
        type="button"
        onClick={onSignOut}
        className="block w-full rounded-[6px] px-3 py-2 text-left text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      >
        {t('signOut')}
      </button>
    </div>
  );
}

function MobileMenuLink({
  href,
  label,
  subtitle,
  onClick,
}: {
  href: string;
  label: string;
  subtitle: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex flex-col rounded-[6px] px-3 py-2 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
    >
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      <span className="text-[11px] text-[var(--text-faint)]">{subtitle}</span>
    </Link>
  );
}
