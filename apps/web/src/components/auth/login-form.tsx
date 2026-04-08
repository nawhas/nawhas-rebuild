'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { signIn } from '@/lib/auth-client';
import { SocialButtons } from './social-buttons';
import type { EnabledSocialProvider } from '@/lib/social-providers';

interface LoginFormProps {
  callbackUrl?: string;
  enabledProviders?: EnabledSocialProvider[];
}

export function LoginForm({ callbackUrl, enabledProviders = [] }: LoginFormProps): React.JSX.Element {
  const t = useTranslations('auth.login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? t('fallbackError'));
      setLoading(false);
      return;
    }

    // Hard-navigate so the server-rendered SiteHeader re-runs with the new
    // session and protected-route middleware sees the fresh cookie.
    // router.push() + router.refresh() race; window.location avoids both issues.
    window.location.replace(callbackUrl ?? '/');
  }

  return (
    <div className="rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('heading')}</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
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
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        <div className="mb-6">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('passwordLabel')}
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder={t('passwordPlaceholder')}
            disabled={loading}
          />
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
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

      <SocialButtons providers={enabledProviders} callbackUrl={callbackUrl} />

      <p className="mt-6 text-center text-sm text-gray-600">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-gray-900 underline hover:no-underline">
          {t('register')}
        </Link>
      </p>
    </div>
  );
}
