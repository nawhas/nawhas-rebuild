'use client';

import dynamic from 'next/dynamic';

/**
 * PlayerBarLazy — Client Component wrapper that lazy-loads PlayerBar.
 *
 * next/dynamic({ ssr: false }) requires the calling component to be a
 * Client Component, so this wrapper exists to allow layout.tsx (a Server
 * Component) to include a deferred PlayerBar without a build error.
 */
export const PlayerBarLazy = dynamic(
  () => import('./PlayerBar').then((m) => m.PlayerBar),
  { ssr: false },
);
