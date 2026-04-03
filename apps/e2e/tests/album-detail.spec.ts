/**
 * E2E Tests — Album Detail Page (/albums/[slug])
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';

test.describe('Album detail page', () => {
  test('shows album title as heading', async ({ page, seedData }) => {
    await page.goto(`/albums/${seedData.album.slug}`);

    await expect(
      page.getByRole('heading', { name: seedData.album.title, level: 1 }),
    ).toBeVisible();
  });

  test('shows the album year', async ({ page, seedData }) => {
    await page.goto(`/albums/${seedData.album.slug}`);

    await expect(page.getByText(String(seedData.album.year))).toBeVisible();
  });

  test('shows the reciter name linked to the reciter profile', async ({ page, seedData }) => {
    await page.goto(`/albums/${seedData.album.slug}`);

    // AlbumHeader renders a Link to /reciters/[reciterSlug] with the reciter name
    const reciterLink = page.getByRole('link', { name: seedData.reciter.name });
    await expect(reciterLink).toBeVisible();
    await expect(reciterLink).toHaveAttribute('href', `/reciters/${seedData.reciter.slug}`);
  });

  test('lists tracks in the album', async ({ page, seedData }) => {
    await page.goto(`/albums/${seedData.album.slug}`);

    const trackList = page.getByRole('region', { name: 'Tracks' });
    await expect(trackList).toBeVisible();

    // The seed track should appear in the list
    const trackLink = page.getByRole('link', {
      name: new RegExp(`Track 1: ${seedData.track.title}`, 'i'),
    });
    await expect(trackLink).toBeVisible();
  });

  test('clicking a track navigates to the track detail page', async ({ page, seedData }) => {
    await page.goto(`/albums/${seedData.album.slug}`);

    const trackLink = page.getByRole('link', {
      name: new RegExp(`Track 1: ${seedData.track.title}`, 'i'),
    });
    await trackLink.click();

    const expectedUrl =
      `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
    await expect(page).toHaveURL(expectedUrl);
  });

  test('returns 404 for a non-existent album slug', async ({ page }) => {
    const response = await page.goto('/albums/this-album-does-not-exist-xyz');
    expect(response?.status()).toBe(404);
  });
});
