import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@nawhas/db';
import type { Database } from '@nawhas/db';
import { auth } from '@/lib/auth';
import type { Session, User } from '@/lib/auth';

export interface Context {
  db: Database;
  session: Session | null;
  user: User | null;
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const sessionData = await auth.api.getSession({ headers: opts.req.headers });
  return {
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  };
}
