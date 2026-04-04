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
      <h2 id="email-heading" className="text-base font-semibold text-gray-900">
        {t('emailHeading')}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {t('emailCurrent')}{' '}
        <span className="font-medium text-gray-700">{currentEmail}</span>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 max-w-sm space-y-3">
        <div>
          <label htmlFor="new-email" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {t('updateEmailSuccess')}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !newEmail}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t('updateEmailSubmitting') : t('updateEmailSubmit')}
        </button>
      </form>
    </section>
  );
}
