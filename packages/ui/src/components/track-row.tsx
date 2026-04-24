import Link from 'next/link';

export interface TrackRowProps {
  slug: string;
  title: string;
  reciter: string;
  reciterSlug: string;
  poet?: string;
  duration: number;
  plays?: number;
}

function formatDuration(seconds: number): string {
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
}: TrackRowProps): React.JSX.Element {
  return (
    <div
      className="grid items-center gap-4 border-b border-[var(--border)] py-3"
      style={{ gridTemplateColumns: '1fr 180px 100px 80px 80px' }}
    >
      <Link
        href={`/track/${slug}`}
        className="text-sm font-medium text-[var(--text)] hover:text-[var(--accent)] transition-colors"
      >
        {title}
      </Link>
      <Link
        href={`/reciter/${reciterSlug}`}
        className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
      >
        {reciter}
      </Link>
      <div className="text-sm text-[var(--text-faint)]">{poet || '—'}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatDuration(duration)}</div>
      <div className="text-sm text-[var(--text-faint)]">{formatPlays(plays)}</div>
    </div>
  );
}
