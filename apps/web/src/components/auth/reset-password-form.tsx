'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { Card } from '@nawhas/ui/components/card';
import { Input } from '@nawhas/ui/components/input';
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
    <Card className="px-8 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">{t('heading')}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('description')}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('newPasswordLabel')}
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            placeholder={t('newPasswordPlaceholder')}
            disabled={loading}
            aria-describedby={error ? 'reset-error' : undefined}
          />
        </div>

        {error && (
          <p
            id="reset-error"
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}{' '}
            {error.includes('expired') || error.includes('invalid') ? (
              <Link href="/forgot-password" className="font-medium underline hover:no-underline">
                {t('requestNewLink')}
              </Link>
            ) : null}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline hover:no-underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </Card>
  );
}
