'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { requestPasswordReset } from '@/lib/auth-client';

export function ForgotPasswordForm(): React.JSX.Element {
  const t = useTranslations('auth.forgotPassword');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    // Always show the success state regardless of whether the email exists —
    // this prevents account enumeration.
    await requestPasswordReset({ email, redirectTo: '/reset-password' });

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6 text-gray-700"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-gray-900">{t('successHeading')}</h1>
        <p className="mb-8 text-sm text-gray-600">
          {t.rich('successDescription', {
            email,
            strong: (chunks) => <span className="font-medium text-gray-900">{chunks}</span>,
          })}
        </p>

        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-gray-900 underline hover:no-underline">
            {t('backToSignIn')}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">{t('heading')}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {t('description')}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder={t('emailPlaceholder')}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-gray-900 underline hover:no-underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </div>
  );
}
