/**
 * E2E Tests — Reciters Listing Page (/reciters)
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';

test.describe('Reciters listing page', () => {
  test('page renders with reciter cards when reciters exist', async ({ page, seedData }) => {
    await page.goto('/reciters');

    await expect(page).toHaveTitle(/Reciters/i);
    await expect(page.getByRole('heading', { name: 'Reciters', level: 1 })).toBeVisible();

    // Scope by slug href to avoid strict-mode violations when multiple workers
    // have inserted reciters with the same name but different slugs.
    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await expect(reciterCard).toBeVisible();
  });

  test('each reciter card shows the reciter name', async ({ page, seedData }) => {
    await page.goto('/reciters');

    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await expect(reciterCard).toContainText(seedData.reciter.name);
  });

  test('each reciter card links to the reciter profile page', async ({ page, seedData }) => {
    await page.goto('/reciters');

    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await reciterCard.click();

    await expect(page).toHaveURL(`/reciters/${seedData.reciter.slug}`);
  });

  test('reciters list renders inside a labelled list', async ({ page, seedData }) => {
    await page.goto('/reciters');

    // ReciterGrid renders <ul role="list" aria-label="Reciters">
    const list = page.getByRole('list', { name: 'Reciters' });
    await expect(list).toBeVisible();

    const items = list.getByRole('listitem');
    await expect(items).not.toHaveCount(0);
  });
});
