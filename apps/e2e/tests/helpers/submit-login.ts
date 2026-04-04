import type { Page } from '@playwright/test';

/**
 * Clicks the login form submit and waits for the Better Auth email sign-in POST
 * to complete so assertions do not race the session cookie.
 */
export async function clickLoginSubmitAndWaitForAuth(page: Page): Promise<void> {
  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('/api/auth/sign-in') && res.request().method() === 'POST',
    { timeout: 20_000 },
  );
  await page.click('button[type="submit"]');
  await responsePromise;
}
