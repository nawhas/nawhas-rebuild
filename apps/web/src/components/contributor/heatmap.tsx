'use client';

import * as React from 'react';
import type { ContributorHeatmapBucketDTO } from '@nawhas/types';

function getColor(count: number, max: number): string {
  if (count === 0) return 'var(--surface-2)';
  const ratio = max > 0 ? count / max : 0;
  if (ratio < 0.2) return 'rgba(201, 48, 44, 0.2)';
  if (ratio < 0.4) return 'rgba(201, 48, 44, 0.4)';
  if (ratio < 0.6) return 'rgba(201, 48, 44, 0.6)';
  if (ratio < 0.8) return 'rgba(201, 48, 44, 0.8)';
  return 'rgba(201, 48, 44, 1)';
}

/**
 * Year-long contribution heatmap (52 weeks × 7 days).
 * Buckets are sparse from the server; this component fills the grid
 * with zeros for missing days. Includes a screen-reader-only table mirror
 * for a11y per the mod dashboard sparkline pattern.
 */
export function Heatmap({
  buckets,
  year,
}: {
  buckets: ContributorHeatmapBucketDTO[];
  year: number;
}): React.JSX.Element {
  // Build a Map for O(1) lookup.
  const counts = new Map<string, number>();
  let max = 0;
  for (const b of buckets) {
    counts.set(b.date, b.count);
    if (b.count > max) max = b.count;
  }

  // First Sunday on or before Jan 1 of the year.
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const firstSunday = new Date(yearStart);
  firstSunday.setUTCDate(yearStart.getUTCDate() - yearStart.getUTCDay());

  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let w = 0; w < 53; w++) {
    const week: Array<{ date: string; count: number }> = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(firstSunday);
      day.setUTCDate(firstSunday.getUTCDate() + w * 7 + d);
      if (day.getUTCFullYear() !== year) {
        // Pad with nulls (rendered as transparent cells).
        week.push({ date: '', count: 0 });
      } else {
        const key = day.toISOString().slice(0, 10);
        week.push({ date: key, count: counts.get(key) ?? 0 });
      }
    }
    weeks.push(week);
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, 14px)` }}
        role="img"
        aria-label={`Contribution activity heatmap for ${year}`}
      >
        {weeks.map((week, wi) =>
          week.map((cell, di) =>
            cell.date === '' ? (
              <div key={`pad-${wi}-${di}`} className="h-[14px] w-[14px]" aria-hidden="true" />
            ) : (
              <div
                key={`${wi}-${di}`}
                className="h-[14px] w-[14px] rounded-[2px] border border-[var(--border)]"
                style={{ background: getColor(cell.count, max) }}
                title={`${cell.date}: ${cell.count} contribution${cell.count === 1 ? '' : 's'}`}
              />
            ),
          ),
        )}
      </div>
      {/* SR-only mirror table — totals only, since the per-day grid is too noisy. */}
      <table className="sr-only">
        <caption>Contribution counts by date for {year}</caption>
        <thead><tr><th>Date</th><th>Count</th></tr></thead>
        <tbody>
          {[...counts.entries()].map(([date, count]) => (
            <tr key={date}><td>{date}</td><td>{count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
