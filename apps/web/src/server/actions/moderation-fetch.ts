'use server';

import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { SubmissionDTO, AuditLogDTO, PaginatedResult } from '@nawhas/types';

const createCaller = createCallerFactory(appRouter);

async function getModeratorCaller() {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) throw new Error('Not authenticated.');
  return createCaller({ db, session: sessionData.session, user: sessionData.user });
}

/** Fetch next page of moderation queue. */
export async function fetchQueuePage(cursor: string): Promise<PaginatedResult<SubmissionDTO>> {
  const caller = await getModeratorCaller();
  return caller.moderation.queue({ limit: 20, cursor });
}

/** Fetch next page of audit log. */
export async function fetchAuditLogPage(cursor: string): Promise<PaginatedResult<AuditLogDTO>> {
  const caller = await getModeratorCaller();
  return caller.moderation.auditLog({ limit: 20, cursor });
}

/** Fetch next page of users. */
export async function fetchUsersPage(
  cursor: string,
  search?: string,
): Promise<PaginatedResult<{ id: string; name: string; email: string; role: string; createdAt: Date }>> {
  const caller = await getModeratorCaller();
  return caller.moderation.users({ limit: 20, cursor, search });
}
