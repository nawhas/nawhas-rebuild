import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { ReviewThread } from '@/components/mod/review-thread';
import { SubmissionFields } from '@/components/submissions/submission-fields';
import { fetchCurrentValues } from '@/server/lib/submission-fields';
import {
  SubmissionTypeBadge,
  SubmissionActionBadge,
  SubmissionStatusBadge,
} from '@/components/mod/badges';
import { ChangesRequestedBanner } from '@/components/contribute/changes-requested-banner';
import { WithdrawButton } from './withdraw-button';
import type { SubmissionDTO, ResubmitContextDTO } from '@nawhas/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'My submission' };
}

const createCaller = createCallerFactory(appRouter);

/**
 * /profile/contributions/[id] — Contributor submission detail.
 *
 * Auth guard is inherited from (protected) layout.
 * Shows the submitter's own submission with the reviewer-redacted thread.
 */
export default async function MyContributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData?.session) notFound();

  const caller = createCaller({
    db,
    session: sessionData.session,
    user: sessionData.user,
  });

  let submission: SubmissionDTO;
  try {
    submission = await caller.submission.getMine({ submissionId: id });
  } catch {
    notFound();
  }

  const thread = await caller.submission.getMyReviewThread({ submissionId: id });
  const currentValues = await fetchCurrentValues(submission);

  let resubmitCtx: ResubmitContextDTO | null = null;
  if (submission.status === 'changes_requested') {
    try {
      resubmitCtx = await caller.submission.getResubmitContext({ id });
    } catch {
      resubmitCtx = null;
    }
  }

  const t = await getTranslations('profile.contributions');
  const tFields = await getTranslations('mod.submission');

  return (
    <main id="main-content" className="mx-auto max-w-3xl py-10 px-4">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-dim)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      >
        {t('detailBackLink')}
      </Link>

      <h1 className="mb-4 font-serif text-[28px] font-medium text-[var(--text)]">
        {t('detailHeading')}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SubmissionTypeBadge type={submission.type} />
        <SubmissionActionBadge action={submission.action} />
        <SubmissionStatusBadge status={submission.status} />
      </div>

      {resubmitCtx && (
        <ChangesRequestedBanner
          comment={resubmitCtx.lastReviewComment}
          reviewedAt={resubmitCtx.lastReviewedAt}
          priorData={resubmitCtx.priorData as unknown as Record<string, unknown>}
          currentData={submission.data as unknown as Record<string, unknown>}
        />
      )}

      {submission.notes && (
        <section
          aria-label={tFields('submitterNotesLabel')}
          className="mb-6 rounded-[8px] border border-[var(--color-info-200)] bg-[var(--color-info-50)] px-4 py-3 dark:border-[var(--color-info-800)] dark:bg-[var(--color-info-950)]"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-info-500)]">
            {tFields('submitterNotesHeading')}
          </p>
          <p className="text-sm text-[var(--text)]">{submission.notes}</p>
        </section>
      )}

      <section
        aria-label={tFields('dataLabel')}
        className="mb-6 divide-y divide-[var(--border)] rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] px-5"
      >
        <SubmissionFields submission={submission} currentValues={currentValues} t={tFields} />
      </section>

      <ReviewThread thread={thread} variant="contributor" />

      {(submission.status === 'pending' || submission.status === 'changes_requested') && (
        <div className="mt-6">
          <WithdrawButton id={submission.id} />
        </div>
      )}
    </main>
  );
}
