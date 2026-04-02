'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import type { User } from '@/lib/auth';

interface UserMenuProps {
  user: User;
}

/**
 * Avatar button that opens a dropdown menu with Profile and Sign Out options.
 *
 * Client Component — requires interactivity for the dropdown toggle.
 */
export function UserMenu({ user }: UserMenuProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the menu
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  async function handleSignOut(): Promise<void> {
    setOpen(false);
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
    : user.email.charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name ?? user.email}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {/* User info header */}
          <div className="border-b border-gray-100 px-4 py-2">
            {user.name && (
              <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
            )}
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>

          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          >
            Profile
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
