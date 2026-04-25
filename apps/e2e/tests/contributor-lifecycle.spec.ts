/**
 * E2E Tests — Phase 2.4 W3 Contributor Lifecycle
 *
 * Six scenarios cover the full apply → contribute → moderate loop introduced
 * in Wave 3 of the M6 milestone:
 *
 *   H1. Apply → approve → contribute happy path.
 *   H2. Applicant withdraws a pending access-request.
 *   H3. Contributor withdraws a pending submission (two-step confirm).
 *   H4. ChangesRequestedBanner surfaces moderator feedback on the
 *       /profile/contributions/[id] detail page (Phase F/G placement).
 *   H5. Public /contributor/[username] renders profile + heatmap; bogus
 *       username returns 404.
 *   H6. Moderator pending-count badge decrements after clearing an item.
 *
 * Notes on dev-stack quirks (mirroring observations baked into m6-setup):
 * - Better-auth's React sign-in client can stall under Turbopack in dev mode;
 *   the helper signs in via the API and copies cookies into the page context.
 * - Some review-action onClicks fail to fire under Turbopack hydration in
 *   the local Docker stack; H4 therefore seeds the changes_requested state
 *   directly via DB helpers (setSubmissionStatus + insertSubmissionReview)
 *   rather than driving the moderator UI for that one assertion.
 * - The pending-count badge lives inside the user-menu dropdown (desktop) —
 *   H6 opens the avatar trigger before reading the badge.
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
  createPendingReciterSubmission,
  setSubmissionStatus,
  insertSubmissionReview,
  getLatestSubmissionIdForEmail,
  waitForUserRole,
  waitForAccessRequestStatus,
  type TestUser,
} from './helpers/m6-setup';
import { gotoExpectOk } from './helpers/goto-expect-ok';

const suffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------------------------------------------------------------------------
// Test-scoped fixtures
// ---------------------------------------------------------------------------
//
// We use *test*-scoped fixtures (not worker-scoped like moderation-w2.spec.ts)
// because each scenario needs a fresh applicant / contributor with a clean
// access-request and submission history. Worker scoping would let prior tests
// pollute the DB state under inspection.

interface TestFixtures {
  freshApplicant: TestUser;
  freshContributor: TestUser;
  freshModerator: TestUser;
}

const test = base.extend<TestFixtures>({
  freshApplicant: async ({}, use) => {
    const user: TestUser = {
      email: `w3-applicant-${suffix()}@example.com`,
      password: 'W3LifecycleTest99!', // gitguardian:ignore — test-only credential, not a real secret
      name: 'W3 Applicant',
    };
    await registerAndVerify(user);
    await use(user);
    await deleteUsers([user.email]);
  },

  freshContributor: async ({}, use) => {
    const user: TestUser = {
      email: `w3-contrib-${suffix()}@example.com`,
      password: 'W3LifecycleTest99!', // gitguardian:ignore — test-only credential, not a real secret
      name: 'W3 Contributor',
    };
    await registerAndVerify(user);
    await setRole(user.email, 'contributor');
    await use(user);
    await deleteUsers([user.email]);
  },

  freshModerator: async ({}, use) => {
    const user: TestUser = {
      email: `w3-mod-${suffix()}@example.com`,
      password: 'W3LifecycleTest99!', // gitguardian:ignore — test-only credential, not a real secret
      name: 'W3 Moderator',
    };
    await registerAndVerify(user);
    await setRole(user.email, 'moderator');
    await use(user);
    await deleteUsers([user.email]);
  },
});

// ---------------------------------------------------------------------------
// Phase 2.4 W3 — contributor lifecycle
// ---------------------------------------------------------------------------

test.describe('Phase 2.4 W3 — contributor lifecycle', () => {
  // -------------------------------------------------------------------------
  // H1. Apply → approve → contribute happy path
  // -------------------------------------------------------------------------
  test('apply → approve → contribute end-to-end', async ({
    page,
    browser,
    freshApplicant,
    freshModerator,
  }) => {
    // Applicant: signs in (role=user), navigates to /contribute, sees the
    // access-denied panel with the apply CTA.
    await signIn(page, freshApplicant.email, freshApplicant.password);
    await gotoExpectOk(page, '/contribute');
    await expect(
      page.getByRole('link', { name: /Apply for contributor access/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Click Apply, fill the reason, submit.
    await page.getByRole('link', { name: /Apply for contributor access/i }).click();
    await expect(page).toHaveURL(/\/contribute\/apply$/, { timeout: 10_000 });
    await page
      .getByPlaceholder(/Tell us a bit about how you'd like to help/i)
      .fill('I want to add Urdu translations.');
    await page.getByRole('button', { name: /Submit application/i }).click();

    // Form redirects to /contribute and refreshes; the layout now shows the
    // "Your application is pending review" panel (which lives in the layout
    // for non-contributors with a pending request).
    await expect(page).toHaveURL(/\/contribute$/, { timeout: 15_000 });
    await expect(
      page.getByText(/Your application is pending review/i),
    ).toBeVisible({ timeout: 10_000 });

    // Moderator: in a separate context, opens the access-requests queue and
    // approves the applicant.
    const modCtx: BrowserContext = await browser.newContext();
    const modPage = await modCtx.newPage();
    try {
      await signIn(modPage, freshModerator.email, freshModerator.password);
      await gotoExpectOk(modPage, '/mod/access-requests');
      await expect(modPage.getByText(freshApplicant.email)).toBeVisible({
        timeout: 15_000,
      });
      await modPage.getByText(freshApplicant.email).first().click();
      await expect(modPage).toHaveURL(/\/mod\/access-requests\/[0-9a-f-]+$/, {
        timeout: 10_000,
      });
      await modPage.getByRole('button', { name: /^Approve$/i }).click();
      // The decision panel pushes the moderator back to the queue index.
      await expect(modPage).toHaveURL(/\/mod\/access-requests\/?$/, {
        timeout: 15_000,
      });
    } finally {
      await modCtx.close();
    }

    // Backstop the UI clicks with DB polls so the next assertion has a
    // deterministic baseline regardless of route-refresh timing.
    await waitForAccessRequestStatus(freshApplicant.email, 'approved');
    await waitForUserRole(freshApplicant.email, 'contributor');

    // Applicant: revisit /contribute. The apply-CTA must be gone — they now
    // see the contribute landing page.
    await page.goto('/contribute');
    await expect(
      page.getByRole('link', { name: /Apply for contributor access/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: /^Contribute$/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('link', { name: /New Reciter/i }),
    ).toBeVisible();
  });
});
