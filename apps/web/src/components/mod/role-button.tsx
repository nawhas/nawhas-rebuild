'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setUserRole } from '@/server/actions/moderation';

type Role = 'user' | 'contributor' | 'moderator';

interface RoleButtonProps {
  userId: string;
  currentRole: string;
}

/**
 * Dropdown to promote/demote a user's role.
 * Moderator-to-moderator promotion is NOT exposed — ops-only via DB for M6.
 */
export function RoleButton({ userId, currentRole }: RoleButtonProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(currentRole);

  const options: { value: Role; label: string }[] = [
    { value: 'user', label: 'User' },
    { value: 'contributor', label: 'Contributor' },
  ];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const newRole = e.target.value as Role;
    if (newRole === role) return;
    setError(null);
    const previous = role;
    setRole(newRole);
    startTransition(async () => {
      try {
        await setUserRole(userId, newRole);
        router.refresh();
      } catch (err) {
        setRole(previous);
        setError(err instanceof Error ? err.message : 'Failed to update role.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={role}
        onChange={handleChange}
        disabled={isPending || role === 'moderator'}
        aria-label="Change user role"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {/* Show moderator as non-selectable option when user already has that role */}
        {role === 'moderator' && (
          <option value="moderator" disabled>
            Moderator
          </option>
        )}
      </select>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {isPending && <span className="text-xs text-gray-400">Saving…</span>}
    </div>
  );
}
