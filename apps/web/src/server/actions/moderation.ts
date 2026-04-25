'use server';

import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { logUnauthenticatedServerAction } from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { SubmissionDTO } from '@nawhas/types';

const createCaller = createCallerFactory(appRouter);

async function getModeratorCaller(actionName: string) {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) {
    await logUnauthenticatedServerAction(actionName);
    throw new Error('Not authenticated.');
  }
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
  const caller = await getModeratorCaller('moderation.reviewSubmission');
  return caller.moderation.review({ submissionId, action, comment });
}

/**
 * Set internal moderator notes on a submission.
 * Moderator only.
 */
export async function setSubmissionModeratorNotes(
  submissionId: string,
  notes: string,
): Promise<void> {
  const caller = await getModeratorCaller('moderation.setSubmissionModeratorNotes');
  await caller.moderation.setModeratorNotes({ submissionId, notes });
}

/**
 * Promote or demote a user's role.
 * Moderator only.
 */
export async function setUserRole(
  userId: string,
  role: 'user' | 'contributor',
): Promise<{ success: true }> {
  const caller = await getModeratorCaller('moderation.setUserRole');
  return caller.moderation.setRole({ userId, role });
}
