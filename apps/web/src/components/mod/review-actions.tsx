'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
      <div className="mt-6 space-y-3">
        <label htmlFor="review-comment" className="block text-[13px] font-medium text-[var(--text-dim)]">
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
          className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
        />
        {error && (
          <p id="review-comment-error" role="alert" className="text-[13px] text-[var(--color-error-500)]">{error}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleAction(expanded)}
            disabled={isPending}
            className={
              expanded === 'rejected'
                ? 'rounded-[8px] bg-[var(--color-error-600)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-error-700)] focus-visible:outline-2 focus-visible:outline-[var(--color-error-500)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                : 'rounded-[8px] bg-[var(--input-bg)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            }
          >
            {isPending ? t('submitting') : label}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-[8px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--input-bg)] px-4 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {error && (
        <p role="alert" className="w-full text-[13px] text-[var(--color-error-500)]">{error}</p>
      )}
      {/* Approve — primary CTA */}
      <button
        type="button"
        onClick={() => handleAction('approved')}
        disabled={isPending}
        className="rounded-[8px] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('submitting') : t('approve')}
      </button>
      {/* Request Changes — secondary CTA */}
      <button
        type="button"
        onClick={() => handleAction('changes_requested')}
        disabled={isPending}
        className="rounded-[8px] bg-[var(--input-bg)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('requestChanges')}
      </button>
      {/* Reject — destructive CTA */}
      <button
        type="button"
        onClick={() => handleAction('rejected')}
        disabled={isPending}
        className="rounded-[8px] bg-[var(--color-error-600)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-error-700)] focus-visible:outline-2 focus-visible:outline-[var(--color-error-500)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('reject')}
      </button>
    </div>
  );
}
