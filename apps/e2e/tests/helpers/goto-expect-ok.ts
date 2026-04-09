import { expect, type Page } from '@playwright/test';

export type GotoExpectOkOptions = {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  /** When set, status must be one of these (e.g. `[404]` for Next.js `notFound()`). Otherwise status must be < 400. */
  allowedStatuses?: readonly number[];
};

/**
 * Navigate and assert the document response is not a client or server error.
 * Surfaces 4xx/5xx immediately instead of timing out on a missing locator.
 */
export async function gotoExpectOk(
  page: Page,
  path: string,
  options?: GotoExpectOkOptions,
): Promise<void> {
  const response = await page.goto(path, {
    waitUntil: options?.waitUntil ?? 'domcontentloaded',
  });
  expect(response, `Expected a response for ${path}`).not.toBeNull();
  const status = response!.status();
  if (options?.allowedStatuses !== undefined && options.allowedStatuses.length > 0) {
    expect(
      [...options.allowedStatuses],
      `Navigation to ${path} must return an allowed status (got HTTP ${status})`,
    ).toContain(status);
  } else {
    expect(status, `Navigation to ${path} must be OK (got HTTP ${status})`).toBeLessThan(400);
  }
}

/** Navigate to a route that should render Next.js not-found (HTTP 404). */
export async function gotoExpectNotFound(
  page: Page,
  path: string,
  options?: Omit<GotoExpectOkOptions, 'allowedStatuses'>,
): Promise<void> {
  await gotoExpectOk(page, path, { ...options, allowedStatuses: [404] });
}
