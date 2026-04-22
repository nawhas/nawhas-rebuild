'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from '@nawhas/ui/components/badge';
import { Button } from '@nawhas/ui/components/button';
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
      <Badge
        variant="secondary"
        role="status"
        aria-live="polite"
        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      >
        {t('applied')}
      </Badge>
    );
  }

  return (
    <div className="mt-4">
      {error && (
        <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>
      )}
      <Button type="button" onClick={handleApply} disabled={isPending}>
        {isPending ? t('applying') : t('button')}
      </Button>
    </div>
  );
}
