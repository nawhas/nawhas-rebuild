'use client';

import { useEffect } from 'react';

/**
 * Blocks navigation away from the page when `enabled` is true.
 * Uses the standard beforeunload API — browsers show a generic prompt.
 */
export function useUnsavedChangesGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: BeforeUnloadEvent): void {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
