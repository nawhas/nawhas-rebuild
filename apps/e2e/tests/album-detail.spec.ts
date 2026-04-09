/**
 * E2E Tests — Album Detail Page (/albums/[slug])
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';
import { gotoExpectNotFound, gotoExpectOk } from './helpers/goto-expect-ok';

test.describe('Album detail page', () => {
  test('shows album title as heading', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/albums/${seedData.album.slug}`);

    await expect(
      page.getByRole('heading', { name: seedData.album.title, level: 1 }),
    ).toBeVisible();
  });

  test('shows the album year', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/albums/${seedData.album.slug}`);

    await expect(page.getByText(String(seedData.album.year))).toBeVisible();
  });

  test('shows the reciter name linked to the reciter profile', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/albums/${seedData.album.slug}`);

    // AlbumHeader renders a Link to /reciters/[reciterSlug] with the reciter name
    const reciterLink = page.getByRole('link', { name: seedData.reciter.name });
    await expect(reciterLink).toBeVisible();
    await expect(reciterLink).toHaveAttribute('href', `/reciters/${seedData.reciter.slug}`);
  });

  test('lists tracks in the album', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/albums/${seedData.album.slug}`);

    const trackList = page.getByRole('region', { name: 'Tracks' });
    await expect(trackList).toBeVisible();

    // The seed track should appear in the list
    const trackLink = page.getByRole('link', {
      name: new RegExp(seedData.track.title, 'i'),
    });
    await expect(trackLink).toBeVisible();
  });

  test('clicking a track navigates to the track detail page', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/albums/${seedData.album.slug}`);

    const trackLink = page.getByRole('link', {
      name: new RegExp(seedData.track.title, 'i'),
    });
    await trackLink.click();

    const expectedUrl =
      `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
    await expect(page).toHaveURL(expectedUrl);
  });

  test('shows not-found page for a non-existent album slug', async ({ page }) => {
    await gotoExpectNotFound(page, '/albums/this-album-does-not-exist-xyz');
    await expect(
      page.getByRole('heading', { name: /Page not found/i }),
    ).toBeVisible();
  });
});
