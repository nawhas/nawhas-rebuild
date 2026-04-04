'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { sendVerificationEmail } from '@/lib/auth-client';

export function CheckEmailCard({ email }: { email?: string }): React.JSX.Element {
  const t = useTranslations('auth.checkEmail');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleResend(): Promise<void> {
    if (!email || resendStatus === 'sending' || resendStatus === 'sent') return;
    setResendStatus('sending');
    const result = await sendVerificationEmail({
      email,
      callbackURL: '/verify-email',
    });
    setResendStatus(result.error ? 'error' : 'sent');
  }

  return (
    <div className="rounded-lg bg-white px-8 py-10 shadow-sm ring-1 ring-gray-900/5">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        {/* envelope icon */}
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

      <h1 className="mb-2 text-2xl font-semibold text-gray-900">{t('heading')}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {email ? (
          <>
            {t.rich('descriptionWithEmail', {
              email,
              strong: (chunks) => <span className="font-medium text-gray-900">{chunks}</span>,
            })}
          </>
        ) : (
          t('descriptionWithoutEmail')
        )}
      </p>

      <p className="mb-1 text-sm text-gray-500">{t('didntReceive')}</p>

      {email ? (
        <button
          type="button"
          onClick={handleResend}
          disabled={resendStatus === 'sending' || resendStatus === 'sent'}
          className="text-sm font-medium text-gray-900 underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resendStatus === 'sending'
            ? t('resendSending')
            : resendStatus === 'sent'
              ? t('resendSent')
              : t('resendButton')}
        </button>
      ) : null}

      {resendStatus === 'error' && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {t('resendError')}
        </p>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-gray-900 underline hover:no-underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </div>
  );
}
