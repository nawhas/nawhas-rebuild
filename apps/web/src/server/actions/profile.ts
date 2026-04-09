'use server';

import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { logUnauthenticatedServerAction } from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { UserDTO } from '@nawhas/types';

const createCaller = createCallerFactory(appRouter);

async function getAuthenticatedCaller() {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) return null;
  return createCaller({ db, session: sessionData.session, user: sessionData.user });
}

/**
 * Server action: update the authenticated user's display name.
 * Returns the updated UserDTO on success, or throws on failure.
 */
export async function updateDisplayName(name: string): Promise<UserDTO> {
  const caller = await getAuthenticatedCaller();
  if (!caller) {
    await logUnauthenticatedServerAction('profile.updateDisplayName');
    throw new Error('You must be signed in to update your profile.');
  }
  return caller.profile.updateDisplayName({ name });
}
