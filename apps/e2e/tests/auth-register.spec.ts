/**
 * E2E Tests — Registration & Email Verification
 *
 * Tests the full registration flow including email verification via Mailpit.
 * Each test creates a unique user (timestamp-suffixed email) for isolation.
 *
 * Requires:
 *   - web service running at BASE_URL
 *   - mailpit service running at MAILPIT_URL
 */

import { test, expect } from '@playwright/test';

const MAILPIT_URL = process.env['MAILPIT_URL'] ?? 'http://mailpit:8025';

/**
 * Poll Mailpit until an email addressed to `to` arrives, or `timeoutMs` elapses.
 * Returns the message summary (includes ID for fetching the full body).
 */
async function pollForEmail(
  request: import('@playwright/test').APIRequestContext,
  to: string,
  timeoutMs = 15_000,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await request.get(`${MAILPIT_URL}/api/v1/messages`);
    const data = await res.json() as {
      messages?: Array<{ ID: string; To: Array<{ Address: string }> }>;
    };

    const match = data.messages?.find((m) =>
      m.To.some((r) => r.Address === to),
    );
    if (match) return match;

    await new Promise((r) => setTimeout(r, 600));
  }

  throw new Error(`No email found for <${to}> within ${timeoutMs}ms`);
}

/**
 * Fetch the full Mailpit message and extract the first HTTPS/HTTP URL that
 * looks like a Better Auth verification link.
 */
async function extractVerificationUrl(
  request: import('@playwright/test').APIRequestContext,
  messageId: string,
): Promise<string> {
  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const data = await res.json() as { HTML?: string; Text?: string };

  const body = data.HTML ?? data.Text ?? '';
  // Better Auth generates a URL ending in /api/auth/verify-email?token=...
  const match = body.match(/https?:\/\/[^\s"'<>]*\/api\/auth\/verify-email[^\s"'<>]*/i);
  if (!match) throw new Error('Verification URL not found in email body');
  return match[0];
}

/**
 * Given a full verification URL (which may have a different host than the
 * test runner expects), strip the origin and return just path + query so
 * Playwright resolves it against its configured baseURL.
 */
function toRelativePath(fullUrl: string): string {
  const u = new URL(fullUrl);
  return u.pathname + u.search;
}

// ---------------------------------------------------------------------------

test.describe('Registration form', () => {
  test('happy path: valid data → redirected to /check-email', async ({ page }) => {
    const email = `reg-happy-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.fill('#name', 'Happy User');
    await page.fill('#email', email);
    await page.fill('#password', 'StrongPass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/check-email/, { timeout: 15_000 });
  });

  test('duplicate email shows error', async ({ page }) => {
    const email = `reg-dup-${Date.now()}@example.com`;

    // First registration succeeds
    await page.goto('/register');
    await page.fill('#name', 'First User');
    await page.fill('#email', email);
    await page.fill('#password', 'StrongPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/check-email/, { timeout: 15_000 });

    // Second registration with the same email should fail
    await page.goto('/register');
    await page.fill('#name', 'Second User');
    await page.fill('#email', email);
    await page.fill('#password', 'StrongPass123!');
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });

  test('weak password (fewer than 8 characters) shows error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#name', 'Weak Password User');
    await page.fill('#email', `reg-weak-${Date.now()}@example.com`);
    await page.fill('#password', 'abc');
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });

  test('empty name shows error', async ({ page }) => {
    await page.goto('/register');
    // Leave name empty
    await page.fill('#email', `reg-noname-${Date.now()}@example.com`);
    await page.fill('#password', 'StrongPass123!');
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });

  test('empty email shows error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#name', 'No Email User');
    // Leave email empty
    await page.fill('#password', 'StrongPass123!');
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });

  test('empty password shows error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#name', 'No Password User');
    await page.fill('#email', `reg-nopass-${Date.now()}@example.com`);
    // Leave password empty
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe('Email verification', () => {
  test('after registration, clicking verification link shows verified page', async ({
    page,
    request,
  }) => {
    const email = `reg-verify-${Date.now()}@example.com`;

    // Register
    await page.goto('/register');
    await page.fill('#name', 'Verify User');
    await page.fill('#email', email);
    await page.fill('#password', 'StrongPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/check-email/, { timeout: 15_000 });

    // Wait for verification email in Mailpit
    const message = await pollForEmail(request, email);
    const verificationUrl = await extractVerificationUrl(request, message.ID);

    // Navigate to the verification link (use relative path for correct host resolution)
    await page.goto(toRelativePath(verificationUrl));

    // Should land on /verify-email and show success
    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page.getByRole('heading', { name: 'Email verified!' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe('Registration page structure', () => {
  test('page title contains "Create account"', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/Create account/i);
  });

  test('has a link to the login page', async ({ page }) => {
    await page.goto('/register');
    const link = page.getByRole('link', { name: 'Sign in', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });
});
