/**
 * E2E Tests — Phase 2.4 W2 Moderation Flows
 *
 * Covers three new behaviours introduced in Wave 2:
 *
 *   1. approve-and-applies-immediately — clicking Approve on a pending
 *      submission both approves AND applies in one step (merged flow).
 *      The entity is reachable at its public URL with no extra step.
 *
 *   2. audit-filter — selecting action=submission.applied in the
 *      AuditFilters strip pushes the param to the URL and narrows the
 *      visible rows to that action only.
 *
 *   3. public-changes-feed — after a submission is applied the reciter
 *      name appears on /changes (public, no auth required) under "Today".
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
  type TestUser,
} from './helpers/m6-setup';
import { gotoExpectOk } from './helpers/goto-expect-ok';

const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Convert a reciter name to the slug the server will assign.
 * Mirrors apps/web/src/server/lib/slug.ts slugify().
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Worker-scoped fixtures — contributor + moderator
// ---------------------------------------------------------------------------

type WorkerFixtures = {
  contributor: TestUser;
  moderator: TestUser;
};

const test = base.extend<Record<string, never>, WorkerFixtures>({
  contributor: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-w2-contrib-${suffix()}@example.com`,
        password: 'M6W2Test99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 W2 Contributor',
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
        email: `m6-w2-moder-${suffix()}@example.com`,
        password: 'M6W2Test99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 W2 Moderator',
      };
      await registerAndVerify(user);
      await setRole(user.email, 'moderator');
      await use(user);
      await deleteUsers([user.email]);
    },
    { scope: 'worker' },
  ],
});

// ---------------------------------------------------------------------------
// Helper: submit a reciter via the contributor form
// ---------------------------------------------------------------------------

/**
 * Opens a fresh browser context, signs in as contributor, submits a reciter
 * creation form, waits for redirect to /profile/contributions, then closes
 * the context.
 */
async function submitReciter(
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
// Test 1 — approve-and-applies-immediately
// ---------------------------------------------------------------------------

test.describe('approve-and-applies-immediately', () => {
  test('single Approve click sets status to Applied and entity is reachable', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `E2E Reciter Approve ${suffix()}`;
    const expectedSlug = slugify(reciterName);

    // Contributor submits the reciter.
    await submitReciter(browser, contributor, reciterName);

    // Moderator opens the queue and navigates to the submission detail.
    await signIn(page, moderator.email, moderator.password);
    await gotoExpectOk(page, '/mod/queue');
    await expect(page.getByText(reciterName)).toBeVisible({ timeout: 15_000 });
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });

    // Single Approve click — merged approve+apply flow.
    await page.getByRole('button', { name: /Approve/i }).click();

    // The ReviewActions component unmounts once status transitions to 'applied'.
    // The status badge in the metadata sidebar should flip to "Applied".
    // It appears in both the header badge row and the sidebar dl; .first() picks either.
    await expect(page.getByText(/^Applied$/i).first()).toBeVisible({ timeout: 15_000 });

    // No "Apply to database" button should exist — that's the old two-step UI.
    await expect(
      page.getByRole('button', { name: /Apply to database/i }),
    ).not.toBeVisible();

    // The public reciter page must resolve — proving the entity was written to the DB.
    await gotoExpectOk(page, `/reciters/${expectedSlug}`);
    // The reciter heading on the public page shows the reciter name.
    await expect(
      page.getByRole('heading', { name: reciterName }),
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Test 2 — audit-filter
// ---------------------------------------------------------------------------

test.describe('audit-filter', () => {
  test('selecting action=submission.applied narrows table rows to that action', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    // Ensure at least one submission.applied entry exists by running the flow.
    const reciterName = `E2E Audit Filter ${suffix()}`;
    await submitReciter(browser, contributor, reciterName);

    await signIn(page, moderator.email, moderator.password);
    await gotoExpectOk(page, '/mod/queue');
    await page.getByText(reciterName).click();
    await expect(page).toHaveURL(/\/mod\/submissions\//, { timeout: 20_000 });
    await page.getByRole('button', { name: /Approve/i }).click();
    await expect(page.getByText(/^Applied$/i).first()).toBeVisible({ timeout: 15_000 });
    // Wait for the route refresh / network to settle before navigating.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => null);

    // Navigate to audit log.
    await gotoExpectOk(page, '/mod/audit');

    // Select action = submission.applied and apply.
    await page.selectOption('#audit-filter-action', 'submission.applied');
    await page.getByRole('button', { name: /Apply/i }).click();

    // The URL must contain the filter param.
    await expect(page).toHaveURL(/action=submission\.applied/, { timeout: 10_000 });

    // Every action cell in the table should show submission.applied.
    // Use page.waitForSelector to confirm at least one row appeared first.
    const actionCells = page.getByRole('cell', { name: /submission\.applied/i });
    await expect(actionCells.first()).toBeVisible({ timeout: 15_000 });

    // Assert no OTHER action values are visible in the action column.
    // All <td> cells with font-mono styling carry the action value.
    const allActionCells = page.locator('tbody td.font-mono');
    const count = await allActionCells.count();
    for (let i = 0; i < count; i++) {
      const text = await allActionCells.nth(i).innerText();
      expect(text).toMatch(/submission\.applied/);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3 — public /changes feed shows the applied submission
// ---------------------------------------------------------------------------

test.describe('public-changes-feed', () => {
  test('applied reciter appears in the /changes feed under Today', async ({
    page,
    browser,
    contributor,
    moderator,
  }) => {
    const reciterName = `E2E Changes Feed ${suffix()}`;

    // Submit as contributor.
    await submitReciter(browser, contributor, reciterName);

    // Approve (and apply) as moderator.
    const modCtx: BrowserContext = await browser.newContext();
    const modPage = await modCtx.newPage();
    try {
      await signIn(modPage, moderator.email, moderator.password);
      await modPage.goto('/mod/queue');
      await expect(modPage.getByText(reciterName)).toBeVisible({ timeout: 15_000 });
      await modPage.getByText(reciterName).click();
      await modPage.waitForURL(/\/mod\/submissions\//, { timeout: 20_000 });
      await modPage.getByRole('button', { name: /Approve/i }).click();
      await expect(modPage.getByText(/^Applied$/i).first()).toBeVisible({ timeout: 15_000 });
      await modPage
        .waitForLoadState('networkidle', { timeout: 10_000 })
        .catch(() => null);
    } finally {
      await modCtx.close();
    }

    // Navigate to /changes without logging in (public route).
    const response = await page.goto('/changes', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);

    // "Today" header must be visible.
    await expect(page.getByRole('heading', { name: /^Today$/i })).toBeVisible({
      timeout: 10_000,
    });

    // The newly applied reciter must appear in the feed.
    await expect(page.getByText(reciterName, { exact: false })).toBeVisible({
      timeout: 15_000,
    });
  });
});
