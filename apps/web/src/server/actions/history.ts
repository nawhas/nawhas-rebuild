'use server';

import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
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
 * Server action: record a track play in listening history.
 * Silently no-ops if the user is not authenticated.
 * Server-side 30s dedup is enforced in the history.record tRPC procedure.
 */
export async function recordPlay(trackId: string): Promise<void> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return;
  await caller.history.record({ trackId });
}
