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

interface UserMenuProps {
  user: User;
}

/**
 * Avatar button that opens a dropdown menu with Profile and Sign Out options.
 *
 * Backed by the Radix-powered <DropdownMenu> primitive — keyboard navigation,
 * focus trap, Escape/outside-click dismissal, aria roles and portal mounting
 * are handled by Radix. Client Component.
 */
export function UserMenu({ user }: UserMenuProps): React.JSX.Element {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${user.name ?? user.email}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* User info header */}
        <div className="border-b border-gray-100 px-2 py-1.5 dark:border-gray-700">
          {user.name && (
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {user.name}
            </p>
          )}
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">{t('profile')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
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
