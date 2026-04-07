/**
 * Shared setup helpers for M6 Community Contributions & Moderation E2E tests.
 *
 * Provides:
 *  - registerAndVerify  — creates + email-verifies a user via the auth API + Mailpit
 *  - setRole            — promotes/demotes a user's role directly in the DB
 *  - deleteUsers        — bulk-deletes test users from the DB (cleanup)
 *  - signIn             — logs a page in via the /login form
 *  - pollForEmailWithSubject — waits for a Mailpit message matching a subject pattern
 *
 * Uses native fetch() so callers can be worker-scoped (where Playwright's
 * request fixture is unavailable).
 */

import type { Page } from '@playwright/test';
import postgres from 'postgres';

export const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
export const MAILPIT_URL = process.env['MAILPIT_URL'] ?? 'http://mailpit:8025';
const _dbUrl = process.env['DATABASE_URL'];
if (!_dbUrl) {
  throw new Error('DATABASE_URL must be set in the E2E test environment (e.g. via docker-compose or a .env.e2e file)');
}
export const DATABASE_URL: string = _dbUrl;

// ---------------------------------------------------------------------------
// User registration + email verification
// ---------------------------------------------------------------------------

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Registers a new user via the Better Auth sign-up endpoint, then verifies
 * their email address by polling Mailpit and following the verification link.
 */
export async function registerAndVerify(user: TestUser): Promise<void> {
  const registerRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
    }),
  });
  if (!registerRes.ok) {
    throw new Error(`Registration failed (${registerRes.status}): ${await registerRes.text()}`);
  }

  const message = await pollMailpitForRecipient(user.email, 30_000);
  const verificationUrl = extractVerificationUrl(
    (await fetchMailpitMessageBody(message.ID)).html,
  );

  // Follow the verification link server-side so we don't need a browser.
  const { pathname, search } = new URL(verificationUrl);
  await fetch(`${BASE_URL}${pathname}${search}`, { headers: { Origin: BASE_URL } });
}

// ---------------------------------------------------------------------------
// Role management
// ---------------------------------------------------------------------------

/** Sets the role column for a user directly in the database. */
export async function setRole(
  email: string,
  role: 'user' | 'contributor' | 'moderator',
): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql`UPDATE "user" SET role = ${role} WHERE email = ${email}`;
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Database cleanup
// ---------------------------------------------------------------------------

/** Deletes all test users matching the given email addresses from the DB. */
export async function deleteUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql.begin(async (tx) => {
      // Delete in dependency order to satisfy ON DELETE RESTRICT constraints.
      // audit_log.actor_user_id and submission_reviews.reviewer_user_id both
      // reference users with RESTRICT, so they must be removed first.
      await tx`
        DELETE FROM audit_log
        WHERE actor_user_id IN (
          SELECT id FROM "user" WHERE email = ANY(${emails})
        )
      `;
      await tx`
        DELETE FROM submission_reviews
        WHERE reviewer_user_id IN (
          SELECT id FROM "user" WHERE email = ANY(${emails})
        )
      `;
      // submissions.submitted_by_user_id is also RESTRICT; deleting submissions
      // cascades to any remaining submission_reviews rows via ON DELETE CASCADE.
      await tx`
        DELETE FROM submissions
        WHERE submitted_by_user_id IN (
          SELECT id FROM "user" WHERE email = ANY(${emails})
        )
      `;
      // sessions and accounts cascade automatically (ON DELETE CASCADE).
      await tx`DELETE FROM "user" WHERE email = ANY(${emails})`;
    });
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Browser sign-in helper
// ---------------------------------------------------------------------------

/**
 * Navigates to /login, fills the email + password fields, and waits for the
 * auth POST response to complete before returning.
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/sign-in') && res.request().method() === 'POST',
    { timeout: 20_000 },
  );
  await page.click('button[type="submit"]');
  await responsePromise;
}

// ---------------------------------------------------------------------------
// Mailpit helpers
// ---------------------------------------------------------------------------

interface MailpitMessage {
  ID: string;
  To: Array<{ Address: string }>;
  Subject: string;
}

/** Polls Mailpit until an email is found for `to`, or throws on timeout. */
async function pollMailpitForRecipient(to: string, timeoutMs: number): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    const data = (await res.json()) as { messages?: MailpitMessage[] };
    const match = data.messages?.find((m) => m.To.some((r) => r.Address === to));
    if (match) return match;
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`No email found for <${to}> within ${timeoutMs}ms`);
}

/**
 * Polls Mailpit until an email whose subject matches `subjectPattern` is
 * found for `to`, or throws on timeout.
 */
export async function pollForEmailWithSubject(
  to: string,
  subjectPattern: RegExp,
  timeoutMs = 20_000,
): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    const data = (await res.json()) as { messages?: MailpitMessage[] };
    const match = data.messages?.find(
      (m) => m.To.some((r) => r.Address === to) && subjectPattern.test(m.Subject),
    );
    if (match) return match;
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(
    `No email matching /${subjectPattern.source}/ found for <${to}> within ${timeoutMs}ms`,
  );
}

/** Fetches a Mailpit message body and returns both text and HTML. */
async function fetchMailpitMessageBody(
  messageId: string,
): Promise<{ html: string; text: string }> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const data = (await res.json()) as { HTML?: string; Text?: string };
  return { html: data.HTML ?? '', text: data.Text ?? '' };
}

/** Extracts the Better Auth verification URL from an email body. */
function extractVerificationUrl(body: string): string {
  const match = body.match(
    /https?:\/\/[^\s"'<>]*\/api\/auth\/verify-email[^\s"'<>]*/i,
  );
  if (!match) throw new Error('Verification URL not found in email body');
  return match[0];
}
