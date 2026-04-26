'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, useTransition } from 'react';

interface YearFilterProps {
  /** All distinct years available in the catalogue, newest first. */
  years: number[];
  /** Currently-selected year (from the `?year=` query param), or null for "All Years". */
  selectedYear: number | null;
}

/**
 * Year filter dropdown for the /albums catalogue page.
 *
 * Selection drives the `?year=` query param; the page is a Server
 * Component so changing the param triggers a fresh server-side fetch
 * scoped to the chosen year. Empty value ("") clears the filter.
 *
 * Client Component — needs router/searchParams + a useTransition spinner.
 */
export function YearFilter({ years, selectedYear }: YearFilterProps): React.JSX.Element {
  const t = useTranslations('albumsPage.yearFilter');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const selectId = useId();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const next = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (next === '') {
      params.delete('year');
    } else {
      params.set('year', next);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs.length > 0 ? `/albums?${qs}` : '/albums');
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-xs uppercase tracking-[0.1em] text-[var(--text-faint)]"
      >
        {t('label')}
      </label>
      <select
        id={selectId}
        value={selectedYear ?? ''}
        onChange={handleChange}
        disabled={isPending}
        aria-busy={isPending}
        className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[13px] text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60 sm:w-56"
      >
        <option value="">{t('allYears')}</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
