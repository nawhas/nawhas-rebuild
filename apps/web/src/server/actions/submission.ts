'use server';

import { headers } from 'next/headers';
import type { z } from 'zod';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { logUnauthenticatedServerAction } from '@/lib/logger/log-server-action';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import type { reciterDataSchema, albumDataSchema, trackDataSchema } from '@/server/routers/submission';
import type { SubmissionDTO, PaginatedResult } from '@nawhas/types';

type ReciterData = z.infer<typeof reciterDataSchema>;
type AlbumData = z.infer<typeof albumDataSchema>;
type TrackData = z.infer<typeof trackDataSchema>;

const createCaller = createCallerFactory(appRouter);

async function getAuthenticatedCaller(actionName: string) {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) {
    await logUnauthenticatedServerAction(actionName);
    throw new Error('You must be signed in.');
  }
  return createCaller({ db, session: sessionData.session, user: sessionData.user });
}

/** Create a new reciter submission. */
export async function createReciterSubmission(
  action: 'create' | 'edit',
  data: ReciterData,
  targetId?: string,
): Promise<SubmissionDTO> {
  const caller = await getAuthenticatedCaller('submission.createReciterSubmission');
  return caller.submission.create({
    type: 'reciter',
    action,
    data,
    ...(targetId ? { targetId } : {}),
  });
}

/** Create a new album submission. */
export async function createAlbumSubmission(
  action: 'create' | 'edit',
  data: AlbumData,
  targetId?: string,
): Promise<SubmissionDTO> {
  const caller = await getAuthenticatedCaller('submission.createAlbumSubmission');
  return caller.submission.create({
    type: 'album',
    action,
    data,
    ...(targetId ? { targetId } : {}),
  });
}

/** Create a new track submission. */
export async function createTrackSubmission(
  action: 'create' | 'edit',
  data: TrackData,
  targetId?: string,
): Promise<SubmissionDTO> {
  const caller = await getAuthenticatedCaller('submission.createTrackSubmission');
  return caller.submission.create({
    type: 'track',
    action,
    data,
    ...(targetId ? { targetId } : {}),
  });
}

/** Resubmit a changes_requested submission. */
export async function resubmitSubmission(id: string, type: 'reciter', data: ReciterData): Promise<SubmissionDTO>;
export async function resubmitSubmission(id: string, type: 'album', data: AlbumData): Promise<SubmissionDTO>;
export async function resubmitSubmission(id: string, type: 'track', data: TrackData): Promise<SubmissionDTO>;
export async function resubmitSubmission(
  id: string,
  type: 'reciter' | 'album' | 'track',
  data: ReciterData | AlbumData | TrackData,
): Promise<SubmissionDTO> {
  const caller = await getAuthenticatedCaller('submission.resubmitSubmission');
  if (type === 'reciter') {
    return caller.submission.update({ id, type: 'reciter', data: data as ReciterData });
  }
  if (type === 'album') {
    return caller.submission.update({ id, type: 'album', data: data as AlbumData });
  }
  return caller.submission.update({ id, type: 'track', data: data as TrackData });
}

/** Fetch the authenticated user's submission history. */
export async function fetchMySubmissions(cursor?: string): Promise<PaginatedResult<SubmissionDTO>> {
  const caller = await getAuthenticatedCaller('submission.fetchMySubmissions');
  return caller.submission.myHistory({ limit: 20, cursor });
}

/** Fetch a single submission (own or moderator). */
export async function fetchSubmission(id: string): Promise<SubmissionDTO> {
  const caller = await getAuthenticatedCaller('submission.fetchSubmission');
  return caller.submission.get({ id });
}
