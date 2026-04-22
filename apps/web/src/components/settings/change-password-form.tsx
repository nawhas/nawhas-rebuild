'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
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
      <h2 id="password-heading" className="text-base font-semibold text-foreground">
        {t('passwordHeading')}
      </h2>

      <form onSubmit={handleSubmit} noValidate className="mt-4 max-w-sm space-y-3">
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium text-foreground">
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
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
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
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <p id="new-password-hint" className="mt-1 text-xs text-muted-foreground">{t('passwordMinLength')}</p>
        </div>

        {error && (
          <p id="change-password-error" role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {t('updatePasswordSuccess')}
          </p>
        )}

        <Button type="submit" disabled={loading || !currentPassword || !newPassword}>
          {loading ? t('updatePasswordSubmitting') : t('updatePasswordSubmit')}
        </Button>
      </form>
    </section>
  );
}
