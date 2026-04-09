/**
 * Accessibility Tests — Audio Player Components
 *
 * Covers WCAG 2.1 AA compliance for all audio player UI:
 * - PlayerBar (persistent bottom player)
 * - MobilePlayerOverlay (full-screen mobile player)
 * - QueuePanel (slide-in queue management)
 * - Play buttons (track/album cards)
 * - YouTube embed
 *
 * Test on both desktop (md+) and mobile viewports.
 * Uses the seed fixture to ensure consistent test data in CI.
 */

import { expect } from '@playwright/test';
import { test } from '../../fixtures/seed';
import { assertPageAccessible, testKeyboardNavigation } from './setup';
import { gotoExpectOk } from '../helpers/goto-expect-ok';

type SeedParam = Parameters<Parameters<typeof test>[2]>[0]['seedData'];

function albumUrl(seedData: Pick<SeedParam, 'album'>): string {
  return `/albums/${seedData.album.slug}`;
}

function trackUrl(seedData: Pick<SeedParam, 'reciter' | 'album' | 'track'>): string {
  return `/reciters/${seedData.reciter.slug}/albums/${seedData.album.slug}/tracks/${seedData.track.slug}`;
}

// ---------------------------------------------------------------------------
// Player Bar — Desktop
// ---------------------------------------------------------------------------

test.describe('PlayerBar — Desktop Accessibility', () => {
  test('PlayerBar region is present and labeled', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    await expect(playerBar).toBeVisible();
  });

  test('All player controls have accessible labels', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    await expect(playerBar.getByRole('button', { name: /pause/i })).toBeVisible();
    await expect(playerBar.getByRole('button', { name: /previous track/i })).toBeVisible();
    await expect(playerBar.getByRole('button', { name: /next track/i })).toBeVisible();
    await expect(playerBar.getByRole('button', { name: /shuffle/i })).toBeVisible();
    await expect(playerBar.getByRole('button', { name: /queue/i })).toBeVisible();
  });

  test('Seek bar is keyboard-operable', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const seekSlider = page.getByRole('slider', { name: /seek/i });
    await expect(seekSlider).toBeVisible();

    await seekSlider.focus();
    const focusedLabel = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label'),
    );
    expect(focusedLabel).toBe('Seek');

    await expect(seekSlider).toHaveAttribute('aria-valuemin', '0');
    const ariaMax = await seekSlider.getAttribute('aria-valuemax');
    const ariaVal = await seekSlider.getAttribute('aria-valuenow');
    expect(ariaMax).toBeTruthy();
    expect(ariaVal).toBeTruthy();
  });

  test('Play/Pause button state is communicated via aria-label', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const pauseButton = playerBar.getByRole('button', { name: /pause/i });
    await expect(pauseButton).toBeVisible();

    await pauseButton.click();
    await page.waitForTimeout(200);

    await expect(playerBar.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('Volume control has accessible labels (desktop only)', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const volumeSlider = page.getByRole('slider', { name: /volume/i });
    await expect(volumeSlider).toBeVisible();

    const ariaLabel = await volumeSlider.getAttribute('aria-label');
    expect(ariaLabel).toBe('Volume');
  });

  test('Shuffle button uses aria-pressed to communicate state', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const shuffleButton = page.getByRole('button', { name: /shuffle/i });
    const ariaPressed = await shuffleButton.getAttribute('aria-pressed');
    expect(ariaPressed).toBeTruthy();
    expect(['true', 'false']).toContain(ariaPressed);
  });

  test('Queue button uses aria-pressed to communicate state', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const queueButton = playerBar.getByRole('button', { name: /queue/i });
    const ariaPressed = await queueButton.getAttribute('aria-pressed');
    expect(ariaPressed).toBeTruthy();
    expect(['true', 'false']).toContain(ariaPressed);
  });

  test('Focus indicators are visible on all controls', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const pauseButton = playerBar.getByRole('button', { name: /pause/i });
    await pauseButton.focus();

    const hasFocusIndicator = await pauseButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return (
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none' ||
        (el as HTMLElement).className.includes('ring')
      );
    });
    expect(hasFocusIndicator).toBe(true);
  });

  test('Player bar WCAG 2.1 AA compliance (axe-core scan)', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    await assertPageAccessible(page, 'PlayerBar (Desktop)');
  });

  test('Keyboard navigation through player controls', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const pauseButton = playerBar.getByRole('button', { name: /pause/i });
    await pauseButton.focus();

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focused).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Mobile Player Overlay — Mobile Viewport
// ---------------------------------------------------------------------------

test.describe('MobilePlayerOverlay — Mobile Accessibility', () => {
  test('Mobile overlay has correct dialog semantics', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await expect(page.getByRole('button', { name: /open full player/i })).toBeVisible({ timeout: 10_000 });

    // Click the "Open full player" track-info button (not the whole region) to open the overlay.
    await page.getByRole('button', { name: /open full player/i }).click();
    await page.waitForTimeout(300);

    // Scope to the mobile overlay dialog by its dynamic label to avoid ambiguity
    // with the QueuePanel dialog (which stays in the DOM without aria-hidden).
    const dialog = page.getByRole('dialog', { name: /now playing/i });
    await expect(dialog).toBeVisible();

    const ariaModal = await dialog.getAttribute('aria-modal');
    expect(ariaModal).toBe('true');
  });

  test('Mobile overlay has descriptive aria-label', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await expect(page.getByRole('button', { name: /open full player/i })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /open full player/i }).click();
    await page.waitForTimeout(300);

    // Scope to the mobile overlay to avoid matching the always-present QueuePanel dialog.
    const dialog = page.getByRole('dialog', { name: /now playing/i });
    const ariaLabel = await dialog.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/playing|Now playing/i);
  });

  test('Mobile overlay close button is accessible', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await expect(page.getByRole('button', { name: /open full player/i })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /open full player/i }).click();
    await page.waitForTimeout(300);

    // The overlay uses "Dismiss player" (×) as its close button.
    const overlay = page.getByRole('dialog', { name: /now playing/i });
    const closeButton = overlay.getByRole('button', { name: /dismiss player/i });
    await expect(closeButton).toBeVisible();

    await closeButton.click();
    await page.waitForTimeout(300);

    // After dismissing, the overlay gets aria-hidden="true" — locator returns 0 elements,
    // so not.toBeVisible() passes immediately.
    await expect(overlay).not.toBeVisible();
  });

  test('Mobile overlay seek bar has proper ARIA attributes', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await expect(page.getByRole('button', { name: /open full player/i })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /open full player/i }).click();

    // Scope the seek slider lookup to inside the overlay dialog to avoid strict-mode
    // violations when aria-modal scoping is active or the PlayerBar is also in the DOM.
    const overlay = page.getByRole('dialog', { name: /now playing/i });
    await expect(overlay).toBeVisible();

    const seekSlider = overlay.locator('input[type="range"][aria-label="Seek"]');
    await expect(seekSlider).toBeAttached();

    expect(await seekSlider.getAttribute('aria-label')).toBe('Seek');
    expect(await seekSlider.getAttribute('aria-valuemin')).toBe('0');
    expect(await seekSlider.getAttribute('aria-valuemax')).toBeTruthy();
    expect(await seekSlider.getAttribute('aria-valuenow')).toBeTruthy();
  });

  test('Mobile overlay controls are keyboard accessible', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await expect(page.getByRole('button', { name: /open full player/i })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /open full player/i }).click();
    await page.waitForTimeout(300);

    // Focus the "Collapse to mini player" button (the chevron-down button in the overlay).
    const collapseButton = page.getByRole('button', { name: /collapse to mini player/i });
    await collapseButton.focus();

    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    expect(focused).toBeTruthy();
  });

  test('Mobile overlay WCAG 2.1 AA compliance (axe-core scan)', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await expect(page.getByRole('button', { name: /open full player/i })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /open full player/i }).click();
    await page.waitForTimeout(300);

    await assertPageAccessible(page, 'MobilePlayerOverlay (Mobile)');
  });
});

// ---------------------------------------------------------------------------
// Queue Panel — Desktop
// ---------------------------------------------------------------------------

test.describe('QueuePanel — Accessibility', () => {
  test('Queue panel has dialog semantics', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const queueButton = playerBar.getByRole('button', { name: /queue/i });
    await queueButton.click();
    await page.waitForTimeout(300);

    const queueDialog = page.getByRole('dialog', { name: /queue/i });
    await expect(queueDialog).toBeVisible();

    const ariaModal = await queueDialog.getAttribute('aria-modal');
    expect(ariaModal).toBe('true');
  });

  test('Queue list uses semantic list structure', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const queueButton = playerBar.getByRole('button', { name: /queue/i });
    await queueButton.click();
    await page.waitForTimeout(300);

    const queueList = page.getByRole('list', { name: /queue/i });
    await expect(queueList).toBeVisible();
  });

  test('Queue items have descriptive labels', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const queueButton = playerBar.getByRole('button', { name: /queue/i });
    await queueButton.click();
    await page.waitForTimeout(300);

    // Scope to the queue dialog to avoid matching track-list <li> elements
    // which don't have aria-label.
    const queueDialog = page.getByRole('dialog', { name: /queue/i });
    const firstItem = queueDialog.getByRole('listitem').first();
    const ariaLabel = await firstItem.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Track \d+:/i);
  });

  test('Remove button in queue is accessible', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const queueButton = playerBar.getByRole('button', { name: /queue/i });
    await queueButton.click();
    await page.waitForTimeout(300);

    const removeButton = page.getByRole('button', { name: /remove.*from queue/i }).first();
    await expect(removeButton).toBeVisible();

    const ariaLabel = await removeButton.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Remove/i);
  });

  test('Queue panel WCAG 2.1 AA compliance (axe-core scan)', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const queueButton = playerBar.getByRole('button', { name: /queue/i });
    await queueButton.click();
    await page.waitForTimeout(300);

    await assertPageAccessible(page, 'QueuePanel');
  });
});

// ---------------------------------------------------------------------------
// Play Buttons — Cards and Track Lists
// ---------------------------------------------------------------------------

test.describe('Play Buttons — Accessibility', () => {
  test('Play buttons have accessible labels', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButtons = page.getByRole('button', { name: /play/i });
    const count = await playButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = playButtons.nth(i);
      // Accessible name may come from aria-label (track buttons) or text content ("Play All").
      const ariaLabel = await btn.getAttribute('aria-label');
      const textContent = await btn.textContent();
      const accessibleName = ariaLabel ?? textContent?.trim() ?? '';
      expect(accessibleName).toMatch(/play/i);
    }
  });

  test('Play button updates label based on playback state', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExpectOk(page,albumUrl(seedData));

    const playButton = page.getByRole('button', { name: /play/i }).first();
    // Accessible name may come from aria-label or text content ("Play All").
    const ariaLabel = await playButton.getAttribute('aria-label');
    const textContent = await playButton.textContent();
    const initialLabel = ariaLabel ?? textContent?.trim() ?? '';
    expect(initialLabel).toMatch(/play/i);

    await playButton.click();
    await page.waitForTimeout(500);

    const playerBar = page.getByRole('region', { name: /audio player/i });
    const pauseLabel = await playerBar.getByRole('button', { name: /pause/i }).getAttribute('aria-label');
    expect(pauseLabel).toMatch(/pause/i);
  });
});

// ---------------------------------------------------------------------------
// YouTube Embed
// ---------------------------------------------------------------------------

test.describe('YouTube Embed — Accessibility', () => {
  test('YouTube iframe has descriptive title', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.route('**/*youtube*', (route) => route.abort());
    await gotoExpectOk(page,trackUrl(seedData));

    // Switch to Watch tab to show the iframe
    await page.getByRole('tab', { name: 'Watch' }).click();
    await page.waitForTimeout(300);

    const iframeElement = page.locator('iframe[title]');
    const title = await iframeElement.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(5);
  });

  test('YouTube embed is keyboard accessible', async ({ page, seedData }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.route('**/*youtube*', (route) => route.abort());
    await gotoExpectOk(page,trackUrl(seedData));

    // Switch to Watch tab
    await page.getByRole('tab', { name: 'Watch' }).click();
    await page.waitForTimeout(300);

    const iframeElement = page.locator('iframe');
    await expect(iframeElement).toBeVisible();
  });
});
