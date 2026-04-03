import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Nawhas/i);
  await expect(page.locator('body')).toBeVisible();
});

test.describe('Home page content', () => {
  test('featured reciters section renders with at least 1 reciter card', async ({
    page,
    seedData,
  }) => {
    await page.goto('/');

    // FeaturedReciters renders only when reciters.length > 0
    const section = page.getByRole('region', { name: 'Featured Reciters' });
    await expect(section).toBeVisible();

    // The seed reciter card should be present
    const reciterCard = page.getByRole('link', {
      name: `View ${seedData.reciter.name}'s profile`,
    });
    await expect(reciterCard).toBeVisible();
  });

  test('recent albums section renders', async ({ page, seedData }) => {
    await page.goto('/');

    // RecentAlbums section should be present once we have an album
    const albumCard = page.getByRole('link', {
      name: new RegExp(`View album: ${seedData.album.title}`, 'i'),
    });
    await expect(albumCard).toBeVisible();
  });

  test('clicking reciter card navigates to reciter profile', async ({ page, seedData }) => {
    await page.goto('/');

    const reciterCard = page.getByRole('link', {
      name: `View ${seedData.reciter.name}'s profile`,
    });
    await reciterCard.click();

    await expect(page).toHaveURL(`/reciters/${seedData.reciter.slug}`);
    await expect(page.getByRole('heading', { name: seedData.reciter.name, level: 1 })).toBeVisible();
  });
});
