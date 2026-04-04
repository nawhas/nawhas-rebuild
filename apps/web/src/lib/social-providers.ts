/**
 * Supported social OAuth providers.
 * Controlled by server-side feature-flag env vars (GOOGLE_OAUTH_ENABLED, etc.).
 */
export type EnabledSocialProvider = 'google' | 'apple' | 'facebook' | 'microsoft';

/**
 * Returns the list of enabled social providers based on env vars.
 * Must only be called from server components / server-side code —
 * the env vars are never exposed to the browser.
 */
export function getEnabledSocialProviders(): EnabledSocialProvider[] {
  const providers: EnabledSocialProvider[] = [];
  if (process.env['GOOGLE_OAUTH_ENABLED'] === 'true') providers.push('google');
  if (process.env['APPLE_OAUTH_ENABLED'] === 'true') providers.push('apple');
  if (process.env['FACEBOOK_OAUTH_ENABLED'] === 'true') providers.push('facebook');
  if (process.env['MICROSOFT_OAUTH_ENABLED'] === 'true') providers.push('microsoft');
  return providers;
}
