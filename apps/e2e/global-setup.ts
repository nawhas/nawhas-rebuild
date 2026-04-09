/**
 * Global setup — waits for the web server to be ready.
 *
 * In Docker mode the webServer config is disabled (the server is managed by
 * docker compose), so we poll the base URL ourselves until it responds.
 * Without this, the first 1-2 tests would fail with ERR_CONNECTION_REFUSED
 * on a cold docker compose start.
 */
import { chromium } from '@playwright/test';

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const MAX_WAIT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

export default async function globalSetup(): Promise<void> {
  if (process.env['DOCKER'] !== 'true') return;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await page.goto(BASE_URL, { timeout: 5_000 });
      if (response && response.status() < 400) {
        await browser.close();
        return;
      }
    } catch {
      // Server not ready yet — keep polling
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  await browser.close();
  throw new Error(`Web server at ${BASE_URL} did not become ready within ${MAX_WAIT_MS}ms`);
}
