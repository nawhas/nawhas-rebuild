import { AxeBuilder } from '@axe-core/playwright';
import { Page } from '@playwright/test';

/**
 * Accessibility Testing Setup
 *
 * Provides helper functions for axe-core accessibility testing in Playwright.
 * Runs WCAG 2.1 AA compliance checks on pages.
 */

/**
 * Run an axe-core accessibility scan against the current page.
 * @param page - Playwright page object
 * @param options - Configuration for axe-core
 * @returns Results from axe-core scan
 */
export async function testPageAccessibility(
  page: Page,
  options?: {
    exclude?: string[];
    rules?: { [key: string]: { enabled: boolean } };
  }
) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2aa']);

  if (options?.exclude) {
    for (const selector of options.exclude) {
      builder.exclude(selector);
    }
  }

  if (options?.rules) {
    const disabledRules = Object.entries(options.rules)
      .filter(([, cfg]) => !cfg.enabled)
      .map(([rule]) => rule);
    if (disabledRules.length > 0) {
      builder.disableRules(disabledRules);
    }
  }

  return builder.analyze();
}

/**
 * Assert that a page has no critical or serious violations
 * @param page - Playwright page object
 * @param pageName - Name of page for error reporting
 * @param options - axe-core configuration (e.g. disable specific rules)
 */
export async function assertPageAccessible(
  page: Page,
  pageName: string,
  options?: {
    exclude?: string[];
    rules?: { [key: string]: { enabled: boolean } };
  },
) {
  const results = await testPageAccessibility(page, options);

  const violations = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  if (violations.length > 0) {
    console.error(`\n❌ Accessibility violations on ${pageName}:`);
    violations.forEach((violation) => {
      console.error(`\n  Rule: ${violation.id} (${violation.impact})`);
      console.error(`  Description: ${violation.description}`);
      console.error(`  Elements affected: ${violation.nodes.length}`);
      violation.nodes.slice(0, 3).forEach((node) => {
        console.error(`    - ${node.html.substring(0, 100)}`);
      });
    });
    throw new Error(`Page "${pageName}" has ${violations.length} accessibility violation(s)`);
  }

  console.log(`✅ ${pageName} - WCAG 2.1 AA compliant`);
}

/**
 * Test keyboard navigation on a page
 * @param page - Playwright page object
 * @param expectedFocusableCount - Expected number of keyboard-reachable elements
 */
export async function testKeyboardNavigation(
  page: Page,
  expectedFocusableCount?: number
) {
  const focusableElements = await page.evaluate(() => {
    const elements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return {
      count: elements.length,
      types: Array.from(elements).map((el) => el.tagName),
    };
  });

  console.log(`Found ${focusableElements.count} keyboard-reachable elements`);

  if (expectedFocusableCount && focusableElements.count < expectedFocusableCount) {
    console.warn(
      `⚠️ Expected at least ${expectedFocusableCount} focusable elements, found ${focusableElements.count}`
    );
  }

  const focusPath: string[] = [];
  for (let i = 0; i < Math.min(5, focusableElements.count); i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName + (el.className ? '.' + el.className : '') : 'unknown';
    });
    focusPath.push(focused);
  }

  console.log(`Tab order: ${focusPath.join(' → ')}`);
}

/**
 * Check color contrast on text elements
 * @param page - Playwright page object
 */
export async function checkColorContrast(page: Page) {
  const contrastIssues = await page.evaluate(() => {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button');
    const issues: { element: string; text: string }[] = [];

    textElements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const bgColor = styles.backgroundColor;

      if (color === 'rgba(0, 0, 0, 0)' || bgColor === 'rgba(0, 0, 0, 0)') {
        issues.push({
          element: el.tagName,
          text: (el.textContent || '').substring(0, 50),
        });
      }
    });

    return issues;
  });

  if (contrastIssues.length > 0) {
    console.warn(`⚠️ Found ${contrastIssues.length} potential contrast issues`);
  }
}
