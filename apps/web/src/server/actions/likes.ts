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
 * Server action: like a track for the authenticated user.
 * Silently no-ops if the user is not authenticated.
 */
export async function likeTrack(trackId: string): Promise<void> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return;
  await caller.likes.like({ trackId });
}

/**
 * Server action: remove a like from a track.
 * Silently no-ops if the user is not authenticated.
 */
export async function unlikeTrack(trackId: string): Promise<void> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return;
  await caller.likes.unlike({ trackId });
}

/**
 * Server action: check whether the current user has liked a track.
 * Returns false for unauthenticated users.
 */
export async function getIsLiked(trackId: string): Promise<boolean> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return false;
  return caller.likes.isLiked({ trackId });
}
