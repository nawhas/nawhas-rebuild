'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface FilterValues {
  actor?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
}

interface Props {
  initial: FilterValues;
  actions: string[];
  onSubmit?: (next: FilterValues) => void;
}

const TARGET_TYPES = ['submission', 'reciter', 'album', 'track', 'user'] as const;

export function AuditFilters({ initial, actions, onSubmit }: Props): React.JSX.Element {
  const t = useTranslations('mod.audit');
  const router = useRouter();
  const [actor, setActor] = useState(initial.actor ?? '');
  const [action, setAction] = useState(initial.action ?? '');
  const [targetType, setTargetType] = useState(initial.targetType ?? '');
  const [from, setFrom] = useState(initial.from ?? '');
  const [to, setTo] = useState(initial.to ?? '');

  function apply(e: React.FormEvent): void {
    e.preventDefault();
    const next: FilterValues = {
      ...(actor ? { actor } : {}),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    };
    onSubmit?.(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => params.set(k, v as string));
    router.push(`/mod/audit?${params.toString()}`);
  }

  function clear(e: React.FormEvent): void {
    e.preventDefault();
    setActor('');
    setAction('');
    setTargetType('');
    setFrom('');
    setTo('');
    router.push('/mod/audit');
  }

  return (
    <form
      role="search"
      onSubmit={apply}
      onReset={clear}
      className="mb-6 grid grid-cols-1 gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <div className="flex flex-col">
        <label htmlFor="audit-filter-actor" className="text-[13px] text-[var(--text-dim)]">
          {t('filterActor')}
        </label>
        <input
          id="audit-filter-actor"
          type="text"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder={t('filterActorPlaceholder')}
          className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="audit-filter-action" className="text-[13px] text-[var(--text-dim)]">
          {t('filterAction')}
        </label>
        <select
          id="audit-filter-action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
        >
          <option value="">{t('filterActionAny')}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="audit-filter-target-type" className="text-[13px] text-[var(--text-dim)]">
          {t('filterTargetType')}
        </label>
        <select
          id="audit-filter-target-type"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
        >
          <option value="">{t('filterTargetTypeAny')}</option>
          {TARGET_TYPES.map((tt) => (
            <option key={tt} value={tt}>
              {tt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="audit-filter-from" className="text-[13px] text-[var(--text-dim)]">
          {t('filterFrom')}
        </label>
        <input
          id="audit-filter-from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="audit-filter-to" className="text-[13px] text-[var(--text-dim)]">
          {t('filterTo')}
        </label>
        <input
          id="audit-filter-to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
        />
      </div>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="rounded-[8px] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          {t('filterApply')}
        </button>
        <button
          type="reset"
          className="rounded-[8px] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)]"
        >
          {t('filterClear')}
        </button>
      </div>
    </form>
  );
}
