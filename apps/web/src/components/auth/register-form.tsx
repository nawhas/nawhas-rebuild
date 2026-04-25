'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { Input } from '@nawhas/ui/components/input';
import { signUp } from '@/lib/auth-client';
import { usernameSchema } from '@/lib/auth';
import { SocialButtons } from './social-buttons';
import type { EnabledSocialProvider } from '@/lib/social-providers';

interface RegisterFormProps {
  enabledProviders?: EnabledSocialProvider[];
}

type InvalidField = 'name' | 'username' | 'email' | 'password' | null;

export function RegisterForm({ enabledProviders = [] }: RegisterFormProps): React.JSX.Element {
  const t = useTranslations('auth.register');
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setInvalidField(null);

    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError(t('nameRequired'));
      setInvalidField('name');
      nameRef.current?.focus();
      return;
    }
    const usernameResult = usernameSchema.safeParse(trimmedUsername);
    if (!usernameResult.success) {
      setError(usernameResult.error.issues[0]?.message ?? 'Invalid username.');
      setInvalidField('username');
      usernameRef.current?.focus();
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

    // better-auth accepts the registered additional field (`username`)
    // alongside the standard email/password/name payload.
    const result = await signUp.email({
      name: trimmedName,
      email: trimmedEmail,
      password,
      username: trimmedUsername,
    } as Parameters<typeof signUp.email>[0]);

    if (result.error) {
      const message = result.error.message ?? t('fallbackError');
      // Postgres unique-violation surfaces here once the case-insensitive
      // index trips. Map it to a friendly username-taken hint.
      const isUniqueViolation =
        message.toLowerCase().includes('username') ||
        message.toLowerCase().includes('unique') ||
        message.toLowerCase().includes('23505');
      if (isUniqueViolation) {
        setError('That username is already taken — please pick another.');
        setInvalidField('username');
        usernameRef.current?.focus();
      } else {
        setError(message);
        setInvalidField('email');
        emailRef.current?.focus();
      }
      setLoading(false);
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
          <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            Username
          </label>
          <Input
            id="username"
            ref={usernameRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            placeholder="e.g. mehdi_bhatti"
            disabled={loading}
            aria-invalid={invalidField === 'username' ? true : undefined}
            aria-describedby={error ? 'register-error' : 'username-help'}
          />
          <p id="username-help" className="mt-1 text-xs text-[var(--text-dim)]">
            3–32 characters. Letters, numbers, and underscores only. Used for your public profile URL.
          </p>
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
