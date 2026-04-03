/**
 * E2E Tests — User Library, Listening History, and Track Likes
 *
 * Covers the full M4 user-feature flows:
 *   - Save track → appears in /library/tracks
 *   - Unsave track → removed from library instantly
 *   - Like track → state persists after page reload
 *   - Play track → appears in /history
 *   - Clear history → empty state shown
 *   - Delete account → session ends, redirect to home
 *
 * Requires:
 *   - web service running at BASE_URL
 *   - mailpit service running at MAILPIT_URL
 *   - postgres accessible at DATABASE_URL
 */

import { test as base, expect } from '../fixtures/seed';
import type { SeedData } from '../fixtures/seed';
import postgres from 'postgres';

const MAILPIT_URL = process.env['MAILPIT_URL'] ?? 'http://mailpit:8025';
const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/nawhas';

// ---------------------------------------------------------------------------
// Auth helpers (shared with auth-login.spec.ts pattern)
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
    const match = data.messages?.find((m) => m.To.some((r) => r.Address === to));
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
// Worker-scoped fixture: verified + authenticated user
// ---------------------------------------------------------------------------

interface VerifiedUser {
  email: string;
  password: string;
  name: string;
}

type WorkerFixtures = { verifiedUser: VerifiedUser };
type TestFixtures = { seedData: SeedData };

const test = base.extend<TestFixtures, WorkerFixtures>({
  verifiedUser: [
    async ({ request }, use) => {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const email = `library-e2e-${suffix}@example.com`;
      const password = 'LibraryTest99!';
      const name = 'Library E2E User';

      // Register
      const registerPage = await (await import('@playwright/test')).chromium
        .launch()
        .then((b) => b.newPage())
        .catch(() => null);

      // Use API-based registration to avoid browser overhead in the worker fixture
      const registerRes = await request.post('/api/auth/sign-up/email', {
        data: { name, email, password },
        headers: { 'Content-Type': 'application/json' },
      });

      if (!registerRes.ok()) {
        throw new Error(`Registration failed: ${registerRes.status()} ${await registerRes.text()}`);
      }

      // Verify email via Mailpit
      const message = await pollForEmail(request, email);
      const verificationUrl = await extractVerificationUrl(request, message.ID);
      await request.get(toRelativePath(verificationUrl));

      await use({ email, password, name });

      // Cleanup
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
// Helper: sign in a user and land on the home page
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Save / Unsave track
// ---------------------------------------------------------------------------

test.describe('Library — Save & Unsave', () => {
  test('save track → appears in /library/tracks', async ({ page, seedData, verifiedUser }) => {
    await signIn(page, verifiedUser);

    // Navigate to track detail page
    await page.goto(
      `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`,
    );

    // Click the Save button
    const saveButton = page.getByRole('button', { name: /Save/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Button label should change to indicate it's saved
    await expect(page.getByRole('button', { name: /Saved|Unsave/i })).toBeVisible();

    // Navigate to library
    await page.goto('/library/tracks');
    await expect(page).toHaveURL('/library/tracks');

    // Track should appear in the library list
    await expect(page.getByText(seedData.track.title)).toBeVisible();
  });

  test('unsave track → removed from library instantly', async ({ page, seedData, verifiedUser }) => {
    await signIn(page, verifiedUser);

    // First save the track
    await page.goto(
      `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`,
    );
    const saveButton = page.getByRole('button', { name: /Save/i });
    await saveButton.click();
    await expect(page.getByRole('button', { name: /Saved|Unsave/i })).toBeVisible();

    // Navigate to library to confirm it's there
    await page.goto('/library/tracks');
    await expect(page.getByText(seedData.track.title)).toBeVisible();

    // Unsave from the library page or track page
    const unsaveButton = page.getByRole('button', { name: /Unsave|Saved/i }).first();
    await unsaveButton.click();

    // Track should be removed from the visible list without page reload
    await expect(page.getByText(seedData.track.title)).not.toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Like track
// ---------------------------------------------------------------------------

test.describe('Library — Like Track', () => {
  test('like track → state persists after page reload', async ({ page, seedData, verifiedUser }) => {
    await signIn(page, verifiedUser);

    const trackUrl = `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
    await page.goto(trackUrl);

    // Click the Like button
    const likeButton = page.getByRole('button', { name: /Like/i });
    await expect(likeButton).toBeVisible();
    await likeButton.click();

    // Wait for the button state to update (optimistic or confirmed)
    await expect(page.getByRole('button', { name: /Unlike|Liked/i })).toBeVisible();

    // Reload the page
    await page.reload();

    // After reload the liked state must still be shown
    await expect(page.getByRole('button', { name: /Unlike|Liked/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Listening history
// ---------------------------------------------------------------------------

test.describe('Listening History', () => {
  test('playing a track → it appears in /history', async ({ page, seedData, verifiedUser }) => {
    await signIn(page, verifiedUser);

    // Navigate to track detail and trigger playback
    const trackUrl = `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
    await page.goto(trackUrl);

    // Click the play button to start playback (audio is intercepted as silent MP3)
    const playButton = page.getByRole('button', { name: new RegExp(`Play ${seedData.track.title}`, 'i') });
    await expect(playButton).toBeVisible();
    await playButton.click();

    // Allow the useListeningHistory hook time to fire the record call
    await page.waitForTimeout(500);

    // Navigate to history
    await page.goto('/history');
    await expect(page).toHaveURL('/history');

    // Track title should appear in the history list
    await expect(page.getByText(seedData.track.title)).toBeVisible({ timeout: 10_000 });
  });

  test('clear history → empty state shown', async ({ page, seedData, verifiedUser }) => {
    await signIn(page, verifiedUser);

    // Play a track so there is something in history
    const trackUrl = `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
    await page.goto(trackUrl);
    const playButton = page.getByRole('button', { name: new RegExp(`Play ${seedData.track.title}`, 'i') });
    await playButton.click();
    await page.waitForTimeout(500);

    await page.goto('/history');
    await expect(page.getByText(seedData.track.title)).toBeVisible({ timeout: 10_000 });

    // Click "Clear history" button / action
    const clearButton = page.getByRole('button', { name: /Clear history|Clear all/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Confirm action in dialog if present
    const confirmButton = page.getByRole('button', { name: /Confirm|Yes|Clear/i });
    if (await confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Empty state should now be visible
    await expect(page.getByText(seedData.track.title)).not.toBeVisible({ timeout: 5_000 });
    const emptyState = page.getByRole('heading', { name: /No history|Nothing here|Your history is empty/i })
      .or(page.getByText(/No listening history/i));
    await expect(emptyState).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

test.describe('Account — Delete Account', () => {
  test('delete account → session ends and user is redirected to home', async ({ request }) => {
    // Create a dedicated user for this destructive test so we don't affect
    // the shared worker-scoped verifiedUser.
    const suffix = `del-${Date.now()}`;
    const email = `delete-acct-${suffix}@example.com`;
    const password = 'DeleteMe99!';

    const registerRes = await request.post('/api/auth/sign-up/email', {
      data: { name: 'Delete Me User', email, password },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!registerRes.ok()) {
      throw new Error(`Registration failed: ${await registerRes.text()}`);
    }

    // Verify email
    const message = await pollForEmail(request, email);
    const verificationUrl = await extractVerificationUrl(request, message.ID);
    await request.get(toRelativePath(verificationUrl));

    // Use a fresh browser context for this test
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL: process.env['BASE_URL'] ?? 'http://localhost:3000' });
    const page = await context.newPage();

    try {
      await page.goto('/login');
      await page.fill('#email', email);
      await page.fill('#password', password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/', { timeout: 15_000 });

      // Navigate to settings / account danger zone
      await page.goto('/settings');

      // Find and click "Delete account" button
      const deleteButton = page.getByRole('button', { name: /Delete account/i });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // Confirm the deletion in the confirmation dialog
      const confirmButton = page.getByRole('button', { name: /Delete|Confirm|Yes/i }).last();
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();

      // After deletion: session should be cleared and user redirected to home
      await expect(page).toHaveURL('/', { timeout: 15_000 });

      // "Sign In" link should be visible (user is now unauthenticated)
      await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    } finally {
      await browser.close();
      // Cleanup (in case the delete didn't work or the test failed)
      const sql = postgres(DATABASE_URL);
      try {
        await sql`DELETE FROM "user" WHERE email = ${email}`;
      } finally {
        await sql.end();
      }
    }
  });
});
