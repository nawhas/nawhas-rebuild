'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@nawhas/ui/components/card';
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
  const router = useRouter();

  if (initialItems.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        No submissions yet. Start contributing above.
      </p>
    );
  }

  return (
    <ol aria-label="Your submissions" className="space-y-4">
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
  const [expanded, setExpanded] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  const label = getLabel(submission);
  const canResubmit = submission.status === 'changes_requested';

  return (
    <li>
      <Card>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-400 dark:hover:bg-gray-700"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{label}</span>
            <div className="flex flex-wrap items-center gap-2">
              <SubmissionTypeBadge type={submission.type} />
              <SubmissionActionBadge action={submission.action} />
              <SubmissionStatusBadge status={submission.status} />
            </div>
          </div>
          <time
            dateTime={String(submission.createdAt)}
            className="shrink-0 text-xs text-gray-400 dark:text-gray-500"
            title={new Date(submission.createdAt).toLocaleString()}
          >
            {new Date(submission.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </time>
          <span aria-hidden="true" className={`ml-1 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        {expanded && (
          <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
            {submission.notes && (
              <div className="mb-3 rounded bg-blue-50 px-3 py-2 dark:bg-blue-950">
                <p className="mb-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">Moderator notes</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">{submission.notes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Submission ID: <span className="font-mono">{submission.id}</span>
            </p>

            {canResubmit && !resubmitting && (
              <button
                type="button"
                onClick={() => setResubmitting(true)}
                className="mt-3 rounded-md border border-orange-400 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-950"
              >
                Edit and resubmit
              </button>
            )}

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
      </Card>
    </li>
  );
}

function getLabel(submission: SubmissionDTO): string {
  const data = submission.data as unknown as Record<string, unknown>;
  if (submission.type === 'reciter') return (data.name as string) ?? 'Unnamed reciter';
  if (submission.type === 'album') return (data.title as string) ?? 'Unnamed album';
  if (submission.type === 'track') return (data.title as string) ?? 'Unnamed track';
  return submission.id;
}
