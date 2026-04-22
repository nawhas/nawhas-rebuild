'use server';

import { headers } from 'next/headers';
import type {
  PaginatedResult,
  SavedTrackDTO,
  TrackDTO,
  TrackListItemDTO,
} from '@nawhas/types';
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

/**
 * Server action: fetch the next page of saved tracks.
 * Used by the LibraryTracksList client component for "Load More".
 */
export async function fetchMoreLibraryTracks(
  cursor: string,
): Promise<PaginatedResult<SavedTrackDTO>> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return { items: [], nextCursor: null };
  return caller.library.list({ limit: 20, cursor });
}

/**
 * Server action: get all saved tracks for queue injection.
 */
export async function playAllLibraryTracks(): Promise<TrackDTO[]> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return [];
  return caller.library.playAll();
}

/**
 * Server action: fetch the N most recently saved tracks (enriched with
 * reciter/album slugs) for the home page "Recently Saved" strip.
 *
 * Returns an empty array for unauthenticated users so the client component
 * can render nothing without leaking auth state into UI chrome.
 */
export async function getRecentSavedTracks(
  limit = 6,
): Promise<TrackListItemDTO[]> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return [];
  return caller.home.getRecentSaved({ limit });
}
