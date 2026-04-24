'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { Input } from '@nawhas/ui/components/input';
import { signUp } from '@/lib/auth-client';
import { SocialButtons } from './social-buttons';
import type { EnabledSocialProvider } from '@/lib/social-providers';

interface RegisterFormProps {
  enabledProviders?: EnabledSocialProvider[];
}

type InvalidField = 'name' | 'email' | 'password' | null;

export function RegisterForm({ enabledProviders = [] }: RegisterFormProps): React.JSX.Element {
  const t = useTranslations('auth.register');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setInvalidField(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError(t('nameRequired'));
      setInvalidField('name');
      nameRef.current?.focus();
      return;
    }
    if (!trimmedEmail) {
      setError(t('emailRequired'));
      setInvalidField('email');
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      setError(t('passwordRequired'));
      setInvalidField('password');
      passwordRef.current?.focus();
      return;
    }

    setLoading(true);

    const result = await signUp.email({ name: trimmedName, email: trimmedEmail, password });

    if (result.error) {
      setError(result.error.message ?? t('fallbackError'));
      setInvalidField('email');
      setLoading(false);
      emailRef.current?.focus();
      return;
    }

    router.push(`/check-email?email=${encodeURIComponent(trimmedEmail)}`);
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-8 py-10">
      <h1 className="mb-6 font-serif text-[1.75rem] font-medium text-[var(--text)]">{t('heading')}</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            {t('nameLabel')}
          </label>
          <Input
            id="name"
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            disabled={loading}
            aria-invalid={invalidField === 'name' ? true : undefined}
            aria-describedby={error ? 'register-error' : undefined}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            {t('emailLabel')}
          </label>
          <Input
            id="email"
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            disabled={loading}
            aria-invalid={invalidField === 'email' ? true : undefined}
            aria-describedby={error ? 'register-error' : undefined}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            {t('passwordLabel')}
          </label>
          <Input
            id="password"
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder={t('passwordPlaceholder')}
            disabled={loading}
            aria-invalid={invalidField === 'password' ? true : undefined}
            aria-describedby={error ? 'register-error' : undefined}
          />
        </div>

        {error && (
          <p
            id="register-error"
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

      <SocialButtons providers={enabledProviders} callbackUrl="/" />

      <p className="mt-6 text-center text-sm text-[var(--text-dim)]">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
