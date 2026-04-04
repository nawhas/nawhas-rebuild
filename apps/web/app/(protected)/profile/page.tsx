import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { AvatarUpload } from '@/components/profile/avatar-upload';
import { DisplayNameEdit } from '@/components/profile/display-name-edit';
import { buildMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'My Profile',
  description: 'View and edit your Nawhas profile.',
});

const createCaller = createCallerFactory(appRouter);

/**
 * Profile Page — /profile
 *
 * Protected Server Component. Renders inside the (protected) layout which
 * handles the auth redirect guard.
 *
 * SSR's user info, saved-track count, and recent listening history in parallel.
 * - dynamic = 'force-dynamic' because the page is user-specific (no ISR).
 */
export const dynamic = 'force-dynamic';

export default async function ProfilePage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  // Session guaranteed by (protected) layout, but handle gracefully.
  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  // Fetch saved-track count and recent history in parallel.
  const [savedCount, recentHistory] = await Promise.all([
    caller.library.count(),
    caller.history.list({ limit: 10 }),
  ]);

  const user = sessionData!.user;
  const joinedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main id="main-content" className="py-10">
      <Container>
        <h1 className="sr-only">My Profile</h1>

        {/* Profile header card */}
        <section
          aria-label="Profile"
          className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Avatar */}
            <AvatarUpload
              imageUrl={user.image ?? null}
              name={user.name}
              onUploaded={() => {
                // Page will reflect the new URL on next server render.
                // AvatarUpload manages optimistic client state internally.
              }}
            />

            {/* Name / email */}
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <DisplayNameEdit initialName={user.name} />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}{' '}
                <Link
                  href="/settings"
                  className="text-xs text-gray-400 hover:text-gray-600 hover:underline focus:outline-none focus:underline dark:text-gray-500 dark:hover:text-gray-400"
                >
                  (change in settings)
                </Link>
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Joined {joinedDate}</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section
          aria-label="Statistics"
          className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2"
        >
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{savedCount}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Saved track{savedCount !== 1 ? 's' : ''}
            </p>
            <Link
              href="/library/tracks"
              className="mt-2 inline-block text-xs text-gray-400 hover:text-gray-600 hover:underline focus:outline-none focus:underline dark:text-gray-500 dark:hover:text-gray-400"
            >
              View library →
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {recentHistory.items.length}
              {recentHistory.nextCursor !== null ? '+' : ''}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tracks played</p>
            <Link
              href="/history"
              className="mt-2 inline-block text-xs text-gray-400 hover:text-gray-600 hover:underline focus:outline-none focus:underline dark:text-gray-500 dark:hover:text-gray-400"
            >
              View history →
            </Link>
          </div>
        </section>

        {/* Recent history */}
        <section aria-label="Recent listening history">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recently Played</h2>
            <Link
              href="/history"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline focus:outline-none focus:underline dark:text-gray-400 dark:hover:text-gray-300"
            >
              See all →
            </Link>
          </div>

          {recentHistory.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No history yet — play a track to get started.
            </p>
          ) : (
            <ol
              aria-label="Recent tracks"
              className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900"
            >
              {recentHistory.items.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {entry.track.title}
                    </p>
                  </div>
                  <time
                    dateTime={entry.playedAt}
                    className="shrink-0 text-xs text-gray-400 dark:text-gray-600"
                    title={new Date(entry.playedAt).toLocaleString()}
                  >
                    {new Date(entry.playedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </Container>
    </main>
  );
}
