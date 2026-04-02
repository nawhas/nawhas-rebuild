import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@nawhas/db';
import type { Database } from '@nawhas/db';

export interface Context {
  db: Database;
}

export function createContext(_opts: FetchCreateContextFnOptions): Context {
  return { db };
}
