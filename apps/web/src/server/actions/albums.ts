'use server';

import { db } from '@nawhas/db';
import { withServerActionLogging } from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { AlbumDTO, AlbumListItemDTO, PaginatedResult } from '@nawhas/types';

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

/**
 * Server action: fetch the next page of albums for a given reciter.
 * Used by the LoadMoreAlbums client component on the reciter profile page.
 */
export async function fetchMoreAlbumsForReciter(input: {
  reciterSlug: string;
  cursor: string;
  limit?: number;
}): Promise<PaginatedResult<AlbumDTO>> {
  return withServerActionLogging('albums.fetchMoreAlbumsForReciter', async () => {
    const caller = createCaller({ db, session: null, user: null });
    return caller.album.listByReciter({
      reciterSlug: input.reciterSlug,
      cursor: input.cursor,
      limit: input.limit ?? 12,
    });
  });
}
