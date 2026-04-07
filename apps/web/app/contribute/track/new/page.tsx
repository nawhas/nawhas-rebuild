import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';
import { TrackForm } from '@/components/contribute/track-form';

export const metadata: Metadata = buildMetadata({
  title: 'New Track Submission',
  description: 'Submit a new track for review.',
});

/**
 * /contribute/track/new — New track submission form.
 * Access guard enforced by /contribute layout.
 */
export default function NewTrackPage(): React.JSX.Element {
  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">New Track</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Submit a new track for moderation review.
      </p>
      <TrackForm action="create" />
    </main>
  );
}
