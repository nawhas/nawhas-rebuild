'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isAuthReason } from '@/lib/auth-reason';

/**
 * Layout wrapper for the /login, /register, /forgot-password, /reset-password,
 * /verify-email, and /check-email pages.
 *
 * When the URL carries a `?reason=save|like|library|contribute|comment` query
 * param, renders a contextual heading + subtext above the form so users see
 * the reason they were bounced to sign in (e.g. "Sign in to save this track").
 * When no reason is present, acts as a pure centering wrapper and the form
 * renders its own heading unchanged.
 *
 * Client Component — reads the query param via useSearchParams().
 */
export function AuthPageShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const params = useSearchParams();
  const reasonParam = params?.get('reason') ?? null;
  const reason = isAuthReason(reasonParam) ? reasonParam : null;
  const t = useTranslations('auth.login');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {reason ? (
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-foreground">
              {t(`reasonHeading.${reason}`)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(`reasonSubtext.${reason}`)}
            </p>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
