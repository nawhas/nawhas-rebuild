/**
 * E2E Tests — Track Detail Page (/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug])
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';

test.describe('Track detail page', () => {
  function trackUrl(seedData: { reciter: { slug: string }; album: { slug: string }; track: { slug: string } }): string {
    return `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
  }

  test('shows track title as heading', async ({ page, seedData }) => {
    await page.goto(trackUrl(seedData));

    await expect(
      page.getByRole('heading', { name: seedData.track.title, level: 1 }),
    ).toBeVisible();
  });

  test('shows reciter name linked to reciter profile', async ({ page, seedData }) => {
    await page.goto(trackUrl(seedData));

    // TrackHeader renders a Link to /reciters/[reciter.slug] with the reciter name
    const reciterLink = page.getByRole('link', { name: seedData.reciter.name });
    await expect(reciterLink).toBeVisible();
    await expect(reciterLink).toHaveAttribute('href', `/reciters/${seedData.reciter.slug}`);
  });

  test('shows album title linked to album detail', async ({ page, seedData }) => {
    await page.goto(trackUrl(seedData));

    // TrackHeader renders a Link to /albums/[album.slug] with the album title
    const albumLink = page.getByRole('link', { name: seedData.album.title });
    await expect(albumLink).toBeVisible();
    await expect(albumLink).toHaveAttribute('href', `/albums/${seedData.album.slug}`);
  });

  test('lyrics section is visible', async ({ page, seedData }) => {
    await page.goto(trackUrl(seedData));

    const lyricsSection = page.getByRole('region', { name: 'Lyrics' });
    await expect(lyricsSection).toBeVisible();
  });

  test('language tab switcher is visible when multiple languages exist', async ({
    page,
    seedData,
  }) => {
    await page.goto(trackUrl(seedData));

    // LyricsDisplay renders <div role="tablist" aria-label="Lyrics language"> when > 1 language
    const tabList = page.getByRole('tablist', { name: 'Lyrics language' });
    await expect(tabList).toBeVisible();

    // Expect tabs for Arabic and English
    await expect(page.getByRole('tab', { name: 'Arabic' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'English' })).toBeVisible();
  });

  test('Arabic tab is selected by default (highest priority)', async ({ page, seedData }) => {
    await page.goto(trackUrl(seedData));

    const arabicTab = page.getByRole('tab', { name: 'Arabic' });
    await expect(arabicTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to English language tab and see English lyrics', async ({
    page,
    seedData,
  }) => {
    await page.goto(trackUrl(seedData));

    // Click the English tab
    const englishTab = page.getByRole('tab', { name: 'English' });
    await englishTab.click();

    await expect(englishTab).toHaveAttribute('aria-selected', 'true');

    // English panel should be visible; Arabic panel should be hidden
    const englishPanel = page.getByRole('tabpanel', { name: 'English' });
    await expect(englishPanel).toBeVisible();

    const arabicPanel = page.getByRole('tabpanel', { name: 'Arabic' });
    await expect(arabicPanel).toBeHidden();
  });

  test('Arabic lyrics content renders correctly', async ({ page, seedData }) => {
    await page.goto(trackUrl(seedData));

    // Arabic tab is selected by default — its panel is visible
    const arabicPanel = page.getByRole('tabpanel', { name: 'Arabic' });
    await expect(arabicPanel).toBeVisible();
    await expect(arabicPanel).toContainText('يا حسين');
  });

  test('English lyrics content renders correctly after switching tab', async ({
    page,
    seedData,
  }) => {
    await page.goto(trackUrl(seedData));

    await page.getByRole('tab', { name: 'English' }).click();

    const englishPanel = page.getByRole('tabpanel', { name: 'English' });
    await expect(englishPanel).toContainText('Ya Hussain');
  });

  test('shows not-found page for a non-existent track slug', async ({ page, seedData }) => {
    await page.goto(
      `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/this-track-does-not-exist-xyz`,
    );
    await expect(
      page.getByRole('heading', { name: /Page not found/i }),
    ).toBeVisible();
  });
});
