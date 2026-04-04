'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { resetPassword } from '@/lib/auth-client';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps): React.JSX.Element {
  const t = useTranslations('auth.resetPassword');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('errorMinLength'));
      return;
    }

    setLoading(true);

    const result = await resetPassword({ newPassword: password, token });

    if (result.error) {
      const isExpired =
        result.error.status === 400 ||
        result.error.message?.toLowerCase().includes('expired') ||
        result.error.message?.toLowerCase().includes('invalid');
      setError(
        isExpired
          ? t('errorExpiredOrInvalid')
          : (result.error.message ?? t('errorGeneric')),
      );
      setLoading(false);
      return;
    }

    router.push('/login?reset=1');
  }

  return (
    <div className="rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">{t('heading')}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {t('description')}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('newPasswordLabel')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder={t('newPasswordPlaceholder')}
            disabled={loading}
            aria-describedby={error ? 'reset-error' : undefined}
          />
        </div>

        {error && (
          <p
            id="reset-error"
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}{' '}
            {error.includes('expired') || error.includes('invalid') ? (
              <Link href="/forgot-password" className="font-medium underline hover:no-underline">
                {t('requestNewLink')}
              </Link>
            ) : null}
          </p>
        )}

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
