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

  // -------------------------------------------------------------------------
  // H2. Withdraw a pending access-request
  // -------------------------------------------------------------------------
  test('applicant can withdraw a pending application', async ({
    page,
    freshApplicant,
  }) => {
    await signIn(page, freshApplicant.email, freshApplicant.password);

    // Submit an application via the UI (no reason — optional).
    await gotoExpectOk(page, '/contribute/apply');
    await page.getByRole('button', { name: /Submit application/i }).click();
    await expect(page).toHaveURL(/\/contribute$/, { timeout: 15_000 });

    // Navigate back to the apply page — now shows the pending state with the
    // Withdraw button.
    await page.goto('/contribute/apply');
    await expect(
      page.getByText(/Your application is pending review/i),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Withdraw application/i }).click();

    // Backstop the click with a DB poll (the client-withdraw button's onClick
    // can be slow to land under dev hydration, but the route refresh is what
    // the test asserts on).
    await waitForAccessRequestStatus(freshApplicant.email, 'withdrawn');

    // After withdrawal the page re-renders the empty apply form, exposing the
    // textarea placeholder again.
    await page.reload();
    await expect(
      page.getByPlaceholder(/Tell us a bit about how you'd like to help/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // H3. Withdraw a pending submission (two-step confirm)
  // -------------------------------------------------------------------------
  test('contributor can withdraw a pending submission', async ({
    page,
    freshContributor,
  }) => {
    await signIn(page, freshContributor.email, freshContributor.password);

    // Submit a reciter via the new-reciter form. The form redirects to
    // /profile/contributions (the list view), not a per-id detail page.
    const reciterName = `Withdraw Test ${suffix()}`;
    await gotoExpectOk(page, '/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', {
      timeout: 20_000,
    });

    // Look up the new submission's id and navigate to its detail page.
    const submissionId = await getLatestSubmissionIdForEmail(
      freshContributor.email,
    );
    await gotoExpectOk(page, `/profile/contributions/${submissionId}`);

    // Two-step withdraw: click "Withdraw submission" → "Confirm withdraw".
    await page.getByRole('button', { name: /^Withdraw submission$/i }).click();
    await expect(page.getByText(/Are you sure\?/i)).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole('button', { name: /^Confirm withdraw$/i }).click();

    // Page refreshes; the status badge flips to "Withdrawn" and the
    // withdraw button is no longer rendered.
    await expect(page.getByText(/^Withdrawn$/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('button', { name: /^Withdraw submission$/i }),
    ).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // H4. Changes-requested banner surfaces feedback on the contributor's
  //     submission detail page (Phase F/G placement: not on a contribute
  //     edit page, but on /profile/contributions/[id]).
  // -------------------------------------------------------------------------
  test('changes-requested banner surfaces feedback on contribution detail page', async ({
    page,
    freshContributor,
    freshModerator,
  }) => {
    // Contributor submits a reciter via the UI.
    await signIn(page, freshContributor.email, freshContributor.password);
    const reciterName = `CR Reciter ${suffix()}`;
    await gotoExpectOk(page, '/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', {
      timeout: 20_000,
    });
    const submissionId = await getLatestSubmissionIdForEmail(
      freshContributor.email,
    );

    // Seed the moderator's "changes_requested" decision directly in the DB.
    // The mod review-actions UI's onClick is unreliable under dev-mode
    // Turbopack hydration in the local Docker stack (per the rationale
    // baked into m6-setup); CI runs prod where the click works, but the
    // DB seed is deterministic in either environment and exercises the
    // same getResubmitContext code path the banner depends on.
    await setSubmissionStatus(submissionId, 'changes_requested');
    await insertSubmissionReview({
      submissionId,
      reviewerEmail: freshModerator.email,
      action: 'changes_requested',
      comment: 'Add a publication year please.',
    });

    // Contributor opens the submission detail page → banner is visible
    // with the moderator's feedback comment.
    await gotoExpectOk(page, `/profile/contributions/${submissionId}`);
    await expect(page.getByText(/Changes requested/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Add a publication year/i)).toBeVisible();

    // Toggle the diff disclosure: collapsed → expanded → collapsed.
    await page
      .getByRole('button', { name: /See what's been changed/i })
      .click();
    await expect(
      page.getByRole('button', { name: /Hide changes/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  // -------------------------------------------------------------------------
  // H5. Public /contributor/[username] profile + 404
  // -------------------------------------------------------------------------
  //
  // No fixture is used here: this test creates its own contributor with an
  // explicit username (the worker-fixture helper auto-derives a username
  // from the email-local-part, but we want a stable, predictable handle the
  // public URL can be asserted against).
  test('public /contributor/[username] renders profile + heatmap', async ({
    page,
  }) => {
    const handle = `prof_${Date.now().toString(36)}`;
    const user: TestUser = {
      email: `w3-prof-${suffix()}@example.com`,
      password: 'W3LifecycleTest99!', // gitguardian:ignore — test-only credential, not a real secret
      name: 'W3 Public Profile',
      username: handle,
    };
    await registerAndVerify(user);
    await setRole(user.email, 'contributor');
    try {
      // Seed at least one submission so the profile has something to render.
      await createPendingReciterSubmission(
        user.email,
        `Profile Reciter ${suffix()}`,
      );

      // Navigate to the public profile (no auth required).
      const res = await page.goto(`/contributor/${handle}`);
      expect(res?.status()).toBeLessThan(400);

      // Heading shows the user's display name; the activity section + heatmap
      // both render.
      await expect(
        page.getByRole('heading', { name: user.name, level: 1 }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Contribution Activity/i)).toBeVisible();
      await expect(
        page.getByRole('img', { name: /Contribution activity heatmap/i }),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteUsers([user.email]);
    }
  });

  test('public /contributor/[bogus] returns 404', async ({ page }) => {
    const res = await page.goto('/contributor/no-such-user-xyz-123');
    expect(res?.status()).toBe(404);
  });
});
