import * as React from 'react';

/**
 * Pending count badge shown next to /mod nav links and main-nav "Mod" link.
 * Returns null when count is 0 to avoid visual noise.
 */
export function PendingCountBadge({ count, label }: { count: number; label?: string }): React.JSX.Element | null {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);
  return (
    <span
      className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold leading-none text-white"
      aria-label={label ?? `${count} pending`}
    >
      {display}
    </span>
  );
}
