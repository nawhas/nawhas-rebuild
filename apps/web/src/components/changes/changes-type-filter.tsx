'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

export type ChangesTypeFilterValue = 'reciter' | 'album' | 'track' | null;

interface ChangesTypeFilterProps {
  /** Currently-selected entity type (from the `?type=` query param), or null for "All Changes". */
  selected: ChangesTypeFilterValue;
}

/**
 * Right-rail filter for /changes — lets visitors scope the feed to a
 * single entity type (Reciters / Albums / Tracks) or see all changes.
 *
 * URL-driven: clicking a button pushes `?type=...` (or removes the
 * param for "All Changes"). The page is a Server Component, so the
 * router push triggers a fresh server-side fetch.
 *
 * Order matches the catalogue hierarchy (broadest → most granular):
 * All → Reciters → Albums → Tracks.
 *
 * Client Component — needs router/searchParams + a useTransition spinner.
 */
export function ChangesTypeFilter({ selected }: ChangesTypeFilterProps): React.JSX.Element {
  const t = useTranslations('changes.filter');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setFilter(next: ChangesTypeFilterValue): void {
    const params = new URLSearchParams(searchParams.toString());
    if (next === null) {
      params.delete('type');
    } else {
      params.set('type', next);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs.length > 0 ? `/changes?${qs}` : '/changes');
    });
  }

  const options: Array<{ value: ChangesTypeFilterValue; label: string }> = [
    { value: null, label: t('all') },
    { value: 'reciter', label: t('reciters') },
    { value: 'album', label: t('albums') },
    { value: 'track', label: t('tracks') },
  ];

  return (
    <aside aria-label={t('heading')} className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
        {t('heading')}
      </h2>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const isActive = opt.value === selected;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => setFilter(opt.value)}
              aria-pressed={isActive}
              disabled={isPending}
              className={[
                'rounded-md border px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
                isActive
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                  : 'border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[var(--border-strong)]',
                isPending ? 'opacity-60' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
