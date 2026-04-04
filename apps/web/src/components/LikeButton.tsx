'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from '@/lib/auth-client';
import { likeTrack, unlikeTrack, getIsLiked } from '@/server/actions/likes';

function ThumbUpIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return filled ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M9 21h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73V10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2zM9 9l4.34-4.34L12 10h9v2l-3 7H9V9zM1 9h4v12H1z" />
    </svg>
  );
}

interface LikeButtonProps {
  trackId: string;
  /** Pre-fetched like state from the server. If omitted, fetched on mount for authenticated users. */
  initialLiked?: boolean;
  className?: string;
}

/**
 * Thumb-up button that toggles a track's liked state.
 *
 * - Optimistic UI: state flips immediately; rolled back on server error.
 * - Unauthenticated click: redirects to /login?callbackUrl=<current-path>.
 * - If `initialLiked` is not provided, fetches state on mount for logged-in users.
 *
 * Client Component — requires interaction and auth session.
 */
export function LikeButton({ trackId, initialLiked, className = '' }: LikeButtonProps): React.JSX.Element {
  const t = useTranslations('common');
  const { data: session, isPending: sessionLoading } = useSession();
  const [isLiked, setIsLiked] = useState(initialLiked ?? false);
  const [stateLoaded, setStateLoaded] = useState(initialLiked !== undefined);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  // Fetch initial state from the server once the session is known.
  // Use session?.user?.id (stable string) rather than session?.user (object reference)
  // so the effect does not re-run when Better Auth returns a new session object for the
  // same user.  Also skip re-fetching while a like/unlike transition is in flight so a
  // slow getIsLiked response cannot race against and revert an optimistic update.
  useEffect(() => {
    if (sessionLoading) return;
    if (isPending) return;
    if (initialLiked !== undefined) {
      setStateLoaded(true);
      return;
    }
    if (!session?.user) {
      // Unauthenticated — state is always false, no fetch needed.
      setStateLoaded(true);
      return;
    }
    getIsLiked(trackId).then((liked) => {
      setIsLiked(liked);
      setStateLoaded(true);
    });
  }, [trackId, session?.user?.id, sessionLoading, isPending, initialLiked]);

  function handleClick(): void {
    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    const nextLiked = !isLiked;
    setIsLiked(nextLiked); // optimistic update
    startTransition(async () => {
      try {
        if (nextLiked) {
          await likeTrack(trackId);
        } else {
          await unlikeTrack(trackId);
        }
      } catch {
        setIsLiked(!nextLiked); // roll back on error
      }
    });
  }

  const label = isLiked ? t('unlike') : t('like');

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={isLiked}
      disabled={isPending}
      className={[
        'shrink-0 rounded p-1 transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900',
        stateLoaded ? 'opacity-100' : 'opacity-0',
        isLiked
          ? 'text-gray-900 hover:text-gray-600 dark:text-white dark:hover:text-gray-300'
          : 'text-gray-400 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-400',
        isPending ? 'pointer-events-none opacity-60' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ThumbUpIcon filled={isLiked} />
    </button>
  );
}
