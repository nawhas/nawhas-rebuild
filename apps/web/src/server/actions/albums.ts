'use server';

import { db } from '@nawhas/db';
import { withServerActionLogging } from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { AlbumListItemDTO, PaginatedResult } from '@nawhas/types';

const createCaller = createCallerFactory(appRouter);

/**
 * Server action: fetch the next page of albums.
 * Used by the AlbumGrid client component for "Load More".
 */
export async function fetchMoreAlbums(cursor: string): Promise<PaginatedResult<AlbumListItemDTO>> {
  return withServerActionLogging('albums.fetchMoreAlbums', async () => {
    const caller = createCaller({ db, session: null, user: null });
    return caller.album.list({ limit: 24, cursor });
  });
}
