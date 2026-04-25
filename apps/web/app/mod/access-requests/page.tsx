import * as React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Badge } from '@nawhas/ui';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Access requests',
  description: 'Review contributor access applications.',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

const STATUS_TABS = ['pending', 'approved', 'rejected', 'withdrawn', 'all'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

/**
 * /mod/access-requests — moderator queue of contributor access applications.
 * Filterable by status via ?status=pending|approved|rejected|withdrawn|all.
 * Auth + moderator role inherited from /mod layout.
 */
export default async function AccessRequestsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const rawStatus = params.status;
  const status: StatusTab = (STATUS_TABS as readonly string[]).includes(rawStatus ?? '')
    ? (rawStatus as StatusTab)
    : 'pending';

  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });
  const { items } = await caller.accessRequests.queue({ status, limit: 50 });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-medium text-[var(--text)]">
          Access requests
        </h2>
        <div className="flex gap-2 text-sm">
          {STATUS_TABS.map((s) => (
            <Link
              key={s}
              href={`/mod/access-requests?status=${s}`}
              className={
                s === status
                  ? 'rounded-[6px] bg-[var(--surface-2)] px-3 py-1.5 font-medium text-[var(--text)] capitalize'
                  : 'rounded-[6px] px-3 py-1.5 text-[var(--text-dim)] hover:bg-[var(--surface)] capitalize'
              }
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center text-sm text-[var(--text-dim)]">
          No access requests in this view.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((req) => (
            <li key={req.id}>
              <Link
                href={`/mod/access-requests/${req.id}`}
                className="block rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-4 hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">
                      {req.applicantName}
                    </div>
                    <div className="text-xs text-[var(--text-dim)]">{req.applicantEmail}</div>
                    {req.reason && (
                      <p className="mt-2 line-clamp-3 text-sm text-[var(--text-dim)]">
                        {req.reason}
                      </p>
                    )}
                  </div>
                  <Badge variant={req.status === 'pending' ? 'default' : 'outline'}>
                    {req.status}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-[var(--text-faint)]">
                  {new Date(req.createdAt).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
