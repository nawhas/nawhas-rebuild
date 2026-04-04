'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import { usePlayerStore } from '@/store/player';
import { recordPlay } from '@/server/actions/history';

const DEDUP_WINDOW_MS = 30_000;

/**
 * Watches the player store for track changes and records play events in
 * listening history via the `history.record` server action.
 *
 * Guards:
 * - No-op when the user is unauthenticated or session is still loading.
 * - No-op when currentTrack is null.
 *
 * Client-side 30-second deduplication: if the same track is set again
 * within 30s of the last record call for that track, the call is skipped.
 * Server-side dedup provides an additional safety net.
 *
 * Mount this hook once in a always-rendered layout component (e.g. PlayerBar).
 * Errors are caught and logged — never propagated.
 */
export function useListeningHistory(): void {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const { data: session, isPending: sessionLoading } = useSession();

  // Map of trackId → timestamp of last successful recordPlay call.
  const lastRecordedAt = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (sessionLoading || !session?.user) return;
    if (!currentTrack) return;

    const trackId = currentTrack.id;
    const now = Date.now();
    const lastAt = lastRecordedAt.current.get(trackId) ?? 0;

    if (now - lastAt < DEDUP_WINDOW_MS) return;

    lastRecordedAt.current.set(trackId, now);

    recordPlay(trackId).catch((err) => {
      console.error('[useListeningHistory] Failed to record play:', err);
    });
  }, [currentTrack, session, sessionLoading]);
}
