import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';
import { gotoExpectOk } from './helpers/goto-expect-ok';

test('home page loads', async ({ page }) => {
  await gotoExpectOk(page,'/');
  await expect(page).toHaveTitle(/Nawhas/i);
  await expect(page.locator('body')).toBeVisible();
});

test.describe('Home page content', () => {
  test('featured reciters section renders with at least 1 reciter card', async ({
    page,
    seedData,
  }) => {
    await gotoExpectOk(page,'/');

    // FeaturedReciters renders only when reciters.length > 0
    const section = page.getByRole('region', { name: 'Featured Reciters' });
    await expect(section).toBeVisible();

    // Scope by slug href to avoid strict-mode violations when multiple workers
    // have inserted reciters with the same name but different slugs.
    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await expect(reciterCard).toBeVisible();
  });

  test('recent albums section renders', async ({ page, seedData }) => {
    await gotoExpectOk(page,'/');

    // Scope by slug href to avoid strict-mode violations when multiple workers
    // have inserted albums with the same title but different slugs.
    const albumCard = page.locator(`a[href="/albums/${seedData.album.slug}"]`);
    await expect(albumCard).toBeVisible();
  });

  test('clicking reciter card navigates to reciter profile', async ({ page, seedData }) => {
    await gotoExpectOk(page,'/');

    const reciterCard = page.locator(`a[href="/reciters/${seedData.reciter.slug}"]`);
    await reciterCard.click();

    await expect(page).toHaveURL(`/reciters/${seedData.reciter.slug}`);
    await expect(page.getByRole('heading', { name: seedData.reciter.name, level: 1 })).toBeVisible();
  });
});
