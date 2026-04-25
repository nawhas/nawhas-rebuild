'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { TrackListItemDTO } from '@nawhas/types';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { useSession } from '@/lib/auth-client';
import { getRecentSavedTracks } from '@/server/actions/library';

const RECENT_SAVED_LIMIT = 6;

/**
 * Home-page "Recently Saved" strip.
 *
 * Renders the 6 most recently-saved tracks for the authenticated viewer
 * as a responsive card grid. Hidden entirely for unauthenticated users
 * and for signed-in users with an empty library — the goal is to reward
 * engagement, not to advertise the feature.
 *
 * Fetches via the `getRecentSavedTracks` server action (the frontend does
 * not use tRPC React Query client — server actions are the repo-wide
 * convention for user-scoped data from client components).
 *
 * Client Component — requires session awareness + client-side fetch.
 */
export function SavedStrip(): React.JSX.Element | null {
  const t = useTranslations('home.sections');
  const { data: session, isPending: sessionLoading } = useSession();
  const [tracks, setTracks] = useState<TrackListItemDTO[] | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session?.user) {
      setTracks(null);
      return;
    }
    let cancelled = false;
    getRecentSavedTracks(RECENT_SAVED_LIMIT).then((result) => {
      if (!cancelled) setTracks(result);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, sessionLoading]);

  if (!session?.user) return null;
  if (!tracks || tracks.length === 0) return null;

  const headingId = 'recently-saved-heading';

  return (
    <section aria-labelledby={headingId}>
      <SectionTitle id={headingId}>{t('recentlySaved')}</SectionTitle>

      <ul
        role="list"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
        {tracks.map((track) => (
          <li key={track.id}>
            <Link
              href={`/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`}
              className="group block rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              <div
                aria-hidden="true"
                className="aspect-square rounded-xl bg-[var(--surface)] transition group-hover:opacity-90"
              />
              <p className="mt-2 truncate text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)]">
                {track.title}
              </p>
              <p className="truncate text-xs text-[var(--text-dim)]">
                {track.reciterName}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
