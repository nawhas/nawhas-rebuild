/**
 * E2E Tests — Reciters Listing Page (/reciters)
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';
import { gotoExpectOk } from './helpers/goto-expect-ok';

test.describe('Reciters listing page', () => {
  test('page renders with reciter cards when reciters exist', async ({ page, seedData }) => {
    await gotoExpectOk(page,'/reciters');

    await expect(page).toHaveTitle(/Reciters/i);
    await expect(page.getByRole('heading', { name: 'Reciters', level: 1 })).toBeVisible();

    // Scope by slug href to avoid strict-mode violations when multiple workers
    // have inserted reciters with the same name but different slugs.
    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await expect(reciterCard).toBeVisible();
  });

  test('each reciter card shows the reciter name', async ({ page, seedData }) => {
    await gotoExpectOk(page,'/reciters');

    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await expect(reciterCard).toContainText(seedData.reciter.name);
  });

  test('each reciter card links to the reciter profile page', async ({ page, seedData }) => {
    await gotoExpectOk(page,'/reciters');

    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await reciterCard.click();

    await expect(page).toHaveURL(`/reciters/${seedData.reciter.slug}`);
  });

  test('reciters list renders inside per-letter labelled lists under a labelled nav', async ({
    page,
    seedData,
  }) => {
    await gotoExpectOk(page,'/reciters');

    // Wave 1 / Row 2 restructured ReciterGrid into per-letter <section>s,
    // each containing its own <ul role="list" aria-label="Reciters starting with X">.
    // The parent landmark carries aria-label="Reciters by letter".
    const root = page.getByRole('navigation', { name: 'Reciters by letter' });
    await expect(root).toBeVisible();

    // At least one per-letter list must exist (the seeded reciter lands in
    // exactly one bucket, but the page also renders an empty-letter row for
    // every other letter — so we just assert ≥ 1 labelled list overall).
    const perLetterLists = page.getByRole('list', { name: /^Reciters starting with [A-Z]$/ });
    await expect(perLetterLists.first()).toBeVisible();

    // The seed reciter lives inside one of those per-letter lists; that list
    // must have at least one listitem.
    const seedReciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    const owningList = page.getByRole('list', {
      name: new RegExp(`^Reciters starting with ${seedData.reciter.name[0].toUpperCase()}$`),
    });
    await expect(owningList).toBeVisible();
    await expect(seedReciterCard).toBeVisible();
  });
});
