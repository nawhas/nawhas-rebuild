'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nawhas/ui';
import { toast } from 'sonner';
import { withdrawAccessRequest } from '@/server/actions/access-requests';

/**
 * Client-side withdraw button rendered next to the pending-application card
 * on /contribute/apply. Calls the `accessRequests.withdrawMine` server action.
 */
export default function ClientWithdraw({ id }: { id: string }): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onClick(): Promise<void> {
    setPending(true);
    try {
      await withdrawAccessRequest(id);
      toast.success('Application withdrawn');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Withdraw failed');
      setPending(false);
    }
  }

  return (
    <Button variant="destructive" onClick={onClick} disabled={pending} aria-busy={pending}>
      {pending ? 'Withdrawing…' : 'Withdraw application'}
    </Button>
  );
}
