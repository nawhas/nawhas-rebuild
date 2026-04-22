import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';
import { ReciterForm } from '@/components/contribute/reciter-form';

export const metadata: Metadata = buildMetadata({
  title: 'New Reciter Submission',
  description: 'Submit a new reciter for review.',
});

/**
 * /contribute/reciter/new — New reciter submission form.
 * Access guard enforced by /contribute layout.
 */
export default function NewReciterPage(): React.JSX.Element {
  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-foreground">New Reciter</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Submit a new reciter for moderation review.
      </p>
      <ReciterForm action="create" />
    </main>
  );
}
