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
 *
 * Visual treatment per vocab:
 * - Default (non-moderator, not pending): secondary CTA style
 * - Disabled (moderator or isPending): opacity-50 cursor-not-allowed
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

  const isDisabled = isPending || role === 'moderator';

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
        disabled={isDisabled}
        aria-label={t('changeRoleLabel')}
        className={[
          'rounded-[8px] border px-3 py-1.5 text-xs transition-colors',
          'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
          isDisabled
            ? 'cursor-not-allowed opacity-50 border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)]'
            : 'border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] hover:border-[var(--border-strong)]',
        ].join(' ')}
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
      {error && (
        <p role="alert" className="text-xs text-[var(--color-error-500)]">
          {error}
        </p>
      )}
      <span role="status" aria-live="polite" className="text-xs text-[var(--text-dim)]">
        {isPending ? t('saving') : ''}
      </span>
    </div>
  );
}
