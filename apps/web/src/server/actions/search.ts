'use server';

import { db } from '@nawhas/db';
import { withServerActionLogging } from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { AutocompleteDTO } from '@nawhas/types';

const createCaller = createCallerFactory(appRouter);

/**
 * Server action: run autocomplete search across reciters, albums, and tracks.
 * Used by the SearchBar client component — keeps the Typesense API key server-side.
 */
export async function autocompleteSearch(q: string): Promise<AutocompleteDTO> {
  return withServerActionLogging('search.autocompleteSearch', async () => {
    const caller = createCaller({ db, session: null, user: null });
    return caller.search.autocomplete({ q });
  });
}
