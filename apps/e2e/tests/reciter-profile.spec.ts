/**
 * E2E Tests — Reciter Profile Page (/reciters/[slug])
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';
import { gotoExpectNotFound, gotoExpectOk } from './helpers/goto-expect-ok';

test.describe('Reciter profile page', () => {
  test('shows reciter name as heading', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/reciters/${seedData.reciter.slug}`);

    await expect(
      page.getByRole('heading', { name: seedData.reciter.name, level: 1 }),
    ).toBeVisible();
  });

  test('shows album count in reciter details', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/reciters/${seedData.reciter.slug}`);

    // ReciterHeader renders "N album(s)" below the name
    await expect(page.getByText('1 album')).toBeVisible();
  });

  test('lists albums in the discography section', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/reciters/${seedData.reciter.slug}`);

    const discography = page.getByRole('region', { name: 'Discography' });
    await expect(discography).toBeVisible();

    // The seed album card should be present
    const albumCard = page.getByRole('link', {
      name: new RegExp(`View album: ${seedData.album.title}`, 'i'),
    });
    await expect(albumCard).toBeVisible();
  });

  test('clicking album card navigates to album detail', async ({ page, seedData }) => {
    await gotoExpectOk(page,`/reciters/${seedData.reciter.slug}`);

    const albumCard = page.getByRole('link', {
      name: new RegExp(`View album: ${seedData.album.title}`, 'i'),
    });
    await albumCard.click();

    // AlbumCard links to /albums/[album.slug]
    await expect(page).toHaveURL(`/albums/${seedData.album.slug}`);
    await expect(
      page.getByRole('heading', { name: seedData.album.title, level: 1 }),
    ).toBeVisible();
  });

  test('shows not-found page for a non-existent reciter slug', async ({ page }) => {
    await gotoExpectNotFound(page, '/reciters/this-reciter-does-not-exist-xyz');
    await expect(
      page.getByRole('heading', { name: /Page not found/i }),
    ).toBeVisible();
  });
});
