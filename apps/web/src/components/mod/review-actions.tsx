'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewSubmission } from '@/server/actions/moderation';

interface ReviewActionsProps {
  submissionId: string;
}

/**
 * Approve / Reject / Request Changes buttons for a pending submission.
 * Calls the moderation.review server action and refreshes the route on success.
 */
export function ReviewActions({ submissionId }: ReviewActionsProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<'rejected' | 'changes_requested' | null>(null);

  function handleAction(action: 'approved' | 'rejected' | 'changes_requested'): void {
    if (action !== 'approved' && !expanded) {
      setExpanded(action);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await reviewSubmission(submissionId, action, comment.trim() || undefined);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit review.');
      }
    });
  }

  function handleCancel(): void {
    setExpanded(null);
    setComment('');
    setError(null);
  }

  if (expanded) {
    const label = expanded === 'rejected' ? 'Reject' : 'Request Changes';
    const buttonClass =
      expanded === 'rejected'
        ? 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
        : 'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50';

    return (
      <div className="mt-4 space-y-3">
        <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Comment (optional)
        </label>
        <textarea
          id="review-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
          placeholder="Add a comment for the submitter..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleAction(expanded)}
            disabled={isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 ${buttonClass}`}
          >
            {isPending ? 'Submitting…' : label}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {error && (
        <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={() => handleAction('approved')}
        disabled={isPending}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1 disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Approve'}
      </button>
      <button
        type="button"
        onClick={() => handleAction('changes_requested')}
        disabled={isPending}
        className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 disabled:opacity-50"
      >
        Request Changes
      </button>
      <button
        type="button"
        onClick={() => handleAction('rejected')}
        disabled={isPending}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
