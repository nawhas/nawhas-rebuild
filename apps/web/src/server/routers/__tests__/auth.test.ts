// @vitest-environment node
/**
 * Integration tests for Better Auth flows (register, login, email verification, password reset).
 *
 * Strategy:
 * - Runs against a real Postgres instance (nawhas_test DB, localhost:5432).
 * - Creates a test-local betterAuth instance so email callbacks are captured
 *   in-memory instead of going through SMTP.
 * - Verification tokens (email verif) are JWT-based and never stored in the DB.
 *   Password-reset tokens ARE stored in the `verification` table.
 * - afterAll cleans up all users created by this suite (sessions/accounts cascade).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray, like } from 'drizzle-orm';
import { betterAuth, APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { users, sessions, accounts, verificationTokens } from '@nawhas/db';
import { createTestDb, isDbAvailable, type TestDb } from './helpers';

// ─── Unique suffix to avoid collisions across parallel test runs ─────────────
const SUFFIX = Date.now();

function makeEmail(label: string) {
  return `nawhas-auth-test-${label}-${SUFFIX}@example.com`;
}

// ─── Shared state captured by email callbacks ─────────────────────────────────
let capturedVerificationToken = '';
let capturedResetUrl = '';

// ─── Track all created user IDs for afterAll cleanup ─────────────────────────
const createdUserIds: string[] = [];

// ─── Database and auth instance ──────────────────────────────────────────────
let db: TestDb;
let close: () => Promise<void>;
let auth: ReturnType<typeof createTestAuth>;

function createTestAuth(testDb: TestDb) {
  return betterAuth({
    secret: 'nawhas-test-secret-must-be-at-least-32-chars-long',
    baseURL: 'http://localhost:3000',
    database: drizzleAdapter(testDb as Parameters<typeof drizzleAdapter>[0], {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verificationTokens,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async (data) => {
        capturedResetUrl = data.url;
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async (data) => {
        capturedVerificationToken = data.token;
      },
    },
    advanced: {
      disableCSRFCheck: true,
    },
    logger: { level: 'error' },
  });
}

beforeAll(async function (this: { skip: () => void }) {
  if (!await isDbAvailable()) {
    return this.skip();
  }
  ({ db, close } = createTestDb());
  auth = createTestAuth(db);
});

afterAll(async () => {
  if (!close) return;
  if (createdUserIds.length > 0) {
    // Sessions and accounts cascade-delete when user is deleted.
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
  // Also wipe any leftover verification tokens (password-reset entries).
  await db
    .delete(verificationTokens)
    .where(like(verificationTokens.identifier, `reset-password:%`));
  await close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────────────────────
describe('auth: registration', () => {
  it('successfully creates a user with valid email + password', async () => {
    const email = makeEmail('reg-valid');
    const result = await auth.api.signUpEmail({
      body: { name: 'Test User', email, password: 'StrongPass1!' },
    });

    expect(result).toBeDefined();
    expect(result.user.email).toBe(email);

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row).toBeDefined();
    createdUserIds.push(row!.id);
  });

  it('creates user with emailVerified = false', async () => {
    const email = makeEmail('reg-unverified');
    await auth.api.signUpEmail({
      body: { name: 'Unverified User', email, password: 'StrongPass1!' },
    });

    const [row] = await db.select().from(users).where(eq(users.email, email));
    expect(row).toBeDefined();
    expect(row!.emailVerified).toBe(false);
    createdUserIds.push(row!.id);
  });

  it('does not create a new DB row for duplicate email (returns synthetic response)', async () => {
    const email = makeEmail('reg-dup');

    // First registration
    await auth.api.signUpEmail({
      body: { name: 'Original User', email, password: 'StrongPass1!' },
    });
    const [row1] = await db.select().from(users).where(eq(users.email, email));
    expect(row1).toBeDefined();
    createdUserIds.push(row1!.id);

    const countBefore = (await db.select().from(users).where(eq(users.email, email))).length;

    // Second registration with same email — Better Auth returns a synthetic
    // response (email enumeration protection) when requireEmailVerification: true.
    const result2 = await auth.api.signUpEmail({
      body: { name: 'Duplicate User', email, password: 'AnotherPass2!' },
    });

    // Response shape is returned (no error thrown), but token is null.
    expect(result2).toBeDefined();
    expect(result2.token).toBeNull();

    // No new user was inserted.
    const countAfter = (await db.select().from(users).where(eq(users.email, email))).length;
    expect(countAfter).toBe(countBefore);
  });

  it('rejects a password that is too short (< 8 chars)', async () => {
    const email = makeEmail('reg-short-pw');
    await expect(
      auth.api.signUpEmail({
        body: { name: 'Short Password', email, password: 'abc' },
      }),
    ).rejects.toBeInstanceOf(APIError);
  });

  it('rejects an empty password', async () => {
    const email = makeEmail('reg-empty-pw');
    // Empty password fails zod schema validation before reaching the APIError layer.
    await expect(
      auth.api.signUpEmail({
        body: { name: 'No Password', email, password: '' },
      }),
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────
describe('auth: login', () => {
  const LOGIN_EMAIL = makeEmail('login');
  const LOGIN_PASSWORD = 'LoginPass99!';
  let loginUserId = '';

  beforeAll(async () => {
    // Register
    capturedVerificationToken = '';
    await auth.api.signUpEmail({
      body: { name: 'Login Test User', email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    });

    const [row] = await db.select().from(users).where(eq(users.email, LOGIN_EMAIL));
    loginUserId = row!.id;
    createdUserIds.push(loginUserId);

    // Verify email so the user can log in
    const token = capturedVerificationToken;
    expect(token).toBeTruthy();
    await auth.api.verifyEmail({ query: { token } });
  });

  it('successfully logs in with correct credentials and returns a session token', async () => {
    const result = await auth.api.signInEmail({
      body: { email: LOGIN_EMAIL, password: LOGIN_PASSWORD },
    });

    expect(result).toBeDefined();
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe(LOGIN_EMAIL);
  });

  it('rejects login with incorrect password', async () => {
    const err = await auth.api
      .signInEmail({ body: { email: LOGIN_EMAIL, password: 'WrongPassword!' } })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).status).toBe('UNAUTHORIZED');
  });

  it('rejects login with non-existent email', async () => {
    const err = await auth.api
      .signInEmail({ body: { email: 'nobody@example.com', password: 'SomePass1!' } })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).status).toBe('UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Email Verification
// ─────────────────────────────────────────────────────────────────────────────
describe('auth: email verification', () => {
  const VERIFY_EMAIL = makeEmail('verify');
  const VERIFY_PASSWORD = 'VerifyPass1!';
  let verifyUserId = '';

  beforeAll(async () => {
    capturedVerificationToken = '';
    await auth.api.signUpEmail({
      body: { name: 'Verify Test User', email: VERIFY_EMAIL, password: VERIFY_PASSWORD },
    });

    const [row] = await db.select().from(users).where(eq(users.email, VERIFY_EMAIL));
    verifyUserId = row!.id;
    createdUserIds.push(verifyUserId);
  });

  it('email verification token is non-empty after registration', () => {
    expect(capturedVerificationToken).toBeTruthy();
  });

  it('user starts with emailVerified = false', async () => {
    const [row] = await db.select().from(users).where(eq(users.id, verifyUserId));
    expect(row!.emailVerified).toBe(false);
  });

  it('login is rejected for unverified user', async () => {
    const err = await auth.api
      .signInEmail({ body: { email: VERIFY_EMAIL, password: VERIFY_PASSWORD } })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).status).toBe('FORBIDDEN');
  });

  it('calling verifyEmail with valid token sets emailVerified = true', async () => {
    const token = capturedVerificationToken;
    await auth.api.verifyEmail({ query: { token } });

    const [row] = await db.select().from(users).where(eq(users.id, verifyUserId));
    expect(row!.emailVerified).toBe(true);
  });

  it('calling verifyEmail with an invalid/expired token throws an error', async () => {
    const err = await auth.api
      .verifyEmail({ query: { token: 'completely.invalid.token' } })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(APIError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Password Reset
// ─────────────────────────────────────────────────────────────────────────────
describe('auth: password reset', () => {
  const RESET_EMAIL = makeEmail('reset');
  const ORIGINAL_PASSWORD = 'OriginalPass1!';
  const NEW_PASSWORD = 'NewPassword99!';
  let resetUserId = '';

  beforeAll(async () => {
    // Register and verify the user so they can log in.
    capturedVerificationToken = '';
    await auth.api.signUpEmail({
      body: { name: 'Reset Test User', email: RESET_EMAIL, password: ORIGINAL_PASSWORD },
    });

    const [row] = await db.select().from(users).where(eq(users.email, RESET_EMAIL));
    resetUserId = row!.id;
    createdUserIds.push(resetUserId);

    const verifyToken = capturedVerificationToken;
    await auth.api.verifyEmail({ query: { token: verifyToken } });
  });

  it('requesting a password reset creates a verification token in the DB', async () => {
    capturedResetUrl = '';

    await auth.api.requestPasswordReset({
      body: { email: RESET_EMAIL, redirectTo: 'http://localhost:3000/reset-password' },
    });

    // Token is stored in verification table with identifier "reset-password:<token>"
    const rows = await db
      .select()
      .from(verificationTokens)
      .where(like(verificationTokens.identifier, 'reset-password:%'));

    expect(rows.length).toBeGreaterThan(0);
    expect(capturedResetUrl).toBeTruthy();
  });

  it('requesting a password reset for a non-existent email does not throw (no user leakage)', async () => {
    await expect(
      auth.api.requestPasswordReset({
        body: {
          email: 'nonexistent@example.com',
          redirectTo: 'http://localhost:3000/reset-password',
        },
      }),
    ).resolves.toBeDefined();
  });

  it('resetting password with a valid token succeeds and allows login with new password', async () => {
    // The reset URL looks like: http://localhost:3000/reset-password/<token>?callbackURL=...
    expect(capturedResetUrl).toBeTruthy();
    const resetToken = new URL(capturedResetUrl).pathname.split('/').pop()!;
    expect(resetToken).toBeTruthy();

    await auth.api.resetPassword({
      body: { newPassword: NEW_PASSWORD, token: resetToken },
    });

    // Login with new password should succeed.
    const result = await auth.api.signInEmail({
      body: { email: RESET_EMAIL, password: NEW_PASSWORD },
    });
    expect(result.token).toBeTruthy();
  });

  it('old password no longer works after password reset', async () => {
    const err = await auth.api
      .signInEmail({ body: { email: RESET_EMAIL, password: ORIGINAL_PASSWORD } })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(APIError);
    expect((err as APIError).status).toBe('UNAUTHORIZED');
  });
});
