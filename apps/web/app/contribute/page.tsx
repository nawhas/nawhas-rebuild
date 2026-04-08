import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Contribute',
  description: 'Submit reciters, albums, and tracks to the Nawhas library.',
});

/**
 * /contribute — Contributor landing page.
 *
 * Access guard is enforced by the /contribute layout.
 * Shows what a contributor can submit and links to each form.
 */
export default function ContributePage(): React.JSX.Element {
  return (
    <main id="main-content" className="mx-auto max-w-2xl py-10 px-4">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Contribute</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        Help grow the Nawhas library by submitting new content or suggesting edits to existing
        entries. All submissions go through a moderation review before going live.
      </p>

      {/* New content */}
      <section aria-label="Submit new content" className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-gray-700 uppercase tracking-wider dark:text-gray-300">
          Add new content
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: '/contribute/reciter/new', label: 'New Reciter', description: 'Add a reciter not yet in the library.' },
            { href: '/contribute/album/new', label: 'New Album', description: 'Add an album for an existing reciter.' },
            { href: '/contribute/track/new', label: 'New Track', description: 'Add a track to an existing album.' },
          ].map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-500"
            >
              <span className="font-medium text-gray-900 dark:text-white">{label}</span>
              <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Contributions history */}
      <section aria-label="Your contributions">
        <h2 className="mb-3 text-base font-semibold text-gray-700 uppercase tracking-wider dark:text-gray-300">
          Your contributions
        </h2>
        <Link
          href="/profile/contributions"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500"
        >
          View your submission history →
        </Link>
      </section>
    </main>
  );
}
