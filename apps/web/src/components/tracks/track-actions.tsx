'use client';

import { SaveButton } from '@/components/SaveButton';
import { LikeButton } from '@/components/LikeButton';

interface TrackActionsProps {
  trackId: string;
}

/**
 * Save and Like buttons for the track detail page.
 *
 * Separated into its own Client Component so the parent page
 * (a Server Component) does not need to become a Client Component.
 */
export function TrackActions({ trackId }: TrackActionsProps): React.JSX.Element {
  return (
    <div className="mt-4 flex items-center gap-2">
      <SaveButton trackId={trackId} className="hover:bg-muted" />
      <LikeButton trackId={trackId} className="hover:bg-muted" />
    </div>
  );
}
