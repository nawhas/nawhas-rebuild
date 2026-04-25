'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { applySubmission } from '@/server/actions/moderation';

interface ApplyButtonProps {
  submissionId: string;
}

/**
 * Apply an approved submission to the canonical tables.
 * Only shown for approved submissions.
 */
export function ApplyButton({ submissionId }: ApplyButtonProps): React.JSX.Element {
  const t = useTranslations('mod.apply');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  function handleApply(): void {
    setError(null);
    startTransition(async () => {
      try {
        await applySubmission(submissionId);
        setApplied(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failed'));
      }
    });
  }

  if (applied) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]"
      >
        {t('applied')}
      </span>
    );
  }

  return (
    <div className="mt-6">
      {error && (
        <p role="alert" className="mb-2 text-[13px] text-[var(--color-error-500)]">{error}</p>
      )}
      <button
        type="button"
        onClick={handleApply}
        disabled={isPending}
        aria-busy={isPending || undefined}
        className="rounded-[8px] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {isPending ? t('applying') : t('button')}
      </button>
    </div>
  );
}
