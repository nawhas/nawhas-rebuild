'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nawhas/ui/components/button';
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

    return (
      <div className="mt-4 space-y-3">
        <label htmlFor="review-comment" className="block text-sm font-medium text-foreground">
          Comment (optional)
        </label>
        <textarea
          id="review-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
          placeholder="Add a comment for the submitter..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">{error}</p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant={expanded === 'rejected' ? 'destructive' : 'outline'}
            onClick={() => handleAction(expanded)}
            disabled={isPending}
          >
            {isPending ? 'Submitting…' : label}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {error && (
        <p role="alert" className="w-full text-xs text-destructive">{error}</p>
      )}
      <Button
        type="button"
        onClick={() => handleAction('approved')}
        disabled={isPending}
      >
        {isPending ? 'Submitting…' : 'Approve'}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleAction('changes_requested')}
        disabled={isPending}
      >
        Request Changes
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={() => handleAction('rejected')}
        disabled={isPending}
      >
        Reject
      </Button>
    </div>
  );
}
