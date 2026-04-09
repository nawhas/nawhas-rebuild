import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@nawhas/db';
import type { Database } from '@nawhas/db';
import { auth } from '@/lib/auth';
import type { Session, User } from '@/lib/auth';

export interface Context {
  db: Database;
  session: Session | null;
  user: User | null;
  /** Present when the caller is the HTTP /api/trpc adapter (x-request-id from middleware). */
  requestId?: string;
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const sessionData = await auth.api.getSession({ headers: opts.req.headers });
  const requestId = opts.req.headers.get('x-request-id') ?? undefined;
  return {
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
    ...(requestId ? { requestId } : {}),
  };
}
