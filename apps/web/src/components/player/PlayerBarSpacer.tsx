'use client';

import { selectCurrentTrack, usePlayerStore } from '@/store/player';

/**
 * Reserves vertical space equal to the PlayerBar's height when a track is
 * loaded. Without this spacer, the fixed-position PlayerBar occludes the
 * bottom of page content (e.g. the last row of a track list or the footer).
 *
 * Matches legacy nawhas.com's `.app--player-showing .main-container
 * { padding-bottom: 80px }` rule (nuxt/assets/app.scss#L27-31).
 */
export function PlayerBarSpacer(): React.JSX.Element | null {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  if (currentTrack === null) return null;
  return <div aria-hidden="true" className="h-20" />;
}
