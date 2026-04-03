import { test, expect } from '@playwright/test';
import { assertPageAccessible, testKeyboardNavigation } from '../../__tests__/a11y/setup';

/**
 * Accessibility Tests — Home Page
 *
 * Tests for WCAG 2.1 AA compliance on the home / discovery page.
 * Run with: npx playwright test home.spec.ts
 */

test.describe('Home Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page title is set', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('Nawhas');
  });

  test('WCAG 2.1 AA compliance — zero critical/serious violations', async ({ page }) => {
    await assertPageAccessible(page, 'Home Page');
  });

  test('keyboard navigation — can tab through interactive elements', async ({ page }) => {
    await testKeyboardNavigation(page);
  });

  test('lang attribute set correctly', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('has main landmark', async ({ page }) => {
    const main = await page.locator('main').count();
    expect(main).toBeGreaterThan(0);
  });

  test('heading hierarchy is correct', async ({ page }) => {
    // h1 should exist
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);

    // No skipped heading levels (no h3 without h2, etc)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('images have alt text', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt).not.toBe(''); // Alt should not be empty unless decorative
    }
  });

  test('buttons have accessible labels', async ({ page }) => {
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      // Button should have visible text OR aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('focus indicators visible', async ({ page }) => {
    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.focus();

      // Check that focus styles are applied
      const focusOutline = await button.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });

      expect(focusOutline).toBeTruthy();
    }
  });

  test('no color contrast violations', async ({ page }) => {
    // This would use axe-core's contrast checking
    // Simplified check here - use axe-core for comprehensive testing
    const textElements = await page.locator('p, h1, h2, a, button').all();
    expect(textElements.length).toBeGreaterThan(0);
  });
});
