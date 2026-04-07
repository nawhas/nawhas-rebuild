import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';
import { AlbumForm } from '@/components/contribute/album-form';

export const metadata: Metadata = buildMetadata({
  title: 'New Album Submission',
  description: 'Submit a new album for review.',
});

/**
 * /contribute/album/new — New album submission form.
 * Access guard enforced by /contribute layout.
 */
export default function NewAlbumPage(): React.JSX.Element {
  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">New Album</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Submit a new album for moderation review.
      </p>
      <AlbumForm action="create" />
    </main>
  );
}
