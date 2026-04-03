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
 * Server action: save a track to the authenticated user's library.
 * Silently no-ops if the user is not authenticated.
 */
export async function saveTrack(trackId: string): Promise<void> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return;
  await caller.library.save({ trackId });
}

/**
 * Server action: remove a track from the authenticated user's library.
 * Silently no-ops if the user is not authenticated.
 */
export async function unsaveTrack(trackId: string): Promise<void> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return;
  await caller.library.unsave({ trackId });
}

/**
 * Server action: check whether the current user has saved a track.
 * Returns false for unauthenticated users.
 */
export async function getIsSaved(trackId: string): Promise<boolean> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return false;
  return caller.library.isSaved({ trackId });
}
