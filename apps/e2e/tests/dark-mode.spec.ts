/**
 * E2E Tests — Dark Mode
 *
 * Validates dark mode behaviour: the next-themes ThemeProvider applies
 * the active theme as `data-theme` on <html> (Phase A switched from
 * the legacy `class="dark"` strategy at commit a23d051; the POC token
 * system in apps/web/app/globals.css gates dark-mode overrides on
 * `[data-theme="dark"]`).
 *
 * The provider is configured with `enableSystem={false}` and
 * `defaultTheme="dark"`, so:
 *   - first-visit users land in dark mode
 *   - the OS `prefers-color-scheme` is intentionally NOT honoured
 *   - the toggle persists the choice in localStorage under the
 *     default next-themes key ("theme")
 *
 * Requires:
 *   - web service running at BASE_URL
 *   - next-themes ThemeProvider in the root layout
 *   - ThemeToggle component accessible in the navigation header
 */

import { test, expect } from '@playwright/test';
import { gotoExpectOk } from './helpers/goto-expect-ok';

// ---------------------------------------------------------------------------
// Test 1: Default theme on first visit
// ---------------------------------------------------------------------------

test.describe('Dark mode — default on first visit', () => {
  test('html gets data-theme="dark" by default (enableSystem=false, defaultTheme=dark)', async ({ page }) => {
    await gotoExpectOk(page, '/');

    // next-themes applies the data-theme attribute to <html> via an inline
    // blocking script, so it is present as soon as the page is ready.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Verify the page renders with a dark background — not white with invisible text.
    const bodyBg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor,
    );
    expect(bodyBg).not.toBe('rgb(255, 255, 255)');
  });
});

// ---------------------------------------------------------------------------
// Tests 2–4: Manual ThemeToggle
// ---------------------------------------------------------------------------

// Helper: seed localStorage with light theme and reload so next-themes
// initialises with that value. Using page.evaluate() (not addInitScript)
// ensures the seed does NOT fire again on subsequent reloads within the test.
async function seedLightTheme(page: import('@playwright/test').Page): Promise<void> {
  await gotoExpectOk(page, '/');
  await page.evaluate(() => localStorage.setItem('theme', 'light'));
  await page.reload();
}

test.describe('Dark mode — manual toggle', () => {
  test('clicking toggle switches to dark mode', async ({ page }) => {
    await seedLightTheme(page);

    // Starts in light mode — data-theme reflects "light".
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // The ThemeToggle aria-label reflects the current mode (e.g. "Switch to dark mode").
    const toggle = page.getByRole('button', { name: /switch to/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('dark mode preference persists across page reload', async ({ page }) => {
    await seedLightTheme(page);

    const toggle = page.getByRole('button', { name: /switch to/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();

    // next-themes persists the choice in localStorage under the key "theme".
    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedTheme).toBe('dark');

    // Attribute must be restored immediately after reload (via inline blocking script).
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('clicking toggle again restores light mode', async ({ page }) => {
    await seedLightTheme(page);

    const toggle = page.getByRole('button', { name: /switch to/i });
    await expect(toggle).toBeVisible();

    // Switch to dark.
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Switch back — provider runs with enableSystem=false, so the cycle is
    // strictly light/dark and the html element returns to data-theme="light".
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
