'use server';

import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { PaginatedResult, ReciterDTO } from '@nawhas/types';

const createCaller = createCallerFactory(appRouter);

/**
 * Server action: fetch the next page of reciters.
 * Used by the ReciterGrid client component for "Load More".
 */
export async function fetchMoreReciters(cursor: string): Promise<PaginatedResult<ReciterDTO>> {
  const caller = createCaller({ db, session: null, user: null });
  return caller.reciter.list({ limit: 24, cursor });
}
