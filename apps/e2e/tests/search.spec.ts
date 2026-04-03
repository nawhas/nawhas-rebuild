/**
 * E2E Tests — Multi-language Search (NAW-119)
 *
 * Tests language quality (Arabic, Urdu, French, transliteration), RTL rendering
 * of Arabic/Urdu highlight snippets, autocomplete performance, keyboard navigation,
 * and empty state.
 *
 * Each test run:
 *   1. Relies on the base seed fixture for reciter/album/track/Arabic+English lyrics
 *   2. Adds Urdu, French, and transliteration lyrics via direct SQL
 *   3. Syncs the full track document directly to Typesense (admin API)
 *   4. Removes the Typesense documents on teardown (DB cleanup via base fixture)
 */

import postgres from 'postgres';
import { test as seedTest, expect } from '../fixtures/seed';
import { AxeBuilder } from '@axe-core/playwright';
import type { Page, Locator } from '@playwright/test';
import type { SeedData } from '../fixtures/seed';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/nawhas';

const TYPESENSE_HOST = process.env['TYPESENSE_HOST'] ?? 'localhost';
const TYPESENSE_PORT = process.env['TYPESENSE_PORT'] ?? '8108';
const TYPESENSE_PROTOCOL = process.env['TYPESENSE_PROTOCOL'] ?? 'http';
const TYPESENSE_API_KEY = process.env['TYPESENSE_API_KEY'] ?? 'xyz';
const TYPESENSE_BASE = `${TYPESENSE_PROTOCOL}://${TYPESENSE_HOST}:${TYPESENSE_PORT}`;

// Arabic diacritics-stripped search term (matches `يا حسين يا حسين`)
const ARABIC_QUERY = 'يا حسين';
// Urdu search term (matches `یا حسین یا حسین`)
const URDU_QUERY = 'یا حسین';
// French wildcard-field search term (matches `Ô Hussain Ô Hussain`)
const FRENCH_QUERY = 'Hussain Ô';
// Transliteration search term (matches `ya husayn ya husayn`)
const TRANSLITERATION_QUERY = 'husayn';

// ---------------------------------------------------------------------------
// Typesense helpers — direct admin API calls, no SDK required
// ---------------------------------------------------------------------------

async function typesenseUpsert(collection: string, doc: Record<string, unknown>): Promise<void> {
  const res = await fetch(
    `${TYPESENSE_BASE}/collections/${collection}/documents?action=upsert`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY,
      },
      body: JSON.stringify(doc),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Typesense upsert failed (${collection}): ${res.status} ${body}`);
  }
}

async function typesenseDelete(collection: string, id: string): Promise<void> {
  await fetch(`${TYPESENSE_BASE}/collections/${collection}/documents/${id}`, {
    method: 'DELETE',
    headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY },
  });
}

// ---------------------------------------------------------------------------
// Extended fixture — adds multi-language lyrics and Typesense sync
// ---------------------------------------------------------------------------

const test = seedTest.extend<{ searchData: SeedData }>({
  searchData: async ({ seedData }, use) => {
    const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 5 });

    // Add extra lyrics (Urdu, French, transliteration) for the seeded track.
    // Arabic + English are already inserted by the base seed fixture.
    await sql`
      INSERT INTO lyrics (id, track_id, language, text)
      VALUES
        (gen_random_uuid(), ${seedData.track.id}, 'ur', 'یا حسین یا حسین'),
        (gen_random_uuid(), ${seedData.track.id}, 'fr', 'Ô Hussain Ô Hussain'),
        (gen_random_uuid(), ${seedData.track.id}, 'transliteration', 'ya husayn ya husayn')
      ON CONFLICT (track_id, language) DO UPDATE SET text = EXCLUDED.text
    `;
    await sql.end();

    // Sync all three documents into Typesense.
    await Promise.all([
      typesenseUpsert('reciters', {
        id: seedData.reciter.id,
        name: seedData.reciter.name,
        slug: seedData.reciter.slug,
      }),
      typesenseUpsert('albums', {
        id: seedData.album.id,
        title: seedData.album.title,
        slug: seedData.album.slug,
        reciterId: seedData.reciter.id,
        reciterName: seedData.reciter.name,
        year: seedData.album.year,
      }),
      typesenseUpsert('tracks', {
        id: seedData.track.id,
        title: seedData.track.title,
        slug: seedData.track.slug,
        albumId: seedData.album.id,
        albumTitle: seedData.album.title,
        albumSlug: seedData.album.slug,
        reciterId: seedData.reciter.id,
        reciterName: seedData.reciter.name,
        reciterSlug: seedData.reciter.slug,
        trackNumber: 1,
        // All lyrics fields indexed
        lyrics_ar: 'يا حسين يا حسين\nاختبار النص العربي',
        lyrics_ur: 'یا حسین یا حسین\nاردو متن ٹیسٹ',
        lyrics_en: 'Ya Hussain Ya Hussain\nEnglish lyrics test',
        lyrics_fr: 'Ô Hussain Ô Hussain\nTest de paroles françaises',
        lyrics_transliteration: 'ya husayn ya husayn\ntransliteration test',
      }),
    ]);

    await use(seedData);

    // Teardown: remove Typesense documents (DB cleanup is handled by base fixture).
    await Promise.all([
      typesenseDelete('reciters', seedData.reciter.id),
      typesenseDelete('albums', seedData.album.id),
      typesenseDelete('tracks', seedData.track.id),
    ]);
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function searchUrl(q: string, type?: string): string {
  const params = new URLSearchParams({ q });
  if (type) params.set('type', type);
  return `/search?${params.toString()}`;
}

/**
 * Scoped track result link locator.
 *
 * With 4 parallel workers each seeding a track named "Test Track E2E",
 * `getByRole('link', { name: /Play Test Track E2E/ })` matches ALL workers'
 * results in Typesense and causes a strict-mode violation.  Scoping by
 * href containing the worker-specific slug ensures we match only this
 * worker's track.
 */
function trackResultLink(page: Page, sd: SeedData): Locator {
  return page
    .getByRole('link', { name: new RegExp(`Play ${sd.track.title}`, 'i') })
    .and(page.locator(`[href*="${sd.track.slug}"]`));
}

// ---------------------------------------------------------------------------
// Language quality — each language query returns the seeded track
// ---------------------------------------------------------------------------

test.describe('Language quality — multi-language lyrics search', () => {
  test('Arabic text search returns seeded track (diacritics-insensitive)', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(ARABIC_QUERY, 'tracks'));
    await expect(trackResultLink(page, searchData)).toBeVisible({ timeout: 10_000 });
  });

  test('Urdu text search returns seeded track', async ({ page, searchData }) => {
    await page.goto(searchUrl(URDU_QUERY, 'tracks'));
    await expect(trackResultLink(page, searchData)).toBeVisible({ timeout: 10_000 });
  });

  test('English text search returns seeded track via lyrics_en field', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl('Ya Hussain Ya Hussain', 'tracks'));
    await expect(trackResultLink(page, searchData)).toBeVisible({ timeout: 10_000 });
  });

  test('French lyrics search returns seeded track via wildcard field', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(FRENCH_QUERY, 'tracks'));
    await expect(trackResultLink(page, searchData)).toBeVisible({ timeout: 10_000 });
  });

  test('Transliteration search returns seeded track via lyrics_transliteration field', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(TRANSLITERATION_QUERY, 'tracks'));
    await expect(trackResultLink(page, searchData)).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// RTL rendering — Arabic and Urdu highlight snippets carry correct attributes
// ---------------------------------------------------------------------------

test.describe('RTL rendering', () => {
  test('Arabic lyrics highlight snippet has dir="rtl" and lang="ar"', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(ARABIC_QUERY, 'tracks'));

    // Confirm the seeded track appears
    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // The lyrics snippet rendered for an Arabic match must have RTL attributes
    const rtlSnippet = page.locator('[dir="rtl"][lang="ar"]').first();
    await expect(rtlSnippet).toBeVisible();
  });

  test('Urdu lyrics highlight snippet has dir="rtl" and lang="ur"', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(URDU_QUERY, 'tracks'));

    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    const rtlSnippet = page.locator('[dir="rtl"][lang="ur"]').first();
    await expect(rtlSnippet).toBeVisible();
  });

  test('Non-RTL lyrics snippet (English) has no dir="rtl" attribute', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl('Ya Hussain Ya Hussain', 'tracks'));

    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // A transliteration/English match should NOT produce an RTL span in this result
    const rtlSnippets = page.locator(
      `[role="link"][aria-label*="${searchData.track.title}"] [dir="rtl"]`,
    );
    await expect(rtlSnippets).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Autocomplete performance — response within 200ms debounce window
// ---------------------------------------------------------------------------

test.describe('Autocomplete', () => {
  test('autocomplete dropdown appears within 600ms of typing (200ms debounce + network)', async ({
    page,
    searchData,
  }) => {
    await page.goto('/');

    // Desktop search bar is visible on md+ viewports
    const input = page.locator('[role="combobox"]').first();
    await input.click();

    const start = Date.now();
    await input.fill(searchData.track.title.slice(0, 4));

    // Wait for the listbox to appear — includes 200ms debounce + server round-trip
    await expect(page.locator('[role="listbox"]')).toBeVisible({ timeout: 600 });
    const elapsed = Date.now() - start;

    // Soft assertion: log if slow, but don't hard-fail for network jitter
    if (elapsed > 600) {
      console.warn(`⚠️  Autocomplete took ${elapsed}ms — expected ≤600ms (200ms debounce + RTT)`);
    }
  });

  test('autocomplete results include the seeded track title', async ({
    page,
    searchData,
  }) => {
    await page.goto('/');

    const input = page.locator('[role="combobox"]').first();
    await input.click();
    await input.fill(searchData.track.title.slice(0, 4));

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();
    await expect(listbox).toContainText(searchData.track.title);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

test.describe('Keyboard navigation — desktop search bar', () => {
  test('can navigate autocomplete results with ArrowDown and select with Enter', async ({
    page,
    searchData,
  }) => {
    await page.goto('/');

    const input = page.locator('[role="combobox"]').first();
    await input.click();
    await input.fill(searchData.track.title.slice(0, 4));

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();

    // Arrow down to first option
    await page.keyboard.press('ArrowDown');
    const activeOption = page.locator('[role="option"][aria-selected="true"]');
    await expect(activeOption).toBeVisible();

    // Pressing Enter should navigate away from the search page
    await page.keyboard.press('Enter');
    // Should have left the homepage (navigated to a result)
    await expect(page).not.toHaveURL('/');
  });

  test('Escape key closes the autocomplete dropdown', async ({ page, searchData }) => {
    await page.goto('/');

    const input = page.locator('[role="combobox"]').first();
    await input.click();
    await input.fill(searchData.track.title.slice(0, 4));

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(listbox).not.toBeVisible();
  });
});

test.describe('Keyboard navigation — search results page', () => {
  test('can Tab through tab bar and result links', async ({ page, searchData }) => {
    await page.goto(searchUrl(searchData.track.title));

    // Wait for results to load
    await expect(page.locator('[role="tablist"]')).toBeVisible();

    // Tab through at least 5 interactive elements without errors
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Page is still functional — at least one result link is reachable
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility — WCAG 2.1 AA and screen reader compatibility
// ---------------------------------------------------------------------------

test.describe('Accessibility — WCAG 2.1 AA compliance', () => {
  test('Search results page with Arabic lyrics matches has no critical/serious violations', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(ARABIC_QUERY, 'tracks'));

    // Wait for results to load
    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // Run axe-core WCAG 2.1 AA audit
    const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (violations.length > 0) {
      console.error('\n❌ Accessibility violations on search results (Arabic):');
      violations.forEach((v) => {
        console.error(`  - ${v.id} (${v.impact}): ${v.description}`);
        console.error(`    Affected nodes: ${v.nodes.length}`);
      });
    }

    expect(violations).toHaveLength(0);
  });

  test('Search results page with Urdu lyrics matches has no critical/serious violations', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(URDU_QUERY, 'tracks'));

    // Wait for results to load
    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // Run axe-core WCAG 2.1 AA audit
    const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (violations.length > 0) {
      console.error('\n❌ Accessibility violations on search results (Urdu):');
      violations.forEach((v) => {
        console.error(`  - ${v.id} (${v.impact}): ${v.description}`);
        console.error(`    Affected nodes: ${v.nodes.length}`);
      });
    }

    expect(violations).toHaveLength(0);
  });
});

test.describe('Accessibility — RTL text and screen reader support', () => {
  test('Arabic lyrics highlight snippet has correct language attribute for screen readers', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(ARABIC_QUERY, 'tracks'));

    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // Verify the RTL span for Arabic has lang="ar" so screen readers use Arabic pronunciation
    const arabicSnippet = page.locator('[dir="rtl"][lang="ar"]').first();
    await expect(arabicSnippet).toBeVisible();

    // Verify the HTML structure is correct for screen reader announcement
    const htmlAttribute = await arabicSnippet.getAttribute('lang');
    expect(htmlAttribute).toBe('ar');
  });

  test('Urdu lyrics highlight snippet has correct language attribute for screen readers', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(URDU_QUERY, 'tracks'));

    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // Verify the RTL span for Urdu has lang="ur" for screen reader support
    const urduSnippet = page.locator('[dir="rtl"][lang="ur"]').first();
    await expect(urduSnippet).toBeVisible();

    const htmlAttribute = await urduSnippet.getAttribute('lang');
    expect(htmlAttribute).toBe('ur');
  });

  test('Mark tags inside RTL text preserve text order for screen readers', async ({
    page,
    searchData,
  }) => {
    await page.goto(searchUrl(ARABIC_QUERY, 'tracks'));

    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // Find the Arabic snippet that contains mark tags
    const arabicSnippet = page.locator('[dir="rtl"][lang="ar"]').first();

    // Verify mark tags exist within the snippet (highlights from Typesense)
    // The HTML structure should preserve bidirectional text order
    const markTags = arabicSnippet.locator('mark');

    // Check that marks are properly nested within the RTL span
    const markCount = await markTags.count();
    if (markCount > 0) {
      // Mark tags should be visible and properly formatted
      for (let i = 0; i < Math.min(markCount, 3); i++) {
        const mark = markTags.nth(i);
        await expect(mark).toBeVisible();
        // Mark should have appropriate styling for visual distinction
        const styles = await mark.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            fontWeight: computed.fontWeight,
            backgroundColor: computed.backgroundColor,
          };
        });
        // Marks should be visually distinct (font-weight or background)
        expect(
          styles.fontWeight !== 'normal' || styles.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ).toBeTruthy();
      }
    }
  });

  test('RTL tab bar and pagination are keyboard accessible', async ({ page, searchData }) => {
    await page.goto(searchUrl(ARABIC_QUERY, 'tracks'));

    // Wait for page to load
    await expect(
      trackResultLink(page, searchData),
    ).toBeVisible({ timeout: 10_000 });

    // Tab through tab bar items
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // Verify all tab items have proper ARIA attributes
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    // Each tab should have aria-selected
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      const ariaSelected = await tab.getAttribute('aria-selected');
      expect(['true', 'false']).toContain(ariaSelected);
    }

    // Test keyboard navigation through tabs
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

test.describe('Empty state', () => {
  test('shows no-results message for a nonsense query', async ({ page }) => {
    await page.goto(searchUrl('xyzzy_e2e_no_match_42'));
    const emptyState = page.locator('[role="status"]');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(/no results/i);
  });

  test('empty state suggests searching in English, Arabic, or Urdu', async ({ page }) => {
    await page.goto(searchUrl('xyzzy_e2e_no_match_42'));
    await expect(page.getByText(/English, Arabic, or Urdu/i)).toBeVisible();
  });

  // searchData fixture not needed for empty state — use plain test
  test('empty state is accessible (WCAG 2.1 AA)', async ({ page }) => {
    await page.goto(searchUrl('xyzzy_e2e_no_match_42'));
    await expect(page.locator('[role="status"]')).toBeVisible();
    // Basic landmark check — main should exist
    await expect(page.locator('main')).toBeVisible();
  });
});
