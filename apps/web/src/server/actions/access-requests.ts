'use server';

import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { logUnauthenticatedServerAction } from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';

const createCaller = createCallerFactory(appRouter);

async function getAuthenticatedCaller(actionName: string) {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) {
    await logUnauthenticatedServerAction(actionName);
    throw new Error('Not authenticated.');
  }
  return createCaller({ db, session: sessionData.session, user: sessionData.user });
}

/**
 * Server action: submit a contributor access-request application.
 * Wraps `accessRequests.create` (renamed from `apply` due to tRPC v11
 * reserved-word collision). Caller must be role='user'.
 */
export async function applyForAccess(reason: string | null): Promise<{ id: string }> {
  const caller = await getAuthenticatedCaller('accessRequests.create');
  return caller.accessRequests.create({ reason });
}

/**
 * Server action: cancel one's own pending application.
 */
export async function withdrawAccessRequest(id: string): Promise<{ ok: true }> {
  const caller = await getAuthenticatedCaller('accessRequests.withdrawMine');
  return caller.accessRequests.withdrawMine({ id });
}

/**
 * Server action: moderator approves or rejects an access request.
 * Comment is required for rejection (validated server-side too).
 */
export async function reviewAccessRequest(
  id: string,
  action: 'approved' | 'rejected',
  comment: string | null,
): Promise<{ ok: true }> {
  const caller = await getAuthenticatedCaller('accessRequests.review');
  return caller.accessRequests.review({ id, action, comment });
}
