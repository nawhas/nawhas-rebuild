'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nawhas/ui';
import { toast } from 'sonner';
import { withdrawMySubmission } from '@/server/actions/submission';

/**
 * Owner-only withdraw control on /profile/contributions/[id].
 *
 * Two-step confirmation: first click reveals "Are you sure?" + Confirm /
 * Cancel buttons. Confirm calls the `submission.withdrawMine` server
 * action via `withdrawMySubmission`. On success the page is refreshed
 * so the submission's status badge updates and the button's render
 * conditional drops it.
 */
export function WithdrawButton({ id }: { id: string }): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <Button
        variant="outline"
        className="text-[var(--color-error-600)] hover:bg-[var(--color-error-50)] hover:text-[var(--color-error-700)] dark:text-[var(--color-error-400)] dark:hover:bg-[var(--color-error-950)]"
        onClick={() => setConfirming(true)}
      >
        Withdraw submission
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-[var(--text-dim)]">Are you sure?</span>
      <Button
        variant="destructive"
        disabled={pending}
        aria-busy={pending}
        onClick={async () => {
          setPending(true);
          try {
            await withdrawMySubmission(id);
            toast.success('Submission withdrawn');
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Withdraw failed');
            setPending(false);
          }
        }}
      >
        {pending ? 'Withdrawing…' : 'Confirm withdraw'}
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
