'use client';

/**
 * PlayerPanels — lazy-loads QueuePanel and MobilePlayerOverlay so they are
 * excluded from the initial client bundle. Both components are hidden by
 * default and only become visible during active playback, so deferring them
 * reduces the First Load JS shared across all pages.
 */
import dynamic from 'next/dynamic';

const QueuePanel = dynamic(
  () => import('./QueuePanel').then((m) => m.QueuePanel),
  { ssr: false },
);

const MobilePlayerOverlay = dynamic(
  () => import('./MobilePlayerOverlay').then((m) => m.MobilePlayerOverlay),
  { ssr: false },
);

export function PlayerPanels(): React.JSX.Element {
  return (
    <>
      <QueuePanel />
      <MobilePlayerOverlay />
    </>
  );
}
