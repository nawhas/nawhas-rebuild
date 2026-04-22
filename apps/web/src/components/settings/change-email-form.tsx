'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { changeEmail } from '@/server/actions/account';

interface ChangeEmailFormProps {
  currentEmail: string;
}

export function ChangeEmailForm({ currentEmail }: ChangeEmailFormProps): React.JSX.Element {
  const t = useTranslations('settings');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const err = await changeEmail(newEmail);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setNewEmail('');
    }
  }

  return (
    <section aria-labelledby="email-heading">
      <h2 id="email-heading" className="text-base font-semibold text-foreground">
        {t('emailHeading')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('emailCurrent')}{' '}
        <span className="font-medium text-foreground">{currentEmail}</span>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 max-w-sm space-y-3">
        <div>
          <label htmlFor="new-email" className="block text-sm font-medium text-foreground">
            {t('newEmailLabel')}
          </label>
          <input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            placeholder={t('newEmailPlaceholder')}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {t('updateEmailSuccess')}
          </p>
        )}

        <Button type="submit" disabled={loading || !newEmail}>
          {loading ? t('updateEmailSubmitting') : t('updateEmailSubmit')}
        </Button>
      </form>
    </section>
  );
}
