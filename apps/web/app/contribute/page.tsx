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
      <h1 className="mb-2 text-3xl font-bold text-foreground">Contribute</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Help grow the Nawhas library by submitting new content or suggesting edits to existing
        entries. All submissions go through a moderation review before going live.
      </p>

      {/* New content */}
      <section aria-label="Submit new content" className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-foreground uppercase tracking-wider">
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
              className="flex flex-col rounded-lg border border-border bg-card p-4 hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="font-medium text-foreground">{label}</span>
              <span className="mt-1 text-xs text-muted-foreground">{description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Contributions history */}
      <section aria-label="Your contributions">
        <h2 className="mb-3 text-base font-semibold text-foreground uppercase tracking-wider">
          Your contributions
        </h2>
        <Link
          href="/profile/contributions"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        >
          View your submission history →
        </Link>
      </section>
    </main>
  );
}
