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
    // Sit the card near the top rather than perfectly centred. Items-center on
    // min-h-screen (the previous layout) left ~300px of empty space above the
    // card on a 900px viewport — the 2026-04-23 audit flagged it as a dead
    // zone that made the page look unfinished. pt-[12vh] anchors the card
    // ~12% from the top, so short forms still breathe but the void above is
    // gone; pb-12 keeps the footer link off the fold when the virtual keyboard
    // opens on mobile.
    <div className="flex min-h-screen flex-col items-center bg-[var(--bg)] px-4 pb-12 pt-[12vh]">
      <div className="w-full max-w-md">
        {reason ? (
          <div className="mb-6 text-center">
            <h1 className="mb-2 font-serif text-[1.75rem] font-medium text-[var(--text)]">
              {t(`reasonHeading.${reason}`)}
            </h1>
            <p className="text-sm text-[var(--text-dim)]">
              {t(`reasonSubtext.${reason}`)}
            </p>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
