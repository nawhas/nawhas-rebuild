import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations('profile');
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  if (!sessionData?.session || !sessionData.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent('/profile')}`);
  }

  const caller = createCaller({
    db,
    session: sessionData.session,
    user: sessionData.user,
  });

  // Fetch saved-track count and recent history in parallel.
  const [savedCount, recentHistory] = await Promise.all([
    caller.library.count(),
    caller.history.list({ limit: 10 }),
  ]);

  const user = sessionData.user;
  const created = user.createdAt != null ? new Date(user.createdAt) : null;
  const joinedDate =
    created != null && !Number.isNaN(created.getTime())
      ? created.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
      : '—';

  return (
    <main id="main-content" className="py-10">
      <Container>
        <h1 className="sr-only">{t('pageTitle')}</h1>

        {/* Profile header card */}
        <section
          aria-label={t('profileSectionLabel')}
          className="mb-8 rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Avatar */}
            <AvatarUpload imageUrl={user.image ?? null} name={user.name} />

            {/* Name / email */}
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <DisplayNameEdit initialName={user.name} />
              <p className="text-sm text-[var(--text-dim)]">
                {user.email}{' '}
                <Link
                  href="/settings"
                  className="text-xs text-[var(--text-faint)] hover:text-[var(--text)] hover:underline focus:outline-none focus:underline"
                >
                  {t('changeInSettings')}
                </Link>
              </p>
              <p className="mt-1 text-xs text-[var(--text-faint)]">{t('joinedDate', { date: joinedDate })}</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section
          aria-label={t('statsSectionLabel')}
          className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-2"
        >
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm">
            <p className="text-3xl font-serif font-medium text-[var(--text)]">{savedCount}</p>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              {savedCount !== 1 ? t('savedTracksPlural') : t('savedTracksSingular')}
            </p>
            <Link
              href="/library/tracks"
              className="mt-2 inline-block text-xs text-[var(--text-faint)] hover:text-[var(--text)] hover:underline focus:outline-none focus:underline"
            >
              {t('viewLibrary')}
            </Link>
          </div>

          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-sm">
            <p className="text-3xl font-serif font-medium text-[var(--text)]">
              {recentHistory.items.length}
              {recentHistory.nextCursor !== null ? '+' : ''}
            </p>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t('tracksPlayed')}</p>
            <Link
              href="/history"
              className="mt-2 inline-block text-xs text-[var(--text-faint)] hover:text-[var(--text)] hover:underline focus:outline-none focus:underline"
            >
              {t('viewHistory')}
            </Link>
          </div>
        </section>

        {/* Recent history */}
        <section aria-label={t('recentHistoryLabel')}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-serif font-medium text-[var(--text)]">{t('recentlyPlayed')}</h2>
            <Link
              href="/history"
              className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:underline focus:outline-none focus:underline"
            >
              {t('seeAll')}
            </Link>
          </div>

          {recentHistory.items.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--text-dim)]">
              {t('noHistory')}
            </p>
          ) : (
            <ol
              aria-label={t('recentTracksLabel')}
              className="divide-y divide-[var(--border)] rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)]"
            >
              {recentHistory.items.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {entry.track.title}
                    </p>
                  </div>
                  <time
                    dateTime={entry.playedAt}
                    className="shrink-0 text-xs text-[var(--text-faint)]"
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
