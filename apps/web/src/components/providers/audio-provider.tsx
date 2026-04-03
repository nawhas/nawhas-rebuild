'use client';

import { useEffect } from 'react';
import { audioEngine } from '@/lib/audio-engine';

/**
 * AudioProvider — mounts the Howler.js audio engine exactly once for the
 * entire session. Must be a Client Component so it runs only in the browser.
 *
 * Place this high in the component tree (e.g. root layout) so the engine
 * persists across all page navigations.
 */
export function AudioProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  useEffect(() => {
    audioEngine.init();
    return () => {
      audioEngine.destroy();
    };
  }, []);

  return <>{children}</>;
}
