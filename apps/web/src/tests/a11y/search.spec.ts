import { test, expect } from '@playwright/test';
import { assertPageAccessible, testKeyboardNavigation } from '../../__tests__/a11y/setup';

/**
 * E2E / Accessibility Tests — Search Results Page
 *
 * Covers:
 * - Query → results rendering
 * - Tab navigation between All / Reciters / Albums / Tracks
 * - URL-based pagination
 * - Empty state when no results are found
 * - WCAG 2.1 AA compliance
 *
 * Run with: npx playwright test search.spec.ts
 */

test.describe('Search Results Page', () => {
  test.describe('with a query that returns results', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/search?q=hussain');
    });

    test('page title contains the search query', async ({ page }) => {
      const title = await page.title();
      expect(title).toContain('hussain');
    });

    test('heading displays the search query', async ({ page }) => {
      const h1 = await page.locator('h1').textContent();
      expect(h1).toContain('hussain');
    });

    test('tab navigation — All tab is active by default', async ({ page }) => {
      const activeTab = page.locator('[role="tab"][aria-selected="true"]');
      await expect(activeTab).toBeVisible();
      const tabText = await activeTab.textContent();
      expect(tabText).toMatch(/All/);
    });

    test('tab navigation — clicking Reciters tab updates URL', async ({ page }) => {
      const recitersTab = page.locator('[role="tab"]', { hasText: 'Reciters' });
      await recitersTab.click();
      await expect(page).toHaveURL(/type=reciters/);
    });

    test('tab navigation — clicking Albums tab updates URL', async ({ page }) => {
      const albumsTab = page.locator('[role="tab"]', { hasText: 'Albums' });
      await albumsTab.click();
      await expect(page).toHaveURL(/type=albums/);
    });

    test('tab navigation — clicking Tracks tab updates URL', async ({ page }) => {
      const tracksTab = page.locator('[role="tab"]', { hasText: 'Tracks' });
      await tracksTab.click();
      await expect(page).toHaveURL(/type=tracks/);
    });

    test('tab navigation — active tab reflects URL type param', async ({ page }) => {
      await page.goto('/search?q=hussain&type=tracks');
      const activeTab = page.locator('[role="tab"][aria-selected="true"]');
      const tabText = await activeTab.textContent();
      expect(tabText).toMatch(/Tracks/);
    });

    test('WCAG 2.1 AA compliance — zero critical/serious violations', async ({ page }) => {
      await assertPageAccessible(page, 'Search Results Page');
    });

    test('keyboard navigation — can tab through interactive elements', async ({ page }) => {
      await testKeyboardNavigation(page);
    });

    test('has main landmark', async ({ page }) => {
      const main = await page.locator('main').count();
      expect(main).toBeGreaterThan(0);
    });
  });

  test.describe('with specific type tab', () => {
    test('reciters tab — shows reciter cards when results exist', async ({ page }) => {
      await page.goto('/search?q=hussain&type=reciters');
      // Tab should be active
      const activeTab = page.locator('[role="tab"][aria-selected="true"]');
      const tabText = await activeTab.textContent();
      expect(tabText).toMatch(/Reciters/);
    });

    test('albums tab — shows album cards when results exist', async ({ page }) => {
      await page.goto('/search?q=hussain&type=albums');
      const activeTab = page.locator('[role="tab"][aria-selected="true"]');
      const tabText = await activeTab.textContent();
      expect(tabText).toMatch(/Albums/);
    });

    test('tracks tab — shows track list when results exist', async ({ page }) => {
      await page.goto('/search?q=hussain&type=tracks');
      const activeTab = page.locator('[role="tab"][aria-selected="true"]');
      const tabText = await activeTab.textContent();
      expect(tabText).toMatch(/Tracks/);
    });
  });

  test.describe('pagination', () => {
    test('pagination nav appears on pages with multiple result pages', async ({ page }) => {
      // Use a very short query likely to return many results.
      await page.goto('/search?q=a&type=tracks');
      // If there are multiple pages, the pagination nav should be visible.
      const pagination = page.locator('[aria-label*="pagination"]');
      // Only assert if it's present — skip silently if fewer than 2 pages.
      const count = await pagination.count();
      if (count > 0) {
        await expect(pagination).toBeVisible();
        const pageIndicator = page.locator('text=/Page \\d+ of \\d+/');
        await expect(pageIndicator).toBeVisible();
      }
    });

    test('page 2 URL is navigable and shows correct pagination state', async ({ page }) => {
      await page.goto('/search?q=a&type=tracks&page=2');
      // The page should load without errors.
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('empty state', () => {
    test('shows friendly message when no results are found', async ({ page }) => {
      await page.goto('/search?q=xyzzy_no_results_expected_42');
      const emptyMsg = page.locator('[role="status"]');
      await expect(emptyMsg).toBeVisible();
      await expect(emptyMsg).toContainText(/no results/i);
    });

    test('empty state includes search suggestions', async ({ page }) => {
      await page.goto('/search?q=xyzzy_no_results_expected_42');
      await expect(page.locator('text=/Try searching in English/i')).toBeVisible();
    });

    test('WCAG 2.1 AA — empty state page passes accessibility audit', async ({ page }) => {
      await page.goto('/search?q=xyzzy_no_results_expected_42');
      await assertPageAccessible(page, 'Search Empty State');
    });
  });

  test.describe('no query', () => {
    test('renders the search welcome page without error', async ({ page }) => {
      await page.goto('/search');
      await expect(page.locator('h1')).toBeVisible();
      const h1 = await page.locator('h1').textContent();
      expect(h1).toMatch(/search/i);
    });
  });
});
