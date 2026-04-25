import * as React from 'react';
import { cn } from '../lib/utils.js';

export type TrustLevel = 'new' | 'regular' | 'trusted' | 'maintainer';

const STYLES: Record<TrustLevel, string> = {
  new: '',
  regular: 'bg-[var(--surface-2)] text-[var(--text-dim)]',
  trusted: 'bg-[var(--accent-glow)] text-[var(--accent)]',
  maintainer: 'bg-[var(--accent-glow)] text-[var(--accent)]',
};

const LABELS: Record<TrustLevel, string> = {
  new: 'New',
  regular: 'Regular',
  trusted: 'Trusted',
  maintainer: 'Maintainer',
};

/**
 * Inline pill rendering a contributor's trust level.
 * Returns null for `new` (no visible pill — clean profile for new accounts).
 */
export function TrustLevelPill({
  level,
  className,
}: {
  level: TrustLevel;
  className?: string;
}): React.JSX.Element | null {
  if (level === 'new') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] px-3 py-1 text-[12px] font-medium capitalize',
        STYLES[level],
        className,
      )}
      aria-label={`${LABELS[level]} contributor`}
    >
      {LABELS[level]} contributor
    </span>
  );
}
