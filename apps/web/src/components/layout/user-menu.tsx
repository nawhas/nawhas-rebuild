'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@nawhas/ui/components/dropdown-menu';
import { signOut } from '@/lib/auth-client';
import type { User } from '@/lib/auth';
import { PendingCountBadge } from '@/components/mod/pending-count-badge';
import { RoleBadge } from './role-badge';

interface UserMenuProps {
  user: User;
  pendingCount?: number;
}

/**
 * Avatar button that opens a dropdown menu with Profile and Sign Out options.
 *
 * Backed by the Radix-powered <DropdownMenu> primitive — keyboard navigation,
 * focus trap, Escape/outside-click dismissal, aria roles and portal mounting
 * are handled by Radix. Client Component.
 */
export function UserMenu({ user, pendingCount = 0 }: UserMenuProps): React.JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    await signOut();
    router.push('/');
    router.refresh();
  }

  // Build initials: up to 2 chars from name, or first char of email
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0] ?? '?').toUpperCase();

  const username = (user as { username?: string | null }).username ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name ?? user.email}`}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      >
        {/* Profile picture (when present) falls back to gold/brown gradient initials */}
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-9 w-9 rounded-full border-2 border-[rgba(255,255,255,0.2)] object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[rgba(255,255,255,0.2)] bg-[linear-gradient(135deg,#8a6a4a_0%,#4a3a2a_100%)] text-xs font-semibold text-white"
          >
            {initials}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {/* User info header — name, @username, color-coded role badge */}
        <div className="border-b border-[var(--border)] px-3 py-3">
          {user.name && (
            <p className="truncate text-sm font-semibold text-[var(--text)]">
              {user.name}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            {username && (
              <span className="truncate text-xs text-[var(--text-faint)]">@{username}</span>
            )}
            <RoleBadge role={user.role} />
          </div>
        </div>
        <DropdownMenuItem asChild className="flex-col items-start gap-0 px-3 py-2">
          <Link href="/dashboard">
            <span className="text-sm font-medium text-[var(--text)]">{t('myDashboard')}</span>
            <span className="text-[11px] text-[var(--text-faint)]">{t('myDashboardSubtitle')}</span>
          </Link>
        </DropdownMenuItem>
        {username && (
          <DropdownMenuItem asChild className="flex-col items-start gap-0 px-3 py-2">
            <Link href={`/contributor/${username}`}>
              <span className="text-sm font-medium text-[var(--text)]">{t('publicProfile')}</span>
              <span className="text-[11px] text-[var(--text-faint)]">{t('publicProfileSubtitle')}</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="flex-col items-start gap-0 px-3 py-2">
          <Link href="/profile">
            <span className="text-sm font-medium text-[var(--text)]">{t('profile')}</span>
            <span className="text-[11px] text-[var(--text-faint)]">{t('accountSettingsSubtitle')}</span>
          </Link>
        </DropdownMenuItem>
        {user.role === 'moderator' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="px-3 py-2">
              <Link href="/mod" className="flex w-full items-start justify-between gap-2">
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
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-3 py-2"
          onSelect={(e) => {
            e.preventDefault();
            void handleSignOut();
          }}
        >
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
