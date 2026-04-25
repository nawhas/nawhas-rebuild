import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Badge } from '@nawhas/ui';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { AccessRequestDecision } from '../access-request-detail';

export const metadata: Metadata = buildMetadata({
  title: 'Access request',
  description: 'Review a contributor access application.',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /mod/access-requests/[id] — detail view of one application.
 *
 * NOTE (W3 ship): we currently fetch the full queue (status='all', limit=100)
 * and filter in memory because there's no `getById` procedure on the
 * accessRequests router yet. Wasteful at scale; replace with a dedicated
 * lookup when the queue grows beyond a single page. Tracked in the plan's
 * future-improvements list.
 */
export default async function AccessRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });
  const { items } = await caller.accessRequests.queue({ status: 'all', limit: 100 });
  const req = items.find((r) => r.id === id);
  if (!req) notFound();

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-serif text-2xl font-medium text-[var(--text)]">
            {req.applicantName}
          </h2>
          <Badge variant={req.status === 'pending' ? 'default' : 'outline'}>{req.status}</Badge>
        </div>
        <p className="mb-1 text-sm text-[var(--text-dim)]">{req.applicantEmail}</p>
        <p className="mb-6 text-xs text-[var(--text-faint)]">
          Account created {new Date(req.applicantCreatedAt).toLocaleDateString()}
        </p>
        {req.reason ? (
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
            <h3 className="mb-2 text-sm font-medium text-[var(--text)]">Reason</h3>
            <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{req.reason}</p>
          </div>
        ) : (
          <p className="text-sm italic text-[var(--text-faint)]">No reason provided.</p>
        )}
        {req.reviewComment && (
          <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="mb-2 text-sm font-medium text-[var(--text)]">Moderator comment</h3>
            <p className="text-sm text-[var(--text)]">{req.reviewComment}</p>
          </div>
        )}
      </div>
      <div>{req.status === 'pending' && <AccessRequestDecision id={req.id} />}</div>
    </div>
  );
}
