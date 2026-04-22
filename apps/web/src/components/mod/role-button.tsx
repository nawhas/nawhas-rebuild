'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('mod.users');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState(currentRole);

  const options: { value: Role; label: string }[] = [
    { value: 'user', label: t('roleUser') },
    { value: 'contributor', label: t('roleContributor') },
  ];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const newRole = e.target.value as Role;
    if (newRole === role) return;
    // Guard: moderator promotion is not allowed via this UI.
    if (newRole === 'moderator') return;
    setError(null);
    const previous = role;
    setRole(newRole);
    startTransition(async () => {
      try {
        await setUserRole(userId, newRole);
        router.refresh();
      } catch (err) {
        setRole(previous);
        setError(err instanceof Error ? err.message : t('updateFailed'));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={role}
        onChange={handleChange}
        disabled={isPending || role === 'moderator'}
        aria-label={t('changeRoleLabel')}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {/* Show moderator as non-selectable option when user already has that role */}
        {role === 'moderator' && (
          <option value="moderator" disabled>
            {t('roleModerator')}
          </option>
        )}
      </select>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {isPending && <span className="text-xs text-muted-foreground">{t('saving')}</span>}
    </div>
  );
}
