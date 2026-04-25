import Link from 'next/link';
import { formatDuration } from '../lib/format-duration.js';

export interface TrackRowProps {
  slug: string;
  title: string;
  reciter: string;
  reciterSlug: string;
  poet?: string;
  duration?: number;
  plays?: number;
  /** Override the default /track/[slug] href. Use when callers need hierarchical URLs (e.g. /reciters/X/albums/Y/tracks/Z). */
  href?: string;
  /**
   * Optional ReactNode rendered as a leading column before the title.
   * Use for play/pause buttons, track numbers, drag handles. When provided,
   * the grid template grows by one auto-sized column at the start.
   */
  leadingSlot?: React.ReactNode;
}

function formatPlays(plays?: number): string {
  if (!plays) return '—';
  if (plays < 1000) return String(plays);
  return `${(plays / 1000).toFixed(1)}k`;
}

export function TrackRow({
  slug,
  title,
  reciter,
  reciterSlug,
  poet,
  duration,
  plays,
  href,
  leadingSlot,
}: TrackRowProps): React.JSX.Element {
  const titleHref = href ?? `/track/${slug}`;
  // When reciter is empty, drop the 180px reciter column entirely so the title
  // takes the freed space instead of leaving dead grid area on every row.
  const cols = ['1fr', reciter ? '180px' : null, '100px', '80px', '80px']
    .filter(Boolean)
    .join(' ');
  const gridTemplate = leadingSlot ? `auto ${cols}` : cols;
  return (
    <div
      className="grid items-center gap-4 py-3"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {leadingSlot && <div className="flex items-center">{leadingSlot}</div>}
      <Link
        href={titleHref}
        className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors"
      >
        {title}
      </Link>
      {reciter && (
        <Link
          href={`/reciters/${reciterSlug}`}
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          {reciter}
        </Link>
      )}
      <div className="text-sm text-[var(--text-faint)]">{poet || '—'}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatDuration(duration)}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatPlays(plays)}</div>
    </div>
  );
}
