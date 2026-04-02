# Accessibility Testing — Milestone 1

This directory contains Playwright tests for WCAG 2.1 AA accessibility compliance on Milestone 1 pages.

## Quick Start

### Run all accessibility tests
```bash
npm run test:a11y
```

### Run tests for a specific page
```bash
npx playwright test home.spec.ts
npx playwright test auth.spec.ts
npx playwright test reciters.spec.ts
```

### Run in headed mode (see the browser)
```bash
npx playwright test --headed
```

### Debug a single test
```bash
npx playwright test home.spec.ts --debug
```

## Test Structure

Each test file covers a major Milestone 1 page:
- `setup.ts` — Helper functions for accessibility testing
- `home.spec.ts` — Home / Discovery page
- `auth.spec.ts` — Login & Registration pages
- `reciters.spec.ts` — Reciters listing & profile pages
- `albums.spec.ts` — Albums listing & detail pages
- `tracks.spec.ts` — Track detail pages

## What Gets Tested

Every test checks:

1. **WCAG 2.1 AA Compliance** (axe-core)
   - Zero critical or serious violations
   - Proper ARIA usage
   - Semantic HTML structure
   - Color contrast (4.5:1 normal, 3:1 large text)

2. **Keyboard Navigation**
   - All interactive elements reachable via Tab
   - Logical tab order
   - Escape key closes modals
   - Arrow keys work in lists/dropdowns

3. **Focus Management**
   - Focus indicators always visible
   - Focus moves to opened modals
   - Focus returns to trigger after closing modal

4. **Semantic HTML**
   - Proper heading hierarchy (h1, h2, h3...)
   - Main landmark present
   - Nav landmarks for navigation
   - Lists use `<ul>` / `<ol>` / `<li>`

5. **Images & Media**
   - Images have meaningful alt text
   - Decorative images have `alt=""`
   - No images used for text

6. **Forms**
   - Inputs have associated labels
   - Error messages visible and announced
   - Required fields marked
   - Passwords not pre-filled

7. **Language & RTL**
   - lang attribute set on html element
   - Arabic content has lang="ar"
   - RTL content renders correctly
   - Noto Naskh Arabic font loaded

## Common Issues & Fixes

### "axe-core violation: missing alt text"
- Add descriptive alt text to images
- For decorative images, use `alt=""`

### "Focus indicator not visible"
- Ensure button/input has `focus:ring-2` or similar Tailwind class
- Check that focus styles aren't being removed with `focus:outline-none`

### "Contrast ratio 3.5:1, need 4.5:1"
- Use darker text color or lighter background
- See [TAILWIND_ACCESSIBILITY.md](../../TAILWIND_ACCESSIBILITY.md) for color pairings

### "Arabic text not reading correctly"
- Add `lang="ar"` attribute to Arabic content
- Ensure font-family is set to Noto Naskh Arabic
- Check that content is actually in Arabic, not romanized

### "Tab order is wrong"
- Verify tabindex is not overused
- Use native interactive elements (button, a, input) when possible
- Only use tabindex="0" if necessary; avoid tabindex > 0

## Adding Tests for New Pages

1. Create a new test file: `apps/web/src/tests/a11y/[page].spec.ts`
2. Import helpers from `setup.ts`
3. Add tests following this template:

```typescript
import { test } from '@playwright/test';
import { assertPageAccessible, testKeyboardNavigation } from './setup';

test.describe('[Page Name] Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path/to/page');
  });

  test('WCAG 2.1 AA compliance', async ({ page }) => {
    await assertPageAccessible(page, '[Page Name]');
  });

  test('keyboard navigation works', async ({ page }) => {
    await testKeyboardNavigation(page);
  });

  // Add page-specific tests here
});
```

4. Run the test to find violations
5. Fix violations in the component code
6. Re-run until all tests pass

## Tools

### axe DevTools Browser Extension
For manual testing during development:
1. Install [axe DevTools](https://www.deque.com/axe/devtools/)
2. Open DevTools (F12)
3. Go to "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review violations and fix

### WAVE Browser Extension
Complementary tool for visual feedback:
1. Install [WAVE](https://wave.webaim.org/extension/)
2. Click WAVE icon to see accessibility info
3. Useful for checking structure and contrast

### Color Contrast Checker
Test color combinations:
1. Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
2. Enter foreground and background colors
3. Check ratio meets WCAG AA (4.5:1 normal, 3:1 large)

## CI Integration

Accessibility tests run in GitHub Actions on every PR:
- See `.github/workflows/ci.yml` for config
- Tests must pass before merge
- Violations block the build

## Resources

- [ACCESSIBILITY.md](../../ACCESSIBILITY.md) — WCAG 2.1 AA checklist
- [TAILWIND_ACCESSIBILITY.md](../../TAILWIND_ACCESSIBILITY.md) — Tailwind CSS patterns
- [REACT_ACCESSIBILITY_PATTERNS.md](../../REACT_ACCESSIBILITY_PATTERNS.md) — Component examples
- [ACCESSIBILITY_INDEX.md](../../ACCESSIBILITY_INDEX.md) — Team integration guide

## Questions?

Tag `@accessibility-engineer` on your PR for review and sign-off.

All pages must pass these tests before Milestone 1 ships.
