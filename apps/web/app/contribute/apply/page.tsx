import * as React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { ApplyForm } from './apply-form';
import ClientWithdraw from './client-withdraw';

export const metadata: Metadata = buildMetadata({
  title: 'Apply to contribute',
  description: 'Apply for contributor access to submit reciters, albums, and tracks.',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /contribute/apply — page where role=user submits an access-request to
 * become a contributor.
 *
 * Note: the parent /contribute layout currently renders an access-denied
 * panel for non-contributors. Phase G adds a path-aware bypass so this
 * route is reachable; until then, the page is implemented but only
 * directly testable for moderator/contributor sessions (which are
 * redirected to /contribute) or after the layout update lands.
 */
export default async function ApplyPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  if (!sessionData) {
    redirect('/login?callbackUrl=' + encodeURIComponent('/contribute/apply'));
  }

  const role = (sessionData.user as { role?: string }).role ?? 'user';
  if (role === 'contributor' || role === 'moderator' || role === 'admin') {
    redirect('/contribute');
  }

  const caller = createCaller({
    db,
    session: sessionData.session,
    user: sessionData.user,
  });
  const existing = await caller.accessRequests.getMine();

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-3 font-serif text-3xl font-medium text-[var(--text)]">
        Apply to contribute
      </h1>
      <p className="mb-6 text-sm text-[var(--text-dim)]">
        Contributors can submit reciters, albums, and tracks for moderator review.
      </p>

      {existing && existing.status === 'pending' ? (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <p className="mb-3 text-sm font-medium text-[var(--text)]">
            Your application is pending review
          </p>
          <p className="mb-4 text-sm text-[var(--text-dim)]">
            Submitted {new Date(existing.createdAt).toLocaleDateString()}.
          </p>
          <ClientWithdraw id={existing.id} />
        </div>
      ) : existing && existing.status === 'rejected' ? (
        <div className="mb-6 rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <p className="mb-2 text-sm font-medium text-[var(--text)]">
            Your previous application wasn&apos;t approved
          </p>
          {existing.reviewComment && (
            <blockquote className="mb-3 border-l-2 border-[var(--border)] pl-3 text-sm text-[var(--text-dim)]">
              {existing.reviewComment}
            </blockquote>
          )}
          <p className="text-sm text-[var(--text-dim)]">
            You can submit a new application below with more context.
          </p>
          <div className="mt-6">
            <ApplyForm />
          </div>
        </div>
      ) : (
        <ApplyForm />
      )}

      <p className="mt-8 text-sm">
        <Link
          href="/"
          className="text-[var(--text-dim)] hover:text-[var(--text)] hover:underline"
        >
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
