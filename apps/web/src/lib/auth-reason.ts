/**
 * Maps ?reason=... query-param values to translation key suffixes.
 *
 * Used by auth-page-shell to pick contextual heading / subtext copy and by
 * auth-gated actions (SaveButton, LikeButton, etc.) to build redirect URLs
 * that carry the reason through to the login screen.
 *
 * Ported from legacy nawhas.com's login dialog, which customized copy per
 * trigger (e.g. "Sign in to save this track" / "Sign in to like this track").
 */
export const AUTH_REASONS = [
  'save',
  'like',
  'library',
  'contribute',
  'comment',
] as const;

export type AuthReason = (typeof AUTH_REASONS)[number];

/**
 * Type guard for an unknown query-param value. Narrows to AuthReason when the
 * value is one of the known reason suffixes; returns false for anything else
 * (including null/undefined, which is how useSearchParams().get() reports
 * missing keys).
 */
export function isAuthReason(value: string | null | undefined): value is AuthReason {
  return typeof value === 'string' && (AUTH_REASONS as readonly string[]).includes(value);
}

/**
 * Build a /login redirect URL with the current path as callbackUrl and an
 * optional reason param for contextual copy on the login screen.
 */
export function buildLoginHref({
  callbackUrl,
  reason,
}: {
  callbackUrl: string;
  reason?: AuthReason;
}): string {
  const params = new URLSearchParams();
  params.set('callbackUrl', callbackUrl);
  if (reason) params.set('reason', reason);
  return `/login?${params.toString()}`;
}
