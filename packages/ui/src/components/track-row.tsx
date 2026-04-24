import Link from 'next/link';

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

function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
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
  const gridTemplate = leadingSlot
    ? 'auto 1fr 180px 100px 80px 80px'
    : '1fr 180px 100px 80px 80px';
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
      {reciter ? (
        <Link
          href={`/reciter/${reciterSlug}`}
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          {reciter}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="text-sm text-[var(--text-faint)]">{poet || '—'}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatDuration(duration)}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatPlays(plays)}</div>
    </div>
  );
}
