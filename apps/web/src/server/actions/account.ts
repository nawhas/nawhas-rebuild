'use server';

import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import {
  logHandledServerActionError,
  logUnauthenticatedServerAction,
} from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';

const createCaller = createCallerFactory(appRouter);

async function getAuthenticatedCaller() {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) return null;
  return createCaller({ db, session: sessionData.session, user: sessionData.user });
}

/**
 * Server action: change the authenticated user's email address.
 * Better Auth sends a verification email; the change only takes effect after
 * the user clicks the verification link.
 *
 * Returns an error string on failure, or null on success.
 */
export async function changeEmail(newEmail: string): Promise<string | null> {
  try {
    const caller = await getAuthenticatedCaller();
    if (!caller) {
      await logUnauthenticatedServerAction('account.changeEmail');
      return 'You must be signed in to change your email.';
    }
    await caller.account.changeEmail({ newEmail });
    return null;
  } catch (err: unknown) {
    const message = extractMessage(err);
    await logHandledServerActionError('account.changeEmail', message);
    return message;
  }
}

/**
 * Server action: change the authenticated user's password.
 *
 * Returns an error string on failure, or null on success.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<string | null> {
  try {
    const caller = await getAuthenticatedCaller();
    if (!caller) {
      await logUnauthenticatedServerAction('account.changePassword');
      return 'You must be signed in to change your password.';
    }
    await caller.account.changePassword({ currentPassword, newPassword });
    return null;
  } catch (err: unknown) {
    const message = extractMessage(err);
    await logHandledServerActionError('account.changePassword', message);
    return message;
  }
}

/**
 * Server action: permanently delete the authenticated user's account.
 * The caller must confirm with their current password.
 *
 * Returns an error string on failure, or null on success.
 */
export async function deleteAccount(password: string): Promise<string | null> {
  try {
    const caller = await getAuthenticatedCaller();
    if (!caller) {
      await logUnauthenticatedServerAction('account.deleteAccount');
      return 'You must be signed in to delete your account.';
    }
    await caller.account.deleteAccount({ password });
    return null;
  } catch (err: unknown) {
    const message = extractMessage(err);
    await logHandledServerActionError('account.deleteAccount', message);
    return message;
  }
}

/** Extract a human-readable message from an unknown thrown value. */
function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred. Please try again.';
}
