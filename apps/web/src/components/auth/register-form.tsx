'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { signUp } from '@/lib/auth-client';
import { SocialButtons } from './social-buttons';
import type { EnabledSocialProvider } from '@/lib/social-providers';

interface RegisterFormProps {
  enabledProviders?: EnabledSocialProvider[];
}

export function RegisterForm({ enabledProviders = [] }: RegisterFormProps): React.JSX.Element {
  const t = useTranslations('auth.register');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError(t('nameRequired'));
      return;
    }
    if (!trimmedEmail) {
      setError(t('emailRequired'));
      return;
    }
    if (!password) {
      setError(t('passwordRequired'));
      return;
    }

    setLoading(true);

    const result = await signUp.email({ name: trimmedName, email: trimmedEmail, password });

    if (result.error) {
      setError(result.error.message ?? t('fallbackError'));
      setLoading(false);
      return;
    }

    router.push(`/check-email?email=${encodeURIComponent(trimmedEmail)}`);
  }

  return (
    <div className="rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('heading')}</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('nameLabel')}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder={t('namePlaceholder')}
            disabled={loading}
          />
        </div>

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
            aria-describedby={error ? 'register-error' : undefined}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('passwordLabel')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            placeholder={t('passwordPlaceholder')}
            disabled={loading}
          />
        </div>

        {error && (
          <p
            id="register-error"
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>

      <SocialButtons providers={enabledProviders} callbackUrl="/" />

      <p className="mt-6 text-center text-sm text-gray-600">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-gray-900 underline hover:no-underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
