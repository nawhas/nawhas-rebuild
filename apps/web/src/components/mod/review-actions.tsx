'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('mod.reviewActions');
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
        setError(err instanceof Error ? err.message : t('reviewFailed'));
      }
    });
  }

  function handleCancel(): void {
    setExpanded(null);
    setComment('');
    setError(null);
  }

  if (expanded) {
    const label = expanded === 'rejected' ? t('reject') : t('requestChanges');

    return (
      <div className="mt-4 space-y-3">
        <label htmlFor="review-comment" className="block text-sm font-medium text-foreground">
          {t('commentLabel')}
        </label>
        <textarea
          id="review-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending}
          placeholder={t('commentPlaceholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'review-comment-error' : undefined}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        {error && (
          <p id="review-comment-error" role="alert" className="text-xs text-destructive">{error}</p>
        )}
        <div className="flex gap-3">
          <Button
            type="button"
            variant={expanded === 'rejected' ? 'destructive' : 'outline'}
            onClick={() => handleAction(expanded)}
            disabled={isPending}
          >
            {isPending ? t('submitting') : label}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
          >
            {t('cancel')}
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
        {isPending ? t('submitting') : t('approve')}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleAction('changes_requested')}
        disabled={isPending}
      >
        {t('requestChanges')}
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={() => handleAction('rejected')}
        disabled={isPending}
      >
        {t('reject')}
      </Button>
    </div>
  );
}
