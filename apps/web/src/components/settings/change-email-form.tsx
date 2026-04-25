'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
      <h2 id="email-heading" className="font-serif text-2xl font-medium text-[var(--text)]">
        {t('emailHeading')}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        {t('emailCurrent')}{' '}
        <span className="font-medium text-[var(--text)]">{currentEmail}</span>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 max-w-sm space-y-6">
        <div>
          <label htmlFor="new-email" className="block text-[13px] font-medium text-[var(--text-dim)] mb-2">
            {t('newEmailLabel')}
          </label>
          <input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            aria-required="true"
            autoComplete="email"
            disabled={loading}
            placeholder={t('newEmailPlaceholder')}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'new-email-error' : undefined}
            className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50"
          />
        </div>

        {error && (
          <p id="new-email-error" role="alert" className="text-[13px] text-[var(--color-error-500)] mt-2">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-[8px] bg-[var(--color-success-50)] px-3 py-2 text-sm text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]">
            {t('updateEmailSuccess')}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !newEmail}
          className="rounded-[8px] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('updateEmailSubmitting') : t('updateEmailSubmit')}
        </button>
      </form>
    </section>
  );
}
