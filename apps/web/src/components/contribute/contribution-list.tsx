'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SubmissionTypeBadge, SubmissionActionBadge, SubmissionStatusBadge } from '@/components/mod/badges';
import { ResubmitForm } from '@/components/contribute/resubmit-form';
import type { SubmissionDTO } from '@nawhas/types';

interface ContributionListProps {
  initialItems: SubmissionDTO[];
}

/**
 * Client component rendering the contributor's submission list.
 * Each entry expands to show notes and, for changes_requested, the resubmit form.
 */
export function ContributionList({ initialItems }: ContributionListProps): React.JSX.Element {
  const t = useTranslations('contribute.history');
  const router = useRouter();

  if (initialItems.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-dim)]">
        {t('empty')}
      </p>
    );
  }

  return (
    <ol aria-label={t('listLabel')} className="space-y-4">
      {initialItems.map((submission) => (
        <SubmissionCard
          key={submission.id}
          submission={submission}
          onResubmitSuccess={() => router.refresh()}
        />
      ))}
    </ol>
  );
}

function SubmissionCard({
  submission,
  onResubmitSuccess,
}: {
  submission: SubmissionDTO;
  onResubmitSuccess: () => void;
}): React.JSX.Element {
  const t = useTranslations('contribute.history');
  const [expanded, setExpanded] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  const label = getLabel(submission, t);
  const canResubmit = submission.status === 'changes_requested';
  const panelId = `submission-panel-${submission.id}`;

  return (
    <li className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-[var(--text)]">{label}</span>
          <div className="flex flex-wrap items-center gap-2">
            <SubmissionTypeBadge type={submission.type} />
            <SubmissionActionBadge action={submission.action} />
            <SubmissionStatusBadge status={submission.status} />
          </div>
        </div>
        <time
          dateTime={String(submission.createdAt)}
          className="shrink-0 text-xs text-[var(--text-faint)]"
          title={new Date(submission.createdAt).toLocaleString()}
        >
          {new Date(submission.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </time>
        <span aria-hidden="true" className={`ml-1 shrink-0 text-[var(--text-dim)] transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-[var(--border)] px-5 py-4">
          {submission.notes && (
            <div className="mb-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
              <p className="mb-0.5 text-xs font-medium text-[var(--text-dim)]">{t('moderatorNotesHeading')}</p>
              <p className="text-sm text-[var(--text)]">{submission.notes}</p>
            </div>
          )}
          <p className="text-xs text-[var(--text-faint)]">
            {t('submissionId')} <span className="font-mono">{submission.id}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href={`/profile/contributions/${submission.id}`}
              className="rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              View details →
            </Link>

            {canResubmit && !resubmitting && (
              <button
                type="button"
                onClick={() => setResubmitting(true)}
                className="rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
              >
                {t('editAndResubmit')}
              </button>
            )}
          </div>

          {canResubmit && resubmitting && (
            <ResubmitForm
              submission={submission}
              onSuccess={() => {
                setResubmitting(false);
                setExpanded(false);
                onResubmitSuccess();
              }}
              onCancel={() => setResubmitting(false)}
            />
          )}
        </div>
      )}
    </li>
  );
}

function getLabel(
  submission: SubmissionDTO,
  t: (key: string) => string,
): string {
  const data = submission.data as unknown as Record<string, unknown>;
  if (submission.type === 'reciter') return (data.name as string) ?? t('unnamedReciter');
  if (submission.type === 'album') return (data.title as string) ?? t('unnamedAlbum');
  if (submission.type === 'track') return (data.title as string) ?? t('unnamedTrack');
  return submission.id;
}
