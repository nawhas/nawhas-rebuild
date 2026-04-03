/**
 * E2E Tests — Login, Authenticated State & Logout
 *
 * A single verified user is created once per worker (register → Mailpit verify)
 * and reused across tests for efficiency. Negative-case tests use made-up
 * credentials and don't need a real user.
 *
 * Requires:
 *   - web service running at BASE_URL
 *   - mailpit service running at MAILPIT_URL
 */

import { test as base, expect } from '@playwright/test';
import postgres from 'postgres';

const MAILPIT_URL = process.env['MAILPIT_URL'] ?? 'http://mailpit:8025';
const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/nawhas'; // gitguardian:ignore — dev-only default matching docker-compose POSTGRES_PASSWORD

// ---------------------------------------------------------------------------
// Helpers (duplicated from auth-register.spec.ts intentionally — no shared
// helper module is needed for two files)
// ---------------------------------------------------------------------------

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

async function extractVerificationUrl(
  request: import('@playwright/test').APIRequestContext,
  messageId: string,
): Promise<string> {
  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const data = await res.json() as { HTML?: string; Text?: string };

  const body = data.HTML ?? data.Text ?? '';
  const match = body.match(/https?:\/\/[^\s"'<>]*\/api\/auth\/verify-email[^\s"'<>]*/i);
  if (!match) throw new Error('Verification URL not found in email body');
  return match[0];
}

function toRelativePath(fullUrl: string): string {
  const u = new URL(fullUrl);
  return u.pathname + u.search;
}

// ---------------------------------------------------------------------------
// Worker-scoped fixture: registers and verifies a user once per worker.
// ---------------------------------------------------------------------------

interface VerifiedUser {
  email: string;
  password: string;
  name: string;
}

type WorkerFixtures = { verifiedUser: VerifiedUser };

const test = base.extend<Record<string, never>, WorkerFixtures>({
  verifiedUser: [
    async ({ browser }, use) => {
      const email = `login-user-${Date.now()}@example.com`;
      const password = 'StrongPass123!';
      const name = 'Login Test User';

      const page = await browser.newPage();
      try {
        // Register
        await page.goto('/register');
        await page.fill('#name', name);
        await page.fill('#email', email);
        await page.fill('#password', password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/check-email/, { timeout: 15_000 });

        // Retrieve verification email from Mailpit
        const message = await pollForEmail(page.request, email);
        const verificationUrl = await extractVerificationUrl(page.request, message.ID);

        // Verify the email (navigate to the verification link)
        await page.goto(toRelativePath(verificationUrl));
        await page.waitForURL(/\/verify-email/, { timeout: 10_000 });
        await page.waitForSelector('h1:has-text("Email verified!")', { timeout: 5_000 });
      } finally {
        await page.close();
      }

      await use({ email, password, name });

      // Cleanup: remove the test user from the database
      const sql = postgres(DATABASE_URL);
      try {
        await sql`DELETE FROM "user" WHERE email = ${email}`;
      } finally {
        await sql.end();
      }
    },
    { scope: 'worker' },
  ],
});

// ---------------------------------------------------------------------------

test.describe('Login form — error states', () => {
  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'someone@example.com');
    await page.fill('#password', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });

  test('non-existent email shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', `nobody-${Date.now()}@example.com`);
    await page.fill('#password', 'SomePassword123!');
    await page.click('button[type="submit"]');

    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe('Login — happy path', () => {
  test('valid credentials redirect to home page', async ({ page, verifiedUser }) => {
    await page.goto('/login');
    await page.fill('#email', verifiedUser.email);
    await page.fill('#password', verifiedUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('after login, navigation shows authenticated user menu', async ({
    page,
    verifiedUser,
  }) => {
    await page.goto('/login');
    await page.fill('#email', verifiedUser.email);
    await page.fill('#password', verifiedUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 10_000 });

    // UserMenu avatar button appears — aria-label includes the user's name
    const userMenuButton = page.getByRole('button', {
      name: new RegExp(`Account menu for ${verifiedUser.name}`, 'i'),
    });
    await expect(userMenuButton).toBeVisible();

    // "Sign In" link should not be present
    await expect(page.getByRole('link', { name: 'Sign In' })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe('Logout', () => {
  test('clicking Sign Out clears session and shows Sign In link', async ({
    page,
    verifiedUser,
  }) => {
    // Start authenticated
    await page.goto('/login');
    await page.fill('#email', verifiedUser.email);
    await page.fill('#password', verifiedUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });

    // Open user menu
    const userMenuButton = page.getByRole('button', {
      name: new RegExp(`Account menu for ${verifiedUser.name}`, 'i'),
    });
    await userMenuButton.click();

    // Click Sign Out
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    // Redirected to home in unauthenticated state
    await expect(page).toHaveURL('/', { timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe('Login page structure', () => {
  test('page title contains "Sign in"', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Sign in/i);
  });

  test('has a link to the register page', async ({ page }) => {
    await page.goto('/login');
    const link = page.getByRole('link', { name: /register/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/register');
  });
});
