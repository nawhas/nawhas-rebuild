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
    throw new Error('You must be signed in.');
  }
  return createCaller({ db, session: sessionData.session, user: sessionData.user });
}

export interface ReciterSearchResult {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}

export interface AlbumSearchResult {
  id: string;
  title: string;
  slug: string;
  reciterId: string;
  reciterName: string;
}

/** Typeahead search for reciters — used by the album form's reciter picker. */
export async function searchReciters(query: string): Promise<ReciterSearchResult[]> {
  const caller = await getAuthenticatedCaller('contribute.searchReciters');
  return caller.contribute.searchReciters({ query });
}

/** Typeahead search for albums — used by the track form's album picker. */
export async function searchAlbums(query: string): Promise<AlbumSearchResult[]> {
  const caller = await getAuthenticatedCaller('contribute.searchAlbums');
  return caller.contribute.searchAlbums({ query });
}
