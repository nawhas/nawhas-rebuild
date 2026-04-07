/**
 * E2E Tests — Moderation Flows (M6)
 *
 * Covers the complete moderation lifecycle:
 *
 *   1. Moderation queue shows pending submissions
 *   2. Moderator can approve a submission → Apply button appears
 *   3. Moderator applies an approved submission → "Applied successfully" shown
 *   4. Moderator can reject a submission → contributor notified by email
 *   5. Moderator can request changes → contributor sees resubmit button
 *   6. Contributor resubmits after changes_requested → status returns to pending
 *   7. Moderator can promote a user to contributor role
 *   8. Audit log shows moderation actions
 *
 * Each "review" test creates a fresh reciter submission as the contributor
 * via the submission form, then reviews it as the moderator. The two users
 * are created once per worker to avoid registration overhead.
 *
 * Requires:
 *   - web service running at BASE_URL
 *   - mailpit service running at MAILPIT_URL
 *   - postgres accessible at DATABASE_URL
 */

import { test as base, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
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
// Worker-scoped fixtures — contributor + moderator + promotable user
// ---------------------------------------------------------------------------

type WorkerFixtures = {
  contributor: TestUser;
  moderator: TestUser;
  promotableUser: TestUser;
};

const test = base.extend<Record<string, never>, WorkerFixtures>({
  contributor: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-mod-contrib-${suffix()}@example.com`,
        password: 'M6ModTest99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 Moderation Contributor',
      };
      await registerAndVerify(user);
      await setRole(user.email, 'contributor');
      await use(user);
      await deleteUsers([user.email]);
    },
    { scope: 'worker' },
  ],

  moderator: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-mod-moder-${suffix()}@example.com`,
        password: 'M6ModTest99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 Moderation Moderator',
      };
      await registerAndVerify(user);
      await setRole(user.email, 'moderator');
      await use(user);
      await deleteUsers([user.email]);
    },
    { scope: 'worker' },
  ],

  promotableUser: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-mod-promote-${suffix()}@example.com`,
        password: 'M6ModTest99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 Promotable User',
      };
      await registerAndVerify(user);
      // Stays at 'user' role until the test promotes them
      await use(user);
      await deleteUsers([user.email]);
    },
    { scope: 'worker' },
  ],
});

// ---------------------------------------------------------------------------
// Helper: create a reciter submission in a fresh browser context
// ---------------------------------------------------------------------------

/**
 * Opens a fresh browser context, signs in as contributor, navigates to the
 * reciter form, submits, then closes the context.
 *
 * Returns the reciter name that was submitted (useful for queue assertions).
 */
async function createReciterSubmission(
  browser: import('@playwright/test').Browser,
  contributor: TestUser,
  reciterName: string,
): Promise<void> {
  const ctx: BrowserContext = await browser.newContext();
  const pg = await ctx.newPage();
  try {
    await signIn(pg, contributor.email, contributor.password);
    await pg.goto('/contribute/reciter/new');
    await pg.fill('#name', reciterName);
    await pg.click('button[type="submit"]');
    await pg.waitForURL('/profile/contributions', { timeout: 20_000 });
  } finally {
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Moderation queue
// ---------------------------------------------------------------------------

test.describe('Moderation queue', () => {
  test('queue page renders with correct heading', async ({ page, moderator }) => {
    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await expect(page.getByRole('heading', { name: /Moderation Queue/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('submitted reciter appears in the queue', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Queue ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');

    await expect(page.getByText(reciterName)).toBeVisible({ timeout: 15_000 });
  });

  test('queue item shows type, action and status badges', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Badges ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');

    const item = page.getByRole('listitem').filter({ hasText: reciterName });
    await expect(item).toBeVisible({ timeout: 15_000 });

    // SubmissionTypeBadge, SubmissionActionBadge, SubmissionStatusBadge
    await expect(item.getByText(/Reciter/i)).toBeVisible();
    await expect(item.getByText(/Create/i)).toBeVisible();
    await expect(item.getByText(/Pending/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Submission detail page
// ---------------------------------------------------------------------------

test.describe('Submission detail page', () => {
  test('clicking a queue item opens the submission detail', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Detail ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');

    await page.getByText(reciterName).click();

    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: /Submission detail/i }),
    ).toBeVisible();
  });

  test('submission detail shows Approve, Request Changes and Reject buttons', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Buttons ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    await expect(page.getByRole('button', { name: /Approve/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Request Changes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reject/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Approve + Apply
// ---------------------------------------------------------------------------

test.describe('Approve and apply', () => {
  test('moderator can approve a submission → Apply button appears', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Approve ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    await page.getByRole('button', { name: /Approve/i }).click();

    // After approval the page refreshes and shows the Apply button
    await expect(
      page.getByRole('button', { name: /Apply to database/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('moderator applies approved submission → shows "Applied successfully"', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Apply ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    // Approve
    await page.getByRole('button', { name: /Approve/i }).click();
    await expect(
      page.getByRole('button', { name: /Apply to database/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Apply
    await page.getByRole('button', { name: /Apply to database/i }).click();

    await expect(page.getByText(/Applied successfully/i)).toBeVisible({ timeout: 15_000 });
  });

  test('contributor receives "approved" email after apply', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Approved Email ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    await page.getByRole('button', { name: /Approve/i }).click();
    await expect(
      page.getByRole('button', { name: /Apply to database/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Apply to database/i }).click();
    await expect(page.getByText(/Applied successfully/i)).toBeVisible({ timeout: 15_000 });

    const email = await pollForEmailWithSubject(
      contributor.email,
      /Your Reciter submission was approved/i,
      20_000,
    );
    expect(email).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Reject
// ---------------------------------------------------------------------------

test.describe('Reject submission', () => {
  test('clicking Reject expands a comment textarea', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Reject Expand ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    await page.getByRole('button', { name: /Reject/i }).click();

    // Textarea and Cancel button should now be visible
    await expect(page.locator('#review-comment')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
  });

  test('moderator can reject with a comment and contributor receives feedback email', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Reject Submit ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    // Expand reject panel
    await page.getByRole('button', { name: /Reject/i }).click();
    await page.fill('#review-comment', 'Duplicate entry — already in the library.');

    // Confirm rejection
    await page.getByRole('button', { name: /^Reject$/i }).click();

    // Page should refresh; review action buttons should disappear
    await expect(page.getByRole('button', { name: /Approve/i })).not.toBeVisible({
      timeout: 10_000,
    });

    // Contributor should receive a rejection email
    const email = await pollForEmailWithSubject(
      contributor.email,
      /Your submission was not approved/i,
      20_000,
    );
    expect(email).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Request Changes → Resubmit
// ---------------------------------------------------------------------------

test.describe('Request changes → resubmit', () => {
  test('moderator can request changes with a comment → contributor gets feedback email', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Changes ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    await page.getByRole('button', { name: /Request Changes/i }).click();
    await page.fill('#review-comment', 'Please correct the spelling of the name.');

    await page.getByRole('button', { name: /^Request Changes$/i }).click();

    // Buttons should be gone after successful review
    await expect(page.getByRole('button', { name: /Approve/i })).not.toBeVisible({
      timeout: 10_000,
    });

    const email = await pollForEmailWithSubject(
      contributor.email,
      /Changes requested on your submission/i,
      20_000,
    );
    expect(email).toBeTruthy();
  });

  test('contributor sees "Edit and resubmit" for changes_requested submission', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Resubmit ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    // Moderator requests changes
    const modCtx: BrowserContext = await browser.newContext();
    const modPage = await modCtx.newPage();
    try {
      await signIn(modPage, moderator.email, moderator.password);
      await modPage.goto('/mod/queue');
      await modPage.getByText(reciterName).click();
      await modPage.waitForURL(/\/mod\/submissions\//);
      await modPage.getByRole('button', { name: /Request Changes/i }).click();
      await modPage.fill('#review-comment', 'Fix the name please.');
      await modPage.getByRole('button', { name: /^Request Changes$/i }).click();
      // Wait for router.refresh() to complete — the status badge switches from
      // "Pending" to "Changes Requested" only after the server confirms the mutation.
      await modPage.getByText('Changes Requested').waitFor({ state: 'visible', timeout: 10_000 });
    } finally {
      await modCtx.close();
    }

    // Contributor views their contributions
    await signIn(page, contributor.email, contributor.password);
    await page.goto('/profile/contributions');

    const list = page.getByRole('list', { name: /Your submissions/i });
    const card = list.locator('li').filter({ hasText: reciterName });
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Expand the card
    await card.getByRole('button', { expanded: false }).click();

    // "Edit and resubmit" button should be visible for changes_requested submissions
    await expect(
      card.getByRole('button', { name: /Edit and resubmit/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('contributor can resubmit → status returns to pending', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Resubmit2 ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    // Moderator requests changes
    const modCtx: BrowserContext = await browser.newContext();
    const modPage = await modCtx.newPage();
    try {
      await signIn(modPage, moderator.email, moderator.password);
      await modPage.goto('/mod/queue');
      await modPage.getByText(reciterName).click();
      await modPage.waitForURL(/\/mod\/submissions\//);
      await modPage.getByRole('button', { name: /Request Changes/i }).click();
      await modPage.fill('#review-comment', 'Please fix.');
      await modPage.getByRole('button', { name: /^Request Changes$/i }).click();
      // Wait for router.refresh() to complete — the status badge switches from
      // "Pending" to "Changes Requested" only after the server confirms the mutation.
      await modPage.getByText('Changes Requested').waitFor({ state: 'visible', timeout: 10_000 });
    } finally {
      await modCtx.close();
    }

    // Contributor resubmits
    await signIn(page, contributor.email, contributor.password);
    await page.goto('/profile/contributions');

    const list = page.getByRole('list', { name: /Your submissions/i });
    const card = list.locator('li').filter({ hasText: reciterName });
    await card.getByRole('button', { expanded: false }).click();
    await card.getByRole('button', { name: /Edit and resubmit/i }).click();

    // The resubmit form should appear inside the card.
    // Fill in the corrected name and submit.
    const updatedName = `${reciterName} — Fixed`;
    await card.locator('#name').fill(updatedName);
    await card.getByRole('button', { name: /Submit for review/i }).click();

    // After resubmit the card should collapse and the status should be Pending again
    await page.waitForFunction(
      () => document.body.innerText.includes('Pending'),
      { timeout: 15_000 },
    );
  });
});

// ---------------------------------------------------------------------------
// User role promotion
// ---------------------------------------------------------------------------

test.describe('User role management', () => {
  test('moderator can promote a user to contributor via /mod/users', async ({
    page,
    moderator,
    promotableUser,
  }) => {
    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/users');

    await expect(
      page.getByRole('heading', { name: /User Management/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Find the user's row in the table
    const row = page.locator('tr').filter({ hasText: promotableUser.email });
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Change the role dropdown to "Contributor"
    const roleSelect = row.getByRole('combobox', { name: /Change user role/i });
    await roleSelect.selectOption('contributor');

    // Wait for the optimistic update / server round-trip
    // The select value should update; no hard error alert should appear
    await expect(roleSelect).toHaveValue('contributor', { timeout: 10_000 });
    await expect(row.getByRole('alert')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

test.describe('Audit log', () => {
  test('audit log page renders table with Action / Target type / Target ID columns', async ({
    page,
    moderator,
  }) => {
    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/audit');

    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible({
      timeout: 10_000,
    });

    // Column headers
    await expect(page.getByRole('columnheader', { name: /Action/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Target type/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Target ID/i })).toBeVisible();
  });

  test('approving a submission writes an entry to the audit log', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `QA Audit ${suffix()}`;
    await createReciterSubmission(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    await page.getByRole('button', { name: /Approve/i }).click();
    await expect(
      page.getByRole('button', { name: /Apply to database/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Apply to database/i }).click();
    await expect(page.getByText(/Applied successfully/i)).toBeVisible({ timeout: 15_000 });
    // Wait for the apply server action and any subsequent router.refresh() RSC fetch to settle
    // before navigating, so the audit log entry is guaranteed visible on the next page load.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => null);

    // Navigate to audit log — should contain a 'submission.applied' or similar entry
    await page.goto('/mod/audit');
    await expect(page).toHaveURL('/mod/audit', { timeout: 10_000 });
    // Use .first() — the audit log accumulates entries across tests (shared worker state);
    // strict mode would fail if multiple approval entries exist from earlier test runs.
    await expect(
      page.getByRole('cell', { name: /submission\.(applied|approved)/i }).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('role change writes an entry to the audit log', async ({
    page,
    moderator,
    promotableUser,
  }) => {
    await signIn(page, moderator.email, moderator.password);
    await page.goto('/mod/users');

    const row = page.locator('tr').filter({ hasText: promotableUser.email });
    await expect(row).toBeVisible({ timeout: 10_000 });
    const roleSelect = row.getByRole('combobox', { name: /Change user role/i });
    // The 'User role management' test earlier in this worker may have already promoted
    // promotableUser to 'contributor'. Read the current value and pick the other option
    // so a role change always actually fires (handleChange returns early if same value).
    const currentRole = await roleSelect.inputValue();
    const targetRole = currentRole === 'contributor' ? 'user' : 'contributor';
    await roleSelect.selectOption(targetRole);
    await expect(roleSelect).toHaveValue(targetRole, { timeout: 10_000 });
    // Wait for the server action to settle — the select is disabled while isPending=true,
    // then becomes enabled again once the mutation has committed to the DB.
    // 15 s covers slow CI environments where router.refresh() RSC re-fetch adds latency.
    await expect(roleSelect).toBeEnabled({ timeout: 15_000 });
    // Allow any pending network requests to settle before navigating.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => null);

    // Check audit log
    await page.goto('/mod/audit');
    await expect(page).toHaveURL('/mod/audit', { timeout: 10_000 });
    // Use .first() — multiple role.changed entries may exist across worker-reused tests.
    await expect(
      page.getByRole('cell', { name: /role\.(changed|set)/i }).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
