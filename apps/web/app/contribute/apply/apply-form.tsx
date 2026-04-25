'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nawhas/ui';
import { toast } from 'sonner';
import { applyForAccess } from '@/server/actions/access-requests';

const MAX_REASON = 1000;

/**
 * Apply-to-contribute form. Calls the `accessRequests.create` server action
 * (procedure was renamed from `apply` due to tRPC v11 reserved-word collision)
 * and surfaces toast feedback. On success, redirects to /contribute and
 * refreshes the route segment so the new pending state shows.
 */
export function ApplyForm(): React.JSX.Element {
  const router = useRouter();
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyForAccess(reason.trim() ? reason : null);
      toast.success('Application submitted');
      router.push('/contribute');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to apply';
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="text-sm">
        <span className="mb-1.5 block font-medium text-[var(--text)]">
          Why do you want to contribute?{' '}
          <span className="font-normal text-[var(--text-faint)]">(optional)</span>
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_REASON}
          rows={6}
          className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-2"
          placeholder="Tell us a bit about how you'd like to help — translations, missing reciters, lyric corrections..."
        />
        <div className="mt-1 text-right text-xs text-[var(--text-faint)]">
          {reason.length} / {MAX_REASON}
        </div>
      </label>
      <Button type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? 'Submitting…' : 'Submit application'}
      </Button>
    </form>
  );
}
