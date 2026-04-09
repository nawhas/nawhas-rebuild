import { test, expect } from '@playwright/test';
import { assertPageAccessible, testKeyboardNavigation } from './setup';
import { gotoExpectOk } from '../helpers/goto-expect-ok';

/**
 * Accessibility Tests — Authentication Pages
 *
 * Tests for WCAG 2.1 AA compliance on login and register pages.
 * Run with: npx playwright test auth.spec.ts
 */

test.describe('Login Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await gotoExpectOk(page, '/login');
  });

  test('page title is set', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('Sign in');
  });

  test('WCAG 2.1 AA compliance — zero critical/serious violations', async ({ page }) => {
    await assertPageAccessible(page, 'Login Page');
  });

  test('keyboard navigation — can tab through interactive elements', async ({ page }) => {
    await testKeyboardNavigation(page);
  });

  test('lang attribute set correctly', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('form has accessible structure', async ({ page }) => {
    const form = await page.locator('form').count();
    expect(form).toBeGreaterThan(0);
  });

  test('email input has associated label', async ({ page }) => {
    const label = await page.locator('label:has-text("Email")').count();
    expect(label).toBeGreaterThan(0);

    const input = await page.locator('input[type="email"]').count();
    expect(input).toBeGreaterThan(0);
  });

  test('password input has associated label', async ({ page }) => {
    const label = await page.locator('label:has-text("Password")').count();
    expect(label).toBeGreaterThan(0);

    const input = await page.locator('input[type="password"]').count();
    expect(input).toBeGreaterThan(0);
  });

  test('submit button has accessible text', async ({ page }) => {
    const button = await page.locator('button[type="submit"]').first();
    const text = await button.textContent();
    expect(text).toContain('Sign in');
  });

  test('inputs have proper autocomplete attributes', async ({ page }) => {
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();

    const emailAutoComplete = await emailInput.getAttribute('autocomplete');
    const passwordAutoComplete = await passwordInput.getAttribute('autocomplete');

    expect(emailAutoComplete).toBe('email');
    expect(passwordAutoComplete).toBe('current-password');
  });

  test('form inputs have focus indicators', async ({ page }) => {
    const emailInput = await page.locator('input[type="email"]').first();
    await emailInput.focus();

    // Check that focus styles are applied
    const focusOutline = await emailInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });

    expect(focusOutline).toBeTruthy();
  });

  test('register link is accessible', async ({ page }) => {
    const link = await page.locator('a:has-text("Register")').first();
    expect(link).toBeTruthy();

    const href = await link.getAttribute('href');
    expect(href).toContain('/register');
  });
});

test.describe('Register Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await gotoExpectOk(page, '/register');
  });

  test('page title is set', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('Create account');
  });

  test('WCAG 2.1 AA compliance — zero critical/serious violations', async ({ page }) => {
    await assertPageAccessible(page, 'Register Page');
  });

  test('keyboard navigation — can tab through interactive elements', async ({ page }) => {
    await testKeyboardNavigation(page);
  });

  test('form has all required fields', async ({ page }) => {
    const nameInput = await page.locator('input[type="text"]').first();
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();

    expect(nameInput).toBeTruthy();
    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
  });

  test('all form fields have associated labels', async ({ page }) => {
    const nameLabel = await page.locator('label:has-text("Name")').count();
    const emailLabel = await page.locator('label:has-text("Email")').count();
    const passwordLabel = await page.locator('label:has-text("Password")').count();

    expect(nameLabel).toBeGreaterThan(0);
    expect(emailLabel).toBeGreaterThan(0);
    expect(passwordLabel).toBeGreaterThan(0);
  });

  test('name input has proper autocomplete', async ({ page }) => {
    const nameInput = await page.locator('input[type="text"]').first();
    const autoComplete = await nameInput.getAttribute('autocomplete');
    expect(autoComplete).toBe('name');
  });

  test('password input uses new-password autocomplete', async ({ page }) => {
    const passwordInput = await page.locator('input[type="password"]').first();
    const autoComplete = await passwordInput.getAttribute('autocomplete');
    expect(autoComplete).toBe('new-password');
  });

  test('submit button has accessible text', async ({ page }) => {
    const button = await page.locator('button[type="submit"]').first();
    const text = await button.textContent();
    expect(text).toContain('Create account');
  });

  test('login link is accessible', async ({ page }) => {
    const link = await page.locator('a:has-text("Sign in")').first();
    expect(link).toBeTruthy();

    const href = await link.getAttribute('href');
    expect(href).toContain('/login');
  });
});
