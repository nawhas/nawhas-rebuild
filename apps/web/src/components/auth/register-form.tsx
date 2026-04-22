'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { Card } from '@nawhas/ui/components/card';
import { Input } from '@nawhas/ui/components/input';
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
    <Card className="px-8 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">{t('heading')}</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('nameLabel')}
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
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
            aria-describedby={error ? 'register-error' : undefined}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('passwordLabel')}
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder={t('passwordPlaceholder')}
            disabled={loading}
          />
        </div>

        {error && (
          <p
            id="register-error"
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>

      <SocialButtons providers={enabledProviders} callbackUrl="/" />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-foreground underline hover:no-underline">
          {t('signIn')}
        </Link>
      </p>
    </Card>
  );
}
