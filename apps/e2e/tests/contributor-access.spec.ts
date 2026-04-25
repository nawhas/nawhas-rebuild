/**
 * E2E Tests — Contributor & Moderator Access Control (M6)
 *
 * Verifies that /contribute/* and /mod/* routes enforce role-based access:
 *
 *   /contribute/*
 *     - Unauthenticated users → redirected to /login
 *     - Authenticated users with 'user' role → "Contributor Access Required" page
 *     - Authenticated contributors (or moderators) → can access the page
 *
 *   /mod/*
 *     - Unauthenticated users → redirected to /login
 *     - Authenticated non-moderators (user / contributor) → redirected to /
 *     - Authenticated moderators → can access the page
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
  type TestUser,
} from './helpers/m6-setup';
import { gotoExpectOk } from './helpers/goto-expect-ok';

const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------------------------------------------------------------------------
// Worker-scoped fixtures
// ---------------------------------------------------------------------------

type WorkerFixtures = {
  userAccount: TestUser;
  contributorAccount: TestUser;
  moderatorAccount: TestUser;
};

const test = base.extend<Record<string, never>, WorkerFixtures>({
  userAccount: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-access-user-${suffix()}@example.com`,
        password: 'M6AccessTest99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 Access User',
      };
      await registerAndVerify(user);
      await use(user);
      await deleteUsers([user.email]);
    },
    { scope: 'worker' },
  ],

  contributorAccount: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-access-contrib-${suffix()}@example.com`,
        password: 'M6AccessTest99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 Access Contributor',
      };
      await registerAndVerify(user);
      await setRole(user.email, 'contributor');
      await use(user);
      await deleteUsers([user.email]);
    },
    { scope: 'worker' },
  ],

  moderatorAccount: [
    async ({}, use) => {
      const user: TestUser = {
        email: `m6-access-mod-${suffix()}@example.com`,
        password: 'M6AccessTest99!', // gitguardian:ignore — test-only credential, not a real secret
        name: 'M6 Access Moderator',
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
// /contribute — unauthenticated
// ---------------------------------------------------------------------------

test.describe('/contribute — unauthenticated redirect', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('unauthenticated user visiting /contribute is redirected to /login', async ({ page }) => {
    await gotoExpectOk(page,'/contribute');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user visiting /contribute/reciter/new is redirected to /login', async ({
    page,
  }) => {
    await gotoExpectOk(page,'/contribute/reciter/new');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// /contribute — user role (blocked)
// ---------------------------------------------------------------------------

test.describe('/contribute — user role sees access-denied page', () => {
  test('regular user sees "Contributor Access Required" heading', async ({
    page,
    userAccount,
  }) => {
    await signIn(page, userAccount.email, userAccount.password);
    await gotoExpectOk(page,'/contribute');

    await expect(
      page.getByRole('heading', { name: /Contributor Access Required/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Must NOT show the contribute landing page content
    await expect(page.getByRole('link', { name: /New Reciter/i })).not.toBeVisible();
  });

  test('user role visiting /contribute/reciter/new also sees access-denied page', async ({
    page,
    userAccount,
  }) => {
    await signIn(page, userAccount.email, userAccount.password);
    await gotoExpectOk(page,'/contribute/reciter/new');

    await expect(
      page.getByRole('heading', { name: /Contributor Access Required/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// /contribute — contributor role (allowed)
// ---------------------------------------------------------------------------

test.describe('/contribute — contributor can access', () => {
  test('contributor sees the contribute landing page', async ({
    page,
    contributorAccount,
  }) => {
    await signIn(page, contributorAccount.email, contributorAccount.password);
    await gotoExpectOk(page,'/contribute');

    await expect(page.getByRole('heading', { name: /Contribute/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('link', { name: /New Reciter/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Album/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Track/i })).toBeVisible();
  });

  test('contributor can navigate to the reciter submission form', async ({
    page,
    contributorAccount,
  }) => {
    await signIn(page, contributorAccount.email, contributorAccount.password);
    await gotoExpectOk(page,'/contribute/reciter/new');

    await expect(page.getByRole('heading', { name: /New Reciter/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: /Submit for review/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// /mod — unauthenticated
// ---------------------------------------------------------------------------

test.describe('/mod — unauthenticated redirect', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('unauthenticated user visiting /mod is redirected to /login', async ({ page }) => {
    await gotoExpectOk(page,'/mod');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user visiting /mod/queue is redirected to /login', async ({ page }) => {
    await gotoExpectOk(page,'/mod/queue');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// /mod — non-moderator (redirected to /)
// ---------------------------------------------------------------------------

test.describe('/mod — non-moderator redirected to /', () => {
  test('user role visiting /mod is redirected to /', async ({ page, userAccount }) => {
    await signIn(page, userAccount.email, userAccount.password);
    await gotoExpectOk(page,'/mod');
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('contributor role visiting /mod is redirected to /', async ({
    page,
    contributorAccount,
  }) => {
    await signIn(page, contributorAccount.email, contributorAccount.password);
    await gotoExpectOk(page,'/mod');
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('non-moderator visiting /mod/queue is redirected to /', async ({
    page,
    userAccount,
  }) => {
    await signIn(page, userAccount.email, userAccount.password);
    await gotoExpectOk(page,'/mod/queue');
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// /mod — moderator (allowed)
// ---------------------------------------------------------------------------

test.describe('/mod — moderator can access', () => {
  test('moderator sees the moderation overview page', async ({
    page,
    moderatorAccount,
  }) => {
    await signIn(page, moderatorAccount.email, moderatorAccount.password);
    await gotoExpectOk(page,'/mod');

    // Wave 3 Row 15 moved the page-level "Moderation Overview" h1 to a layout-
    // level "Moderation" h1 shared across all /mod routes (the URL itself
    // implies which sub-page the user is on). Match the layout heading.
    await expect(
      page.getByRole('heading', { name: /^Moderation$/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('moderator sees the moderation sidebar navigation', async ({
    page,
    moderatorAccount,
  }) => {
    await signIn(page, moderatorAccount.email, moderatorAccount.password);
    await gotoExpectOk(page,'/mod');

    const nav = page.getByRole('navigation', { name: /Moderation navigation/i });
    await expect(nav).toBeVisible({ timeout: 10_000 });
    await expect(nav.getByRole('link', { name: 'Queue' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Audit Log' })).toBeVisible();
  });

  test('moderator can navigate to the moderation queue', async ({
    page,
    moderatorAccount,
  }) => {
    await signIn(page, moderatorAccount.email, moderatorAccount.password);
    await gotoExpectOk(page,'/mod/queue');

    await expect(
      page.getByRole('heading', { name: /Moderation Queue/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('moderator can navigate to the audit log', async ({
    page,
    moderatorAccount,
  }) => {
    await signIn(page, moderatorAccount.email, moderatorAccount.password);
    await gotoExpectOk(page,'/mod/audit');

    await expect(
      page.getByRole('heading', { name: /Audit Log/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('moderator can navigate to user management', async ({
    page,
    moderatorAccount,
  }) => {
    await signIn(page, moderatorAccount.email, moderatorAccount.password);
    await gotoExpectOk(page,'/mod/users');

    await expect(
      page.getByRole('heading', { name: /User Management/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
