'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nawhas/ui';
import { toast } from 'sonner';
import { reviewAccessRequest } from '@/server/actions/access-requests';

/**
 * Moderator decision panel for a pending access request.
 * Wraps `accessRequests.review`. Comment is required for rejection;
 * we enforce the rule client-side too for snappier feedback.
 */
export function AccessRequestDecision({ id }: { id: string }): React.JSX.Element {
  const router = useRouter();
  const [comment, setComment] = React.useState('');
  const [pending, setPending] = React.useState<'approve' | 'reject' | null>(null);

  async function decide(action: 'approved' | 'rejected'): Promise<void> {
    if (action === 'rejected' && !comment.trim()) {
      toast.error('A comment is required to reject.');
      return;
    }
    setPending(action === 'approved' ? 'approve' : 'reject');
    try {
      await reviewAccessRequest(id, action, comment.trim() || null);
      toast.success(action === 'approved' ? 'Application approved' : 'Application rejected');
      router.push('/mod/access-requests');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Decision failed');
      setPending(null);
    }
  }

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <h3 className="mb-3 text-sm font-medium text-[var(--text)]">Decision</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={2000}
        className="mb-3 w-full rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-2"
        placeholder="Comment (optional for approval, required for rejection)"
      />
      <div className="flex gap-2">
        <Button
          onClick={() => decide('approved')}
          disabled={pending !== null}
          aria-busy={pending === 'approve'}
          className="flex-1"
        >
          {pending === 'approve' ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          onClick={() => decide('rejected')}
          disabled={pending !== null}
          aria-busy={pending === 'reject'}
          variant="destructive"
          className="flex-1"
        >
          {pending === 'reject' ? 'Rejecting…' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}
