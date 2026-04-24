'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { Input } from '@nawhas/ui/components/input';
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

    // Full navigation so middleware and the root layout (SiteHeaderDynamic)
    // see the new session cookie. router.push() + router.refresh() can race;
    // window.location avoids that.
    window.location.replace(callbackUrl ?? '/');
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-8 py-10">
      <h1 className="mb-6 font-serif text-[1.75rem] font-medium text-[var(--text)]">{t('heading')}</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            {t('emailLabel')}
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            disabled={loading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        <div className="mb-6">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text)]">
              {t('passwordLabel')}
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--text-dim)] hover:text-[var(--accent)]"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder={t('passwordPlaceholder')}
            disabled={loading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="mb-4 rounded-md bg-[var(--color-error-500)]/10 px-3 py-2 text-sm text-[var(--color-error-500)]"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>

      <SocialButtons providers={enabledProviders} callbackUrl={callbackUrl} />

      <p className="mt-6 text-center text-sm text-[var(--text-dim)]">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-[var(--accent)] hover:underline">
          {t('register')}
        </Link>
      </p>
    </div>
  );
}
