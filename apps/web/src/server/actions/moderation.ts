'use server';

import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { SubmissionDTO } from '@nawhas/types';

const createCaller = createCallerFactory(appRouter);

async function getModeratorCaller() {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) throw new Error('Not authenticated.');
  return createCaller({ db, session: sessionData.session, user: sessionData.user });
}

/**
 * Approve a submission (sets status to 'approved').
 * Moderator only.
 */
export async function reviewSubmission(
  submissionId: string,
  action: 'approved' | 'rejected' | 'changes_requested',
  comment?: string,
): Promise<SubmissionDTO> {
  const caller = await getModeratorCaller();
  return caller.moderation.review({ submissionId, action, comment });
}

/**
 * Apply an approved submission to the canonical tables.
 * Moderator only.
 */
export async function applySubmission(
  submissionId: string,
): Promise<{ success: true; entityId: string }> {
  const caller = await getModeratorCaller();
  return caller.moderation.applyApproved({ submissionId });
}

/**
 * Promote or demote a user's role.
 * Moderator only.
 */
export async function setUserRole(
  userId: string,
  role: 'user' | 'contributor',
): Promise<{ success: true }> {
  const caller = await getModeratorCaller();
  return caller.moderation.setRole({ userId, role });
}
