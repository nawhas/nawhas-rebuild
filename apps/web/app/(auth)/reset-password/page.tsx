import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

// Dynamic rendering required for searchParams access
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reset password',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('auth.resetPassword');
  const { token, error } = await searchParams;

  if (!token) {
    redirect('/forgot-password');
  }

  if (error === 'INVALID_TOKEN' || error === 'TOKEN_EXPIRED') {
    return (
      <div className="rounded-lg bg-card px-8 py-10 shadow-sm ring-1 ring-border">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6 text-destructive"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {error === 'TOKEN_EXPIRED' ? t('tokenExpiredHeading') : t('tokenInvalidHeading')}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {error === 'TOKEN_EXPIRED'
            ? t('tokenExpiredDescription')
            : t('tokenInvalidDescription')}
        </p>

        <a
          href="/forgot-password"
          className="inline-block w-full rounded-md bg-foreground px-4 py-2 text-center text-sm font-medium text-background hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('requestNewLinkButton')}
        </a>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <a href="/login" className="font-medium text-foreground underline hover:no-underline">
            {t('backToSignIn')}
          </a>
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
