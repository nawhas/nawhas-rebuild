/**
 * E2E Tests — Protected Route Middleware
 *
 * Verifies that unauthenticated users are redirected to /login with a
 * callbackUrl parameter when they attempt to access protected routes,
 * and that authenticated users can access those routes normally.
 *
 * Protected routes under test:
 *   /library/tracks
 *   /history
 *   /profile
 *   /settings
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

const PROTECTED_ROUTES = [
  '/library/tracks',
  '/history',
  '/profile',
  '/settings',
] as const;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

// Use native fetch() — worker-scoped fixtures cannot access Playwright's
// test-scoped request fixture.
async function pollForEmail(to: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    const data = await res.json() as {
      messages?: Array<{ ID: string; To: Array<{ Address: string }> }>;
    };
    const match = data.messages?.find((m) => m.To.some((r) => r.Address === to));
    if (match) return match;
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`No email found for <${to}> within ${timeoutMs}ms`);
}

async function extractVerificationUrl(messageId: string): Promise<string> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const data = await res.json() as { HTML?: string; Text?: string };
  const body = data.HTML ?? data.Text ?? '';
  const match = body.match(/https?:\/\/[^\s"'<>]*\/api\/auth\/verify-email[^\s"'<>]*/i);
  if (!match) throw new Error('Verification URL not found in email body');
  return match[0];
}

function toVerificationFetchUrl(fullUrl: string): string {
  const baseUrl = process.env['BASE_URL'] ?? 'http://localhost:3000';
  const { pathname, search } = new URL(fullUrl);
  return `${baseUrl}${pathname}${search}`;
}

// ---------------------------------------------------------------------------
// Worker-scoped verified user fixture
// ---------------------------------------------------------------------------

interface VerifiedUser {
  email: string;
  password: string;
  name: string;
}

type WorkerFixtures = { verifiedUser: VerifiedUser };

const test = base.extend<Record<string, never>, WorkerFixtures>({
  verifiedUser: [
    async ({}, use) => {
      const baseUrl = process.env['BASE_URL'] ?? 'http://localhost:3000';
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const email = `protected-e2e-${suffix}@example.com`;
      const password = 'ProtectedTest99!';
      const name = 'Protected Route E2E User';

      const registerRes = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': baseUrl,
        },
        body: JSON.stringify({ name, email, password }),
      });
      if (!registerRes.ok) {
        throw new Error(`Registration failed: ${await registerRes.text()}`);
      }

      const message = await pollForEmail(email);
      const verificationUrl = await extractVerificationUrl(message.ID);
      await fetch(toVerificationFetchUrl(verificationUrl), {
        headers: { 'Origin': baseUrl },
      });

      await use({ email, password, name });

      const sql = postgres(DATABASE_URL, { max: 1 });
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
// Unauthenticated redirect tests
// ---------------------------------------------------------------------------

test.describe('Protected routes — unauthenticated redirect', () => {
  // Defensively clear cookies before each test to prevent any stale session token
  // from a previous test (in the same worker) from leaking through and causing
  // middleware to skip the fast-path cookie-absence redirect.
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects unauthenticated user to /login with callbackUrl`, async ({ page }) => {
      await page.goto(route);

      // Must land on /login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      // callbackUrl query param must encode the original destination
      const url = new URL(page.url());
      const callbackUrl = url.searchParams.get('callbackUrl');
      expect(callbackUrl).toBeTruthy();
      expect(decodeURIComponent(callbackUrl!)).toContain(route);
    });
  }
});

// ---------------------------------------------------------------------------
// Post-login redirect test
// ---------------------------------------------------------------------------

test.describe('Protected routes — post-login redirect', () => {
  test('visiting /login?callbackUrl=/library/tracks redirects there after sign-in', async ({
    page,
    verifiedUser,
  }) => {
    await page.goto('/login?callbackUrl=/library/tracks');

    await page.fill('#email', verifiedUser.email);
    await page.fill('#password', verifiedUser.password);
    await page.click('button[type="submit"]');

    // After login the user should land on the original destination
    await expect(page).toHaveURL('/library/tracks', { timeout: 15_000 });
  });

  test('visiting /login?callbackUrl=/history redirects there after sign-in', async ({
    page,
    verifiedUser,
  }) => {
    await page.goto('/login?callbackUrl=/history');

    await page.fill('#email', verifiedUser.email);
    await page.fill('#password', verifiedUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/history', { timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Authenticated access tests
// ---------------------------------------------------------------------------

test.describe('Protected routes — authenticated access', () => {
  async function signIn(
    page: import('@playwright/test').Page,
    user: VerifiedUser,
  ): Promise<void> {
    await page.goto('/login');
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15_000 });
  }

  for (const route of PROTECTED_ROUTES) {
    test(`authenticated user can access ${route} without redirect`, async ({
      page,
      verifiedUser,
    }) => {
      await signIn(page, verifiedUser);
      await page.goto(route);

      // Must NOT be redirected to login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
      await expect(page).toHaveURL(route, { timeout: 10_000 });
    });
  }
});

// ---------------------------------------------------------------------------
// OAuth E2E (gated on GOOGLE_OAUTH_ENABLED env var)
// ---------------------------------------------------------------------------

const googleOAuthEnabled = process.env['GOOGLE_OAUTH_ENABLED'] === 'true';

test.describe('Social OAuth — Google', () => {
  test.skip(!googleOAuthEnabled, 'GOOGLE_OAUTH_ENABLED is not set — Google OAuth tests skipped');

  test('Google OAuth sign-in button is present on the login page', async ({ page }) => {
    await page.goto('/login');
    const googleButton = page.getByRole('button', { name: /Continue with Google|Sign in with Google/i });
    await expect(googleButton).toBeVisible();
  });

  test('clicking Google OAuth button redirects to Google authorization page', async ({ page }) => {
    await page.goto('/login');
    const googleButton = page.getByRole('button', { name: /Continue with Google|Sign in with Google/i });
    await googleButton.click();

    // Should be redirected to accounts.google.com
    await expect(page).toHaveURL(/accounts\.google\.com/, { timeout: 15_000 });
  });
});
