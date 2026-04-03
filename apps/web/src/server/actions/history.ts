'use server';

import { headers } from 'next/headers';
import type { PaginatedResult, ListenHistoryEntryDTO } from '@nawhas/types';
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

/**
 * Server action: fetch the next page of listening history.
 * Used by the HistoryList client component for "Load More".
 */
export async function fetchMoreHistoryEntries(
  cursor: string,
): Promise<PaginatedResult<ListenHistoryEntryDTO>> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return { items: [], nextCursor: null };
  return caller.history.list({ limit: 20, cursor });
}

/**
 * Server action: clear all listening history for the authenticated user.
 * Silently no-ops if the user is not authenticated.
 */
export async function clearHistory(): Promise<void> {
  const caller = await getAuthenticatedCaller();
  if (!caller) return;
  await caller.history.clear();
}
