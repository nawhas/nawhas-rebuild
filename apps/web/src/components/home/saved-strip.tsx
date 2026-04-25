'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { TrackListItemDTO } from '@nawhas/types';
import { CoverArt } from '@nawhas/ui';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { useSession } from '@/lib/auth-client';
import { getRecentSavedTracks } from '@/server/actions/library';

const RECENT_SAVED_LIMIT = 6;

/**
 * Home-page "Recently Saved" strip.
 *
 * Always renders the section so the home page composition stays stable.
 * The body adapts to viewer state:
 *   - signed-out: empty state with a sign-in CTA
 *   - signed-in, no saves yet: empty state explaining how to save tracks
 *   - signed-in, has saves: 6-up responsive grid of cover-art cards
 *
 * Fetches via the `getRecentSavedTracks` server action (the frontend does
 * not use tRPC React Query client — server actions are the repo-wide
 * convention for user-scoped data from client components).
 *
 * Client Component — requires session awareness + client-side fetch.
 */
export function SavedStrip(): React.JSX.Element {
  const t = useTranslations('home.sections');
  const tNav = useTranslations('nav');
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

  const headingId = 'recently-saved-heading';
  const isSignedOut = !sessionLoading && !session?.user;
  const isAuthedEmpty = Boolean(session?.user) && tracks !== null && tracks.length === 0;
  const isAuthedLoaded = Boolean(session?.user) && tracks !== null && tracks.length > 0;

  return (
    <section aria-labelledby={headingId}>
      <SectionTitle id={headingId}>{t('recentlySaved')}</SectionTitle>

      {isAuthedLoaded ? (
        <ul
          role="list"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        >
          {tracks!.map((track) => (
            <li key={track.id}>
              <Link
                href={`/reciters/${track.reciterSlug}/albums/${track.albumSlug}/tracks/${track.slug}`}
                className="group block rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-3 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                <div className="aspect-square overflow-hidden rounded-xl">
                  <CoverArt slug={track.slug} fluid elevation="flat" />
                </div>
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
      ) : (
        <EmptyState
          title={isSignedOut ? t('savedEmptySignedOutTitle') : t('savedEmptyAuthedTitle')}
          body={isSignedOut ? t('savedEmptySignedOutBody') : t('savedEmptyAuthedBody')}
          showCta={isSignedOut}
          ctaHref="/login"
          ctaLabel={tNav('signIn')}
          // Render a neutral "loading" appearance while session/data resolves
          // so we don't flash the signed-out CTA at logged-in users.
          dimmed={!isSignedOut && !isAuthedEmpty}
        />
      )}
    </section>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  showCta: boolean;
  ctaHref: string;
  ctaLabel: string;
  /** Visually de-emphasises the empty state during transient loading. */
  dimmed: boolean;
}

function EmptyState({
  title,
  body,
  showCta,
  ctaHref,
  ctaLabel,
  dimmed,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-bg)] px-6 py-10 text-center transition-opacity ${dimmed ? 'opacity-60' : ''}`}
      aria-live="polite"
    >
      <BookmarkIcon />
      <p className="text-base font-semibold text-[var(--text)]">{title}</p>
      <p className="max-w-md text-sm text-[var(--text-dim)]">{body}</p>
      {showCta && (
        <Link
          href={ctaHref}
          className="mt-2 inline-flex items-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

function BookmarkIcon(): React.JSX.Element {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--text-dim)]"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
