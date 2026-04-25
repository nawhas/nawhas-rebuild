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

export const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3100';
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
  /**
   * Public username (better-auth `additionalFields.username`, required at
   * signup as of W3 Phase G). Optional in this fixture: when omitted we
   * derive a value from the email-local-part (sanitised + lowercased) so
   * older tests that don't care about /contributor/[username] keep working.
   */
  username?: string;
}

/**
 * Derive a username candidate from an email-local-part. Only used inside the
 * E2E helper when callers don't supply `user.username`. Mirrors the logic of
 * apps/web/scripts/backfill-usernames.ts so test usernames look "real".
 */
function deriveUsername(email: string): string {
  const local = email.split('@')[0] ?? 'user';
  const sanitised = local
    .replace(/[^a-z0-9_]/gi, '_')
    .slice(0, 32)
    .toLowerCase();
  return sanitised.length >= 3 ? sanitised : `e2e_${Date.now().toString(36)}`;
}

/**
 * Registers a new user via the Better Auth sign-up endpoint, then verifies
 * their email address by polling Mailpit and following the verification link.
 *
 * If `user.username` is provided we use it verbatim (callers who care about
 * the public /contributor/[username] route should set it explicitly). When
 * omitted we derive one from the email so the better-auth `username`
 * additional-field requirement is satisfied without changing every caller.
 */
export async function registerAndVerify(user: TestUser): Promise<void> {
  const username = user.username ?? deriveUsername(user.email);
  const registerRes = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
      username,
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

/**
 * Withdraw the named user's pending access-request directly in the
 * database. Mirrors the `accessRequests.withdrawMine` server action.
 *
 * Used in E2E tests where the contributor-side withdraw button's onClick
 * is unreliable under dev-mode Turbopack hydration.
 */
export async function withdrawAccessRequestForUser(email: string): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql`
      UPDATE access_requests
      SET status = 'withdrawn', withdrawn_at = now(), updated_at = now()
      WHERE user_id = (SELECT id FROM "user" WHERE email = ${email})
        AND status = 'pending'
    `;
  } finally {
    await sql.end();
  }
}

/**
 * Approve an access-request directly in the database. Mirrors the
 * `accessRequests.review` server action: sets status to 'approved' and
 * promotes the applicant's role to 'contributor', all in one transaction.
 *
 * Used in E2E tests where the moderator UI (review-actions onClick) is
 * unreliable under dev-mode Turbopack hydration.
 */
export async function approveAccessRequestForUser(email: string): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql.begin(async (tx) => {
      const [user] = await tx<Array<{ id: string }>>`
        SELECT id FROM "user" WHERE email = ${email} LIMIT 1
      `;
      if (!user) throw new Error(`No user found with email ${email}`);
      await tx`
        UPDATE access_requests
        SET status = 'approved', reviewed_at = now(), updated_at = now()
        WHERE user_id = ${user.id} AND status = 'pending'
      `;
      await tx`UPDATE "user" SET role = 'contributor', "updatedAt" = now() WHERE id = ${user.id}`;
    });
  } finally {
    await sql.end();
  }
}

/**
 * Update a submission's status directly in the database. Used in W3 E2E
 * tests to set up a 'changes_requested' state without driving the
 * moderator's review-action UI (whose onClick fails to fire under
 * dev-mode Turbopack hydration in the local Docker stack).
 */
export async function setSubmissionStatus(
  submissionId: string,
  status:
    | 'draft'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'withdrawn'
    | 'applied',
): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql`
      UPDATE submissions
      SET status = ${status}, updated_at = now()
      WHERE id = ${submissionId}
    `;
  } finally {
    await sql.end();
  }
}

/**
 * Insert a `submission_reviews` row tied to a specific moderator and
 * submission. Combined with `setSubmissionStatus('changes_requested')`,
 * this seeds the backing data for the contributor-side
 * <ChangesRequestedBanner> assertions.
 */
export async function insertSubmissionReview(opts: {
  submissionId: string;
  reviewerEmail: string;
  action: 'changes_requested' | 'rejected' | 'approved';
  comment: string | null;
}): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const reviewerId = await getUserIdByEmail(opts.reviewerEmail);
    await sql`
      INSERT INTO submission_reviews (
        submission_id, reviewer_user_id, action, comment
      )
      VALUES (
        ${opts.submissionId}::uuid, ${reviewerId}, ${opts.action}, ${opts.comment}
      )
    `;
  } finally {
    await sql.end();
  }
}

/**
 * Poll the database until the named user's access-request reaches the
 * given status. Useful when a moderator UI action (Approve / Reject) might
 * race the test's next assertion.
 */
export async function waitForAccessRequestStatus(
  email: string,
  status: 'approved' | 'rejected' | 'withdrawn',
  timeoutMs = 15_000,
): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const rows = await sql<Array<{ status: string }>>`
        SELECT ar.status FROM access_requests ar
        JOIN "user" u ON u.id = ar.user_id
        WHERE u.email = ${email}
        ORDER BY ar.created_at DESC
        LIMIT 1
      `;
      if (rows[0]?.status === status) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(
      `Access request for <${email}> did not reach status='${status}' within ${timeoutMs}ms`,
    );
  } finally {
    await sql.end();
  }
}

/**
 * Poll the database until the named user's role flips to the given value.
 * Useful after approving an access-request — the role update happens in the
 * same transaction, so this resolves quickly once the moderator action lands.
 */
export async function waitForUserRole(
  email: string,
  role: 'user' | 'contributor' | 'moderator',
  timeoutMs = 15_000,
): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const rows = await sql<Array<{ role: string }>>`
        SELECT role FROM "user" WHERE email = ${email} LIMIT 1
      `;
      if (rows[0]?.role === role) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(
      `User <${email}> did not reach role='${role}' within ${timeoutMs}ms`,
    );
  } finally {
    await sql.end();
  }
}

/**
 * Insert an access-request row directly into the database.
 *
 * Why bypass the form? In dev mode (Next.js + Turbopack) the apply-form's
 * client component can fail to hydrate within reasonable test timeouts —
 * a button click then falls through to native HTML form submission and
 * the server action never runs. Inserting via the DB driver gives the
 * tests a deterministic baseline for moderator-flow and withdrawal
 * assertions.
 */
export async function createPendingAccessRequest(
  email: string,
  reason: string | null = null,
): Promise<string> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const userId = await getUserIdByEmail(email);
    const [row] = await sql<Array<{ id: string }>>`
      INSERT INTO access_requests (user_id, reason, status)
      VALUES (${userId}, ${reason}, 'pending')
      RETURNING id
    `;
    if (!row) throw new Error('Failed to insert access request');
    return row.id;
  } finally {
    await sql.end();
  }
}

/**
 * Insert a pending reciter-create submission directly into the database.
 *
 * See `createPendingAccessRequest` for the rationale (dev-mode form
 * hydration is unreliable; tests need a deterministic submission to
 * exercise withdrawal / moderator-review surfaces).
 */
export async function createPendingReciterSubmission(
  email: string,
  reciterName: string,
): Promise<string> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const userId = await getUserIdByEmail(email);
    const data = { name: reciterName };
    const [row] = await sql<Array<{ id: string }>>`
      INSERT INTO submissions (
        type, action, target_id, data, status, submitted_by_user_id
      )
      VALUES (
        'reciter', 'create', NULL, ${JSON.stringify(data)}::jsonb,
        'pending', ${userId}
      )
      RETURNING id
    `;
    if (!row) throw new Error('Failed to insert submission');
    return row.id;
  } finally {
    await sql.end();
  }
}

/**
 * Fetches the most recent submission ID for a given submitter email. Useful
 * for E2E tests that submit via the form but only land on /dashboard, where
 * the per-submission UUID is not directly exposed in the URL.
 *
 * Throws if no submission is found within `timeoutMs`.
 */
export async function getLatestSubmissionIdForEmail(
  email: string,
  timeoutMs = 10_000,
): Promise<string> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const rows = await sql<Array<{ id: string }>>`
        SELECT s.id FROM submissions s
        JOIN "user" u ON u.id = s.submitted_by_user_id
        WHERE u.email = ${email}
        ORDER BY s.created_at DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (row) return row.id;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`No submission found for <${email}> within ${timeoutMs}ms`);
  } finally {
    await sql.end();
  }
}

/** Fetches a user's database ID by their email address. */
export async function getUserIdByEmail(email: string): Promise<string> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    const rows = await sql<Array<{ id: string }>>`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`;
    const row = rows[0];
    if (!row) throw new Error(`No user found with email: ${email}`);
    return row.id;
  } finally {
    await sql.end();
  }
}

/** Inserts a raw audit_log entry directly into the database. */
export async function insertAuditLogEntry(entry: {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql`
      INSERT INTO audit_log (actor_user_id, action, target_type, target_id, meta)
      VALUES (
        ${entry.actorUserId},
        ${entry.action},
        ${entry.targetType ?? null},
        ${entry.targetId ?? null},
        ${entry.meta ? JSON.stringify(entry.meta) : null}
      )
    `;
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
 * Authenticates a Playwright page as the given user.
 *
 * Note (W3 E2E): in dev mode the form-driven `signIn.email()` call from
 * better-auth's React client can stall under Turbopack HMR — the request
 * never leaves the browser, so the page would sit on /login forever. We
 * therefore call the sign-in API directly (POST /api/auth/sign-in/email)
 * and copy the returned Set-Cookie into the Playwright BrowserContext.
 * That is functionally equivalent for Better Auth (sessions are
 * cookie-backed) and avoids any client-bundle flakiness.
 *
 * Specs that need to assert on the /login form's UI behaviour (e.g. error
 * toasts on invalid credentials) should drive the form themselves rather
 * than rely on this helper.
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Sign-in failed (${res.status}): ${await res.text()}`);
  }
  // Node 18+ exposes getSetCookie() that returns each Set-Cookie header
  // separately; fall back to the comma-joined `get('set-cookie')` for older
  // runtimes (parseSetCookies handles both).
  const setCookieHeaders =
    typeof (res.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie === 'function'
      ? (res.headers as Headers & { getSetCookie: () => string[] })
          .getSetCookie()
      : ([res.headers.get('set-cookie') ?? ''].filter(Boolean) as string[]);
  if (setCookieHeaders.length === 0) {
    throw new Error('Sign-in succeeded but no Set-Cookie header was returned');
  }
  const baseUrl = new URL(BASE_URL);
  const cookies = setCookieHeaders
    .flatMap((h) => parseSetCookies(h))
    .map((c) => ({
      ...c,
      domain: baseUrl.hostname,
      path: c.path ?? '/',
    }));
  await page.context().addCookies(cookies);
  // Hit the home page so subsequent navigations see the new session cookie
  // and the layout renders the authenticated header.
  await page.goto('/');
}

/**
 * Minimal Set-Cookie parser sufficient for better-auth's cookies. Splits the
 * combined header (which may contain multiple comma-joined cookies, but here
 * we receive them already split) and extracts name/value/path/expires fields.
 */
function parseSetCookies(header: string): Array<{
  name: string;
  value: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
}> {
  // Split on commas that are followed by a `key=` pattern. better-auth typically
  // returns each Set-Cookie as a separate header entry, but when multiple are
  // joined with commas Node merges them. Use a permissive split.
  const parts = header.split(/,(?=\s*[A-Za-z0-9_!#$%&'*+\-.^`|~]+=)/);
  const out: ReturnType<typeof parseSetCookies> = [];
  for (const raw of parts) {
    const segments = raw.split(';').map((s) => s.trim());
    const first = segments.shift();
    if (!first) continue;
    const eq = first.indexOf('=');
    if (eq < 0) continue;
    const cookie: ReturnType<typeof parseSetCookies>[number] = {
      name: first.slice(0, eq),
      value: first.slice(eq + 1),
    };
    for (const seg of segments) {
      const [k, v] = seg.split('=');
      if (!k) continue;
      const lower = k.toLowerCase();
      if (lower === 'path') cookie.path = v ?? '/';
      else if (lower === 'expires' && v) cookie.expires = Math.floor(new Date(v).getTime() / 1000);
      else if (lower === 'httponly') cookie.httpOnly = true;
      else if (lower === 'secure') cookie.secure = true;
      else if (lower === 'samesite' && v) cookie.sameSite = v as 'Lax' | 'Strict' | 'None';
    }
    out.push(cookie);
  }
  return out;
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
