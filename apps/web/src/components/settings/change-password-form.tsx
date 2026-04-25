'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { changePassword } from '@/server/actions/account';

export function ChangePasswordForm(): React.JSX.Element {
  const t = useTranslations('settings');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const err = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    }
  }

  return (
    <section aria-labelledby="password-heading">
      <h2 id="password-heading" className="font-serif text-2xl font-medium text-[var(--text)]">
        {t('passwordHeading')}
      </h2>

      <form onSubmit={handleSubmit} noValidate className="mt-6 max-w-sm space-y-6">
        <div>
          <label htmlFor="current-password" className="block text-[13px] font-medium text-[var(--text-dim)] mb-2">
            {t('currentPasswordLabel')}
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            aria-required="true"
            autoComplete="current-password"
            disabled={loading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'change-password-error' : undefined}
            className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="block text-[13px] font-medium text-[var(--text-dim)] mb-2">
            {t('newPasswordLabel')}
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            aria-required="true"
            minLength={8}
            autoComplete="new-password"
            disabled={loading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'new-password-hint change-password-error' : 'new-password-hint'}
            className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50"
          />
          <p id="new-password-hint" className="mt-2 text-[13px] text-[var(--text-faint)]">{t('passwordMinLength')}</p>
        </div>

        {error && (
          <p id="change-password-error" role="alert" className="text-[13px] text-[var(--color-error-500)] mt-2">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-[8px] bg-[var(--color-success-50)] px-3 py-2 text-sm text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]">
            {t('updatePasswordSuccess')}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword}
          className="rounded-[8px] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('updatePasswordSubmitting') : t('updatePasswordSubmit')}
        </button>
      </form>
    </section>
  );
}
