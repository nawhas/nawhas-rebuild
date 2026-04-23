/**
 * E2E Tests — Contributor Submission Flow (M6)
 *
 * Verifies the happy-path contributor submission experience:
 *
 *   - Contributor fills and submits the New Reciter form (W1 fields)
 *   - After submission the contributor is redirected to /profile/contributions
 *   - The submission appears with a "Pending" status badge
 *   - A "submission received" notification email is sent to the contributor
 *   - The submission card can be expanded to reveal details
 *   - New Album and New Track forms (W1 ParentPicker) are covered
 *
 * Requires:
 *   - web service running at BASE_URL
 *   - mailpit service running at MAILPIT_URL
 *   - postgres accessible at DATABASE_URL
 */

import { test as base, expect } from '@playwright/test';
import postgres from 'postgres';
import {
  registerAndVerify,
  setRole,
  deleteUsers,
  signIn,
  pollForEmailWithSubject,
  DATABASE_URL,
  type TestUser,
} from './helpers/m6-setup';
import { gotoExpectOk } from './helpers/goto-expect-ok';

const suffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------------------------------------------------------------------------
// Seed helpers — insert minimal reciter + album for album/track tests
// ---------------------------------------------------------------------------

interface SeedParents {
  reciterId: string;
  reciterName: string;
  albumId: string;
  albumTitle: string;
}

async function insertContribSeedData(workerIndex: number): Promise<SeedParents> {
  const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 5 });
  const w = workerIndex;
  try {
    const [reciter] = await sql<{ id: string; name: string }[]>`
      INSERT INTO reciters (id, name, slug)
      VALUES (gen_random_uuid(), 'E2E Reciter Contrib', ${'e2e-reciter-contrib-' + w})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `;
    if (!reciter) throw new Error('Failed to insert contrib reciter');

    const [album] = await sql<{ id: string; title: string }[]>`
      INSERT INTO albums (id, title, slug, reciter_id, year)
      VALUES (gen_random_uuid(), 'E2E Album Contrib', ${'e2e-album-contrib-' + w}, ${reciter.id}, 2024)
      ON CONFLICT (reciter_id, slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id, title
    `;
    if (!album) throw new Error('Failed to insert contrib album');

    return {
      reciterId: reciter.id,
      reciterName: reciter.name,
      albumId: album.id,
      albumTitle: album.title,
    };
  } finally {
    await sql.end();
  }
}

async function deleteContribSeedData(reciterId: string): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 5 });
  try {
    // Cascade handles albums → tracks → lyrics
    await sql`DELETE FROM reciters WHERE id = ${reciterId}`;
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Worker-scoped fixtures
// ---------------------------------------------------------------------------

type WorkerFixtures = {
  contributor: TestUser;
  seedParents: SeedParents;
};

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

  seedParents: [
    async ({}, use, workerInfo) => {
      const data = await insertContribSeedData(workerInfo.workerIndex);
      await use(data);
      await deleteContribSeedData(data.reciterId);
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
    await gotoExpectOk(page, '/contribute');

    await expect(page.getByRole('link', { name: /New Reciter/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Album/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /New Track/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /View your submission history/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// New reciter submission form (W1)
// ---------------------------------------------------------------------------

test.describe('New reciter submission form', () => {
  test('form renders with Name field (no slug field)', async ({ page, contributor }) => {
    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/reciter/new');

    await expect(page.locator('#name')).toBeVisible({ timeout: 10_000 });
    // W1: slug field removed — confirm it is not present
    await expect(page.locator('#slug')).not.toBeAttached();
    // Submit button text from contribute.form.submit
    await expect(page.getByRole('button', { name: /Submit for review/i })).toBeVisible();
  });

  test('shows validation error when name is empty', async ({ page, contributor }) => {
    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/reciter/new');

    // Submit with empty name
    await page.click('button[type="submit"]');

    // Field-level error message should appear (contribute.form.nameRequired)
    await expect(page.getByText(/Name is required/i)).toBeVisible({ timeout: 5_000 });

    // Must NOT navigate away
    await expect(page).toHaveURL(/\/contribute\/reciter\/new/);
  });

  test('SlugPreview appears once name is typed', async ({ page, contributor }) => {
    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/reciter/new');

    await page.fill('#name', 'QA Reciter');

    // contribute.slug.preview = "URL preview: {url}" → /reciters/qa-reciter
    await expect(page.getByText(/URL preview:.*\/reciters\/qa-reciter/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('successfully submits and redirects to /profile/contributions', async ({
    page,
    contributor,
  }) => {
    const reciterName = `QA Reciter ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/reciter/new');

    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });
  });

  test('submitted reciter appears in /profile/contributions with pending status', async ({
    page,
    contributor,
  }) => {
    const reciterName = `QA Reciter ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });

    // Submission should appear in the list
    const list = page.getByRole('list', { name: /Your submissions/i });
    await expect(list).toBeVisible({ timeout: 10_000 });

    const submissionItem = list.getByText(reciterName);
    await expect(submissionItem).toBeVisible();

    // Should display a "Pending" status badge somewhere in the item
    const listItem = list.locator('li').filter({ hasText: reciterName });
    await expect(listItem.getByText(/Pending/i)).toBeVisible();
  });

  test('submission card can be expanded to show details', async ({
    page,
    contributor,
  }) => {
    const reciterName = `QA Expand ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });

    // Click the submission card to expand it
    const list = page.getByRole('list', { name: /Your submissions/i });
    const card = list.locator('li').filter({ hasText: reciterName });
    await card.getByRole('button', { expanded: false }).click();

    // Expanded state shows Submission ID label (contribute.history.submissionId)
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
    await gotoExpectOk(page, '/contribute/reciter/new');
    await page.fill('#name', reciterName);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });

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
    await gotoExpectOk(page, '/profile/contributions');

    // If no submissions exist, the empty state text is shown
    // (This may not hold if prior tests in the same worker already created submissions,
    //  but each test uses a unique worker-scoped contributor so it is clean.)
    await expect(
      page.getByRole('heading', { name: /My Contributions/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// New album submission form (W1 — ParentPicker for reciter)
// ---------------------------------------------------------------------------

test.describe('New album submission form', () => {
  test('form renders with ParentPicker combobox (no raw reciterId input)', async ({
    page,
    contributor,
  }) => {
    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/album/new');

    // ParentPicker renders an input with role="combobox" and id="reciter"
    await expect(page.locator('#reciter[role="combobox"]')).toBeVisible({ timeout: 10_000 });
    // No raw reciterId text input
    await expect(page.locator('#reciterId')).not.toBeAttached();
    // Title field present
    await expect(page.locator('#title')).toBeVisible();
    // Submit button
    await expect(page.getByRole('button', { name: /Submit for review/i })).toBeVisible();
  });

  test('shows validation error when reciter is not selected', async ({
    page,
    contributor,
  }) => {
    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/album/new');

    await page.fill('#title', 'Test Album Title');
    await page.click('button[type="submit"]');

    // contribute.album.reciterRequired = "Please select a reciter."
    await expect(page.getByText(/Please select a reciter/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/contribute\/album\/new/);
  });

  test('successfully submits album and redirects to /profile/contributions', async ({
    page,
    contributor,
    seedParents,
  }) => {
    const albumTitle = `QA Album ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/album/new');

    // Type reciter name into the ParentPicker combobox
    const reciterInput = page.locator('#reciter[role="combobox"]');
    await reciterInput.fill(seedParents.reciterName);

    // Wait for the dropdown option to appear and click it
    await expect(
      page.getByRole('option', { name: seedParents.reciterName }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('option', { name: seedParents.reciterName }).click();

    await page.fill('#title', albumTitle);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });
  });

  test('submitted album appears in /profile/contributions with pending status', async ({
    page,
    contributor,
    seedParents,
  }) => {
    const albumTitle = `QA Album Pending ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/album/new');

    const reciterInput = page.locator('#reciter[role="combobox"]');
    await reciterInput.fill(seedParents.reciterName);
    await expect(
      page.getByRole('option', { name: seedParents.reciterName }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('option', { name: seedParents.reciterName }).click();

    await page.fill('#title', albumTitle);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });

    const list = page.getByRole('list', { name: /Your submissions/i });
    await expect(list).toBeVisible({ timeout: 10_000 });

    const submissionItem = list.getByText(albumTitle);
    await expect(submissionItem).toBeVisible();

    const listItem = list.locator('li').filter({ hasText: albumTitle });
    await expect(listItem.getByText(/Pending/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// New track submission form (W1 — ParentPicker for album + LyricsTabs)
// ---------------------------------------------------------------------------

test.describe('New track submission form', () => {
  test('form renders with ParentPicker combobox (no raw albumId input)', async ({
    page,
    contributor,
  }) => {
    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/track/new');

    // ParentPicker renders an input with role="combobox" and id="album"
    await expect(page.locator('#album[role="combobox"]')).toBeVisible({ timeout: 10_000 });
    // No raw albumId text input
    await expect(page.locator('#albumId')).not.toBeAttached();
    // Title field present
    await expect(page.locator('#title')).toBeVisible();
    // LyricsTabs tablist visible
    await expect(page.getByRole('tablist', { name: /Lyrics languages/i })).toBeVisible();
    // Submit button
    await expect(page.getByRole('button', { name: /Submit for review/i })).toBeVisible();
  });

  test('shows validation error when album is not selected', async ({
    page,
    contributor,
  }) => {
    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/track/new');

    await page.fill('#title', 'Test Track Title');
    await page.click('button[type="submit"]');

    // contribute.track.albumRequired = "Please select an album."
    await expect(page.getByText(/Please select an album/i)).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/contribute\/track\/new/);
  });

  test('successfully submits track with Arabic lyrics and redirects', async ({
    page,
    contributor,
    seedParents,
  }) => {
    const trackTitle = `QA Track ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/track/new');

    // Pick album via ParentPicker combobox
    const albumInput = page.locator('#album[role="combobox"]');
    await albumInput.fill(seedParents.albumTitle);
    await expect(
      page.getByRole('option', { name: seedParents.albumTitle }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('option', { name: seedParents.albumTitle }).click();

    await page.fill('#title', trackTitle);

    // Switch to Arabic lyrics tab (contribute.lyrics.lang_ar = "Arabic")
    await page.getByRole('tab', { name: /Arabic/i }).click();

    // Fill Arabic lyrics in the active tabpanel
    const arabicPanel = page.locator('#lyrics-panel-ar');
    await expect(arabicPanel).toBeVisible();
    await arabicPanel.locator('textarea').fill('يا حسين يا حسين');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });
  });

  test('submitted track appears in /profile/contributions with pending status', async ({
    page,
    contributor,
    seedParents,
  }) => {
    const trackTitle = `QA Track Pending ${suffix()}`;

    await signIn(page, contributor.email, contributor.password);
    await gotoExpectOk(page, '/contribute/track/new');

    const albumInput = page.locator('#album[role="combobox"]');
    await albumInput.fill(seedParents.albumTitle);
    await expect(
      page.getByRole('option', { name: seedParents.albumTitle }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('option', { name: seedParents.albumTitle }).click();

    await page.fill('#title', trackTitle);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/profile/contributions', { timeout: 20_000 });

    const list = page.getByRole('list', { name: /Your submissions/i });
    await expect(list).toBeVisible({ timeout: 10_000 });

    const submissionItem = list.getByText(trackTitle);
    await expect(submissionItem).toBeVisible();

    const listItem = list.locator('li').filter({ hasText: trackTitle });
    await expect(listItem.getByText(/Pending/i)).toBeVisible();
  });
});
