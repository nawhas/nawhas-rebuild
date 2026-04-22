'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { useSession } from '@/lib/auth-client';
import { buildLoginHref } from '@/lib/auth-reason';
import { saveTrack, unsaveTrack, getIsSaved } from '@/server/actions/library';

function HeartIcon({ filled }: { filled: boolean }): React.JSX.Element {
  return filled ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
    </svg>
  );
}

interface SaveButtonProps {
  trackId: string;
  /** Pre-fetched save state from the server. If omitted, fetched on mount for authenticated users. */
  initialSaved?: boolean;
  /** Called after a successful (or optimistic) state change. Receives the new saved state. */
  onSavedChange?: (saved: boolean) => void;
  className?: string;
}

/**
 * Heart button that toggles a track's saved state in the user's library.
 *
 * - Optimistic UI: state flips immediately; rolled back on server error.
 * - Unauthenticated click: redirects to /login?callbackUrl=<current-path>&reason=save
 *   so the login page can show contextual copy ("Sign in to save this track").
 * - If `initialSaved` is not provided, fetches state on mount for logged-in users.
 *
 * Client Component — requires interaction and auth session.
 */
export function SaveButton({ trackId, initialSaved, onSavedChange, className = '' }: SaveButtonProps): React.JSX.Element {
  const t = useTranslations('common');
  const { data: session, isPending: sessionLoading } = useSession();
  const [isSaved, setIsSaved] = useState(initialSaved ?? false);
  const [stateLoaded, setStateLoaded] = useState(initialSaved !== undefined);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  // Fetch initial state from the server once the session is known.
  // Use session?.user?.id (stable string) rather than session?.user (object reference)
  // so the effect does not re-run when Better Auth returns a new session object for the
  // same user.  Also skip re-fetching while a save/unsave transition is in flight so a
  // slow getIsSaved response cannot race against and revert an optimistic update.
  useEffect(() => {
    if (sessionLoading) return;
    if (isPending) return;
    if (initialSaved !== undefined) {
      setStateLoaded(true);
      return;
    }
    if (!session?.user) {
      // Unauthenticated — state is always false, no fetch needed.
      setStateLoaded(true);
      return;
    }
    getIsSaved(trackId).then((saved) => {
      setIsSaved(saved);
      setStateLoaded(true);
    });
  }, [trackId, session?.user?.id, sessionLoading, isPending, initialSaved]);

  function handleClick(): void {
    if (!session?.user) {
      router.push(buildLoginHref({ callbackUrl: pathname ?? '/', reason: 'save' }));
      return;
    }
    const nextSaved = !isSaved;
    setIsSaved(nextSaved); // optimistic update
    onSavedChange?.(nextSaved);
    startTransition(async () => {
      try {
        if (nextSaved) {
          await saveTrack(trackId);
        } else {
          await unsaveTrack(trackId);
        }
      } catch {
        setIsSaved(!nextSaved); // roll back on error
        onSavedChange?.(!nextSaved);
      }
    });
  }

  const label = isSaved ? t('unsave') : t('save');

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={isSaved}
      disabled={isPending}
      className={[
        'h-auto w-auto shrink-0 rounded p-1 transition-all focus:ring-2 focus:ring-inset focus:ring-ring',
        stateLoaded ? 'opacity-100' : 'opacity-0',
        isSaved
          ? 'text-foreground hover:bg-transparent hover:text-foreground/70'
          : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
        isPending ? 'pointer-events-none opacity-60' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <HeartIcon filled={isSaved} />
    </Button>
  );
}
