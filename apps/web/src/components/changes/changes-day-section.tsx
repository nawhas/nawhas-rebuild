import { useTranslations, useFormatter } from 'next-intl';
import { ChangeRow } from './change-row';
import type { RecentChangeDTO } from '@nawhas/types';

function isSameUTCDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function dayLabel(
  date: Date,
  t: (k: string) => string,
  fmt: { dateTime: (d: Date) => string },
): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (isSameUTCDay(date, today)) return t('groupToday');
  if (isSameUTCDay(date, yesterday)) return t('groupYesterday');
  return fmt.dateTime(date);
}

export function ChangesDaySection({
  date,
  changes,
}: {
  date: Date;
  changes: RecentChangeDTO[];
}): React.JSX.Element {
  const t = useTranslations('changes');
  const fmt = useFormatter();
  return (
    <section className="border-t border-[var(--border)] py-6 first:border-t-0">
      <h2 className="sticky top-16 mb-3 bg-[var(--surface)] py-2 text-sm font-medium uppercase tracking-wide text-[var(--text-dim)]">
        {dayLabel(date, t, fmt)}
      </h2>
      <ol>
        {changes.map((c) => (
          <ChangeRow key={c.id} change={c} />
        ))}
      </ol>
    </section>
  );
}
