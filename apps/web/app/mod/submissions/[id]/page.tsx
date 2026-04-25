import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import {
  SubmissionTypeBadge,
  SubmissionActionBadge,
  SubmissionStatusBadge,
} from '@/components/mod/badges';
import { ReviewActions } from '@/components/mod/review-actions';
import { ModeratorNotes } from '@/components/mod/moderator-notes';
import { ReviewThread } from '@/components/mod/review-thread';
import { SubmissionFields } from '@/components/submissions/submission-fields';
import { fetchCurrentValues } from '@/server/lib/submission-fields';
import type {
  SubmissionDTO,
  ReviewThreadDTO,
} from '@nawhas/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Submission ${id.slice(0, 8)}… — Moderation` };
}

const createCaller = createCallerFactory(appRouter);

/**
 * /mod/submissions/[id] — Submission detail page.
 *
 * - For action=edit: renders field-by-field diff of current vs. proposed values.
 * - For action=create: renders a preview of the proposed values.
 * - For pending/changes_requested: shows review action buttons.
 */
export default async function SubmissionDetailPage({
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

  let submission: SubmissionDTO;
  try {
    submission = await caller.moderation.get({ submissionId: id });
  } catch {
    notFound();
  }

  const thread: ReviewThreadDTO = await caller.moderation.getReviewThread({ submissionId: id });

  // Fetch current entity values for edit submissions.
  const currentValues = await fetchCurrentValues(submission);

  const canReview = submission.status === 'pending' || submission.status === 'changes_requested';

  const t = await getTranslations('mod.submission');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* Main column */}
      <div>
        {/* Back link */}
        <Link
          href="/mod/queue"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-dim)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          {t('backToQueue')}
        </Link>

        <h1 className="mb-2 font-serif text-[28px] font-medium text-[var(--text)]">
          {t('heading')}
        </h1>

        {/* Meta badges */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <SubmissionTypeBadge type={submission.type} />
          <SubmissionActionBadge action={submission.action} />
          <SubmissionStatusBadge status={submission.status} />
          <time
            dateTime={String(submission.createdAt)}
            className="text-xs text-[var(--text-faint)]"
            title={new Date(submission.createdAt).toLocaleString()}
          >
            {t('submittedAt', {
              date: new Date(submission.createdAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
            })}
          </time>
        </div>

        {/* Notes from submitter */}
        {submission.notes && (
          <section
            aria-label={t('submitterNotesLabel')}
            className="mb-6 rounded-[8px] border border-[var(--color-info-200)] bg-[var(--color-info-50)] px-4 py-3 dark:border-[var(--color-info-800)] dark:bg-[var(--color-info-950)]"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-info-500)]">
              {t('submitterNotesHeading')}
            </p>
            <p className="text-sm text-[var(--text)]">{submission.notes}</p>
          </section>
        )}

        {/* Field-by-field diff or preview */}
        <section
          aria-label={t('dataLabel')}
          className="mb-6 divide-y divide-[var(--border)] rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] px-5"
        >
          <SubmissionFields
            submission={submission}
            currentValues={currentValues}
            t={t}
          />
        </section>

        {/* Moderator notes */}
        {canReview && (
          <ModeratorNotes submissionId={submission.id} initialNotes={submission.moderatorNotes ?? ''} />
        )}

        {/* Review actions */}
        {canReview && <ReviewActions submissionId={submission.id} />}

        <ReviewThread thread={thread} variant="moderator" />
      </div>

      {/* Metadata sidebar */}
      <aside className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-6 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
        <h2 className="font-serif text-[18px] font-medium text-[var(--text)] mb-4">
          Details
        </h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              ID
            </dt>
            <dd className="text-sm text-[var(--text)] font-mono break-all">{submission.id}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Type
            </dt>
            <dd className="text-sm text-[var(--text)]">
              <SubmissionTypeBadge type={submission.type} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Action
            </dt>
            <dd className="text-sm text-[var(--text)]">
              <SubmissionActionBadge action={submission.action} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Status
            </dt>
            <dd className="text-sm text-[var(--text)]">
              <SubmissionStatusBadge status={submission.status} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Submitted
            </dt>
            <dd className="text-sm text-[var(--text)]">
              {new Date(submission.createdAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
          {submission.targetId && (
            <div>
              <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
                Target ID
              </dt>
              <dd className="text-sm text-[var(--text)] font-mono break-all">{submission.targetId}</dd>
            </div>
          )}
        </dl>
      </aside>
    </div>
  );
}

