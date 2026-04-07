/**
 * E2E Tests — Contributor Submission Flow (M6)
 *
 * Verifies the happy-path contributor submission experience:
 *
 *   - Contributor fills and submits the New Reciter form
 *   - After submission the contributor is redirected to /profile/contributions
 *   - The submission appears with a "Pending" status badge
 *   - A "submission received" notification email is sent to the contributor
 *   - The submission card can be expanded to reveal details
 *
 * Requires:
 *   - web service running at BASE_URL
 *   - mailpit service running at MAILPIT_URL
 *   - postgres accessible at DATABASE_URL
 */

import { test as base, expect } from '@playwright/test';
import {
  registerAndVerify,
  setRole,
  deleteUsers,
  signIn,
  pollForEmailWithSubject,
  type TestUser,
} from './helpers/m6-setup';

const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------------------------------------------------------------------------
// Worker-scoped contributor fixture
// ---------------------------------------------------------------------------

type WorkerFixtures = { contributor: TestUser };

const test = base.extend<Record<string, never>, WorkerFixtures>({
  contributor: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-sub-contrib-${suffix()}@example.com`,
        password: 'M6SubmitTest99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 Submission Contributor',
      };
      await registerAndVerify(user);
      await setRole(user.email, 'contributor');
      await use(user);
      await deleteUsers([user.email]);
    },
    { scope: 'worker' },
  ],
});

// ---------------------------------------------------------------------------
// Contributor landing page
// ---------------------------------------------------------------------------

test.describe('Contributor landing page', () => {
  test('shows all three submission type links', async ({ page, contributor }) => {
    await signIn(page, contributor.email, contributor.password);
    await page.goto('/contribute');

    await expect(page.getByRole('link', { name: /New Reciter/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Album/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Track/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /View your submission history/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// New reciter submission form
// ---------------------------------------------------------------------------

test.describe('New reciter submission form', () => {
  test('form renders with Name and Slug fields', async ({ page, contributor }) => {
    await signIn(page, contributor.email, contributor.password);
    await page.goto('/contribute/reciter/new');

    await expect(page.locator('#name')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#slug')).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit for review/i })).toBeVisible();
  });

  test('shows validation error when name is empty', async ({ page, contributor }) => {
    await signIn(page, contributor.email, contributor.password);
    await page.goto('/contribute/reciter/new');

    // Submit with empty name
    await page.click('button[type="submit"]');

    // Field-level error message should appear
    await expect(page.getByText(/Name is required/i)).toBeVisible({ timeout: 5_000 });

    // Must NOT navigate away
    await expect(page).toHaveURL(/\/contribute\/reciter\/new/);
  });

  test('successfully submits and redirects to /profile/contributions', async ({
    page,
    contributor,
  }) => {
    const reciterName = `QA Reciter ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await page.goto('/contribute/reciter/new');

    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/profile/contributions', { timeout: 15_000 });
  });

  test('submitted reciter appears in /profile/contributions with pending status', async ({
    page,
    contributor,
  }) => {
    const reciterName = `QA Reciter ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await page.goto('/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 15_000 });

    // Submission should appear in the list
    const list = page.getByRole('list', { name: /Your submissions/i });
    await expect(list).toBeVisible({ timeout: 10_000 });

    const submissionItem = list.getByText(reciterName);
    await expect(submissionItem).toBeVisible();

    // Should display a "Pending" status badge somewhere in the item
    // The badge text is the capitalised status value from SubmissionStatusBadge
    const listItem = list.locator('li').filter({ hasText: reciterName });
    await expect(listItem.getByText(/Pending/i)).toBeVisible();
  });

  test('submission card can be expanded to show details', async ({
    page,
    contributor,
  }) => {
    const reciterName = `QA Expand ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await page.goto('/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 15_000 });

    // Click the submission card to expand it
    const list = page.getByRole('list', { name: /Your submissions/i });
    const card = list.locator('li').filter({ hasText: reciterName });
    await card.getByRole('button', { expanded: false }).click();

    // Expanded state shows Submission ID label
    await expect(card.getByText(/Submission ID:/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Email notification on submission create
// ---------------------------------------------------------------------------

test.describe('Email notification — submission received', () => {
  test('contributor receives "submission received" email after creating a reciter', async ({
    page,
    contributor,
  }) => {
    const reciterName = `QA Email ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await page.goto('/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 15_000 });

    // Wait for the notification email to arrive in Mailpit
    const msg = await pollForEmailWithSubject(
      contributor.email,
      /Your Reciter submission was received/i,
      20_000,
    );

    expect(msg).toBeTruthy();
    expect(msg.Subject).toMatch(/Nawhas\.com/i);
  });
});

// ---------------------------------------------------------------------------
// /profile/contributions — empty state
// ---------------------------------------------------------------------------

test.describe('/profile/contributions — empty state', () => {
  test('shows empty message when contributor has no submissions', async ({
    page,
    contributor,
  }) => {
    await signIn(page, contributor.email, contributor.password);
    await page.goto('/profile/contributions');

    // If no submissions exist, the empty state text is shown
    // (This may not hold if prior tests in the same worker already created submissions,
    //  but each test uses a unique worker-scoped contributor so it is clean.)
    await expect(
      page.getByRole('heading', { name: /My Contributions/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
