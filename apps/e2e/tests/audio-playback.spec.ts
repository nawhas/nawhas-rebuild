/**
 * E2E Tests — Audio Playback & Queue (NAW-100)
 *
 * Covers all acceptance criteria for NAW-100.
 *
 * Queue-panel test ("add to queue appears in queue panel") remains as
 * test.todo() pending NAW-98 (queue management UI).
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';

type SeedParam = Parameters<Parameters<typeof test>[2]>[0]['seedData'];

function albumUrl(seedData: Pick<SeedParam, 'album'>): string {
  return `/albums/${seedData.album.slug}`;
}

function trackUrl(seedData: Pick<SeedParam, 'reciter' | 'album' | 'track'>): string {
  return `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
}

// ---------------------------------------------------------------------------
// Player bar — appearance & persistence
// ---------------------------------------------------------------------------

test.describe('Audio playback — player bar', () => {
  test('playing a track from the album detail page causes the player bar to appear', async ({
    page,
    seedData,
  }) => {
    await page.goto(albumUrl(seedData));

    await page.getByRole('button', { name: `Play ${seedData.track.title}` }).click();

    // The player bar shows a Pause button once playback starts
    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('player bar persists after navigating to another page', async ({ page, seedData }) => {
    await page.goto(albumUrl(seedData));
    await page.getByRole('button', { name: `Play ${seedData.track.title}` }).click();

    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Navigate away; the player lives in the root layout so it must survive
    await page.goto('/reciters');
    await expect(playerBar).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Transport controls
// ---------------------------------------------------------------------------

test.describe('Audio playback — transport controls', () => {
  test('Play/Pause button toggles playback state', async ({ page, seedData }) => {
    await page.goto(albumUrl(seedData));
    await page.getByRole('button', { name: `Play ${seedData.track.title}` }).click();

    const playerBar = page.getByRole('region', { name: 'Audio player' });

    // Track is playing — Pause visible
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Pause → Play
    await playerBar.getByRole('button', { name: 'Pause' }).click();
    await expect(playerBar.getByRole('button', { name: 'Play' })).toBeVisible();

    // Play → Pause
    await playerBar.getByRole('button', { name: 'Play' }).click();
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('Next button advances to the next track in the queue', async ({ page, seedData }) => {
    // Use Play All to load both seed tracks into the queue
    await page.goto(albumUrl(seedData));
    await page.getByRole('button', { name: 'Play All' }).click();

    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar).toContainText(seedData.track.title);

    await playerBar.getByRole('button', { name: 'Next track' }).click();

    await expect(playerBar).toContainText(seedData.track2.title);
  });

  test('Previous button returns to the previous track in the queue', async ({
    page,
    seedData,
  }) => {
    await page.goto(albumUrl(seedData));
    await page.getByRole('button', { name: 'Play All' }).click();

    const playerBar = page.getByRole('region', { name: 'Audio player' });

    // Advance to track 2
    await playerBar.getByRole('button', { name: 'Next track' }).click();
    await expect(playerBar).toContainText(seedData.track2.title);

    // Go back to track 1
    await playerBar.getByRole('button', { name: 'Previous track' }).click();
    await expect(playerBar).toContainText(seedData.track.title);
  });

  test('seek bar reflects updated position after interaction', async ({ page, seedData }) => {
    await page.goto(albumUrl(seedData));
    await page.getByRole('button', { name: `Play ${seedData.track.title}` }).click();

    const seekSlider = page.getByRole('slider', { name: 'Seek' });
    await expect(seekSlider).toBeVisible();
    await expect(seekSlider).toHaveAttribute('aria-valuemin', '0');

    // Seek to 5 seconds; position must move away from 0
    await seekSlider.fill('5');
    await expect(seekSlider).not.toHaveAttribute('aria-valuenow', '0');
  });
});

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------

test.describe('Audio playback — queue', () => {
  test('"Play All" on the album page populates the queue and begins playback', async ({
    page,
    seedData,
  }) => {
    await page.goto(albumUrl(seedData));

    await page.getByRole('button', { name: 'Play All' }).click();

    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(playerBar).toContainText(seedData.track.title);
  });

  test('adding a track via "Add to queue" makes it appear in the queue panel', async ({
    page,
    seedData,
  }) => {
    await page.goto(albumUrl(seedData));

    // Start playing track 1 so the player bar is visible
    await page.getByRole('button', { name: `Play ${seedData.track.title}` }).click();
    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Add track 2 to the queue from the album track list
    await page.getByRole('button', { name: `Add ${seedData.track2.title} to queue` }).click();

    // Open the queue panel
    await playerBar.getByRole('button', { name: 'Open queue' }).click();

    // Panel should open and contain track 2
    const queuePanel = page.getByRole('dialog', { name: 'Playback queue' });
    await expect(queuePanel).toBeVisible();
    await expect(queuePanel).toContainText(seedData.track2.title);
  });

  test('dragging a queue item changes its position in the queue', async ({ page, seedData }) => {
    await page.goto(albumUrl(seedData));

    // Load both seed tracks via Play All
    await page.getByRole('button', { name: 'Play All' }).click();
    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Open the queue panel
    await playerBar.getByRole('button', { name: 'Open queue' }).click();
    const queuePanel = page.getByRole('dialog', { name: 'Playback queue' });
    await expect(queuePanel).toBeVisible();

    const queueList = page.locator('ol[aria-label="Queue tracks"]');
    const firstItem = queueList.locator('li').first();
    const secondItem = queueList.locator('li').nth(1);

    // Initial order: track 1, track 2
    await expect(firstItem).toContainText(seedData.track.title);
    await expect(secondItem).toContainText(seedData.track2.title);

    // Drag track 2 up to the first position
    await secondItem.dragTo(firstItem);

    // Order must be reversed after drag
    await expect(queueList.locator('li').first()).toContainText(seedData.track2.title);
    await expect(queueList.locator('li').nth(1)).toContainText(seedData.track.title);
  });

  test('track auto-advances to the next track in the queue when playback ends', async ({
    page,
    seedData,
  }) => {
    await page.goto(albumUrl(seedData));

    // Load both tracks via Play All — first track plays immediately
    await page.getByRole('button', { name: 'Play All' }).click();
    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar).toContainText(seedData.track.title);

    // The MinIO seed fixture uses minimal MP3s (< 1 s) so the onend callback
    // fires quickly. Allow up to 15 s for the auto-advance to happen.
    await expect(playerBar).toContainText(seedData.track2.title, { timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// YouTube embed
// ---------------------------------------------------------------------------

test.describe('Audio playback — YouTube embed', () => {
  test('track with a youtubeId shows a YouTube embed tab on the track detail page', async ({
    page,
    seedData,
  }) => {
    // Block the iframe network request — we only need to check the src attribute
    await page.route('**/*youtube*', (route) => route.abort());

    await page.goto(trackUrl(seedData));

    // Media toggle must show both Listen and Watch tabs
    const tabList = page.getByRole('tablist', { name: 'Media player options' });
    await expect(tabList).toBeVisible();

    const listenTab = page.getByRole('tab', { name: 'Listen' });
    const watchTab = page.getByRole('tab', { name: 'Watch' });
    await expect(listenTab).toBeVisible();
    await expect(watchTab).toBeVisible();

    // Listen is selected by default
    await expect(listenTab).toHaveAttribute('aria-selected', 'true');

    // Switch to Watch — panel must contain an iframe pointing at the seeded youtubeId
    await watchTab.click();
    await expect(watchTab).toHaveAttribute('aria-selected', 'true');

    const watchPanel = page.locator('#panel-watch');
    await expect(watchPanel).toBeVisible();
    await expect(watchPanel.locator('iframe')).toHaveAttribute(
      'src',
      new RegExp(seedData.track.youtubeId),
    );
  });

  test('switching to the YouTube tab pauses audio playback', async ({ page, seedData }) => {
    await page.route('**/*youtube*', (route) => route.abort());

    await page.goto(trackUrl(seedData));

    // Start audio from the track detail play button
    await page.getByRole('button', { name: `Play ${seedData.track.title}` }).click();

    const playerBar = page.getByRole('region', { name: 'Audio player' });
    await expect(playerBar.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Switch to Watch tab — audio must pause
    await page.getByRole('tab', { name: 'Watch' }).click();

    await expect(playerBar.getByRole('button', { name: 'Play' })).toBeVisible();
  });
});
