import type { Page } from '@playwright/test';

function isBetterAuthEmailSignInPost(res: { url: () => string; request: () => { method: () => string } }): boolean {
  const url = res.url();
  return res.request().method() === 'POST' && url.includes('/api/auth/sign-in/email');
}

/**
 * Clicks the login form submit and waits for the Better Auth email sign-in POST
 * to complete so assertions do not race the session cookie.
 *
 * If the response is not observed in time (e.g. navigation wins first), falls back
 * to waiting until the browser leaves /login.
 */
export async function clickLoginSubmitAndWaitForAuth(page: Page): Promise<void> {
  const responsePromise = page.waitForResponse(isBetterAuthEmailSignInPost, { timeout: 25_000 });
  await page.click('button[type="submit"]');
  try {
    await responsePromise;
  } catch {
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
  }
}
