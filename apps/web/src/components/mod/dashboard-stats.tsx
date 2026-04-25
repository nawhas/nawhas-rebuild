import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Stats {
  pendingCount: number;
  last7DaysCount: number;
  last7DaysBuckets: number[];
  oldestPendingHours: number | null;
}

export function DashboardStats({ stats }: { stats: Stats }): React.JSX.Element {
  const t = useTranslations('mod.overview');
  const max = Math.max(1, ...stats.last7DaysBuckets);

  return (
    <ul className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <li>
        <Link
          href="/mod/queue"
          className="block rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6 transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          <p className="font-serif text-3xl font-medium text-[var(--text)]">{stats.pendingCount}</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {stats.pendingCount === 0 ? t('statPendingEmpty') : t('statPendingSubtitle')}
          </p>
        </Link>
      </li>
      <li className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <p className="font-serif text-3xl font-medium text-[var(--text)]">{stats.last7DaysCount}</p>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t('statRecentSubtitle')}</p>
        <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
          {stats.last7DaysBuckets.map((c, i) => (
            <div
              key={i}
              aria-label={`bar:${i}:${c}`}
              style={{ height: `${(c / max) * 100}%` }}
              className="w-3 rounded-sm bg-[var(--accent)]/70"
            />
          ))}
        </div>
        <table className="sr-only">
          <caption>{t('statRecentTitle')}</caption>
          <tbody>
            {stats.last7DaysBuckets.map((c, i) => (
              <tr key={i}>
                <th scope="row">{i}</th>
                <td>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </li>
      <li className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <p className="font-serif text-3xl font-medium text-[var(--text)]">
          {stats.oldestPendingHours === null
            ? '—'
            : stats.oldestPendingHours >= 24
              ? t('statOldestDays', { n: Math.floor(stats.oldestPendingHours / 24) })
              : t('statOldestHours', { n: Math.floor(stats.oldestPendingHours) })}
        </p>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          {stats.oldestPendingHours === null ? t('statOldestEmpty') : t('statOldestTitle')}
        </p>
      </li>
    </ul>
  );
}
