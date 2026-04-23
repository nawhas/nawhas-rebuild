'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { searchReciters, searchAlbums } from '@/server/actions/contribute';

export interface ParentOption {
  id: string;
  /** Primary label (reciter name or album title). */
  label: string;
  /** Optional secondary label, e.g. reciter name for album options. */
  sublabel?: string;
  /** Optional group header, e.g. reciter name when grouping album results. */
  groupKey?: string;
}

interface ParentPickerProps {
  id: string;
  value: ParentOption | null;
  onChange: (opt: ParentOption | null) => void;
  kind: 'reciter' | 'album';
  disabled?: boolean;
  error?: string;
}

/**
 * Typeahead combobox for picking a parent entity.
 * kind='reciter': flat list of reciters.
 * kind='album':   albums grouped by reciter.
 *
 * Keyboard: ↓/↑ navigate, Enter selects, Esc closes.
 */
export function ParentPicker({
  id,
  value,
  onChange,
  kind,
  disabled,
  error,
}: ParentPickerProps): React.JSX.Element {
  const t = useTranslations('contribute.parentPicker');
  const [query, setQuery] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ParentOption[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search (200ms)
  useEffect(() => {
    if (!open || query.trim().length === 0) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        if (kind === 'reciter') {
          const rows = await searchReciters(query);
          setResults(rows.map((r) => ({ id: r.id, label: r.name })));
        } else {
          const rows = await searchAlbums(query);
          setResults(
            rows.map((r) => ({
              id: r.id,
              label: r.title,
              sublabel: r.reciterName,
              groupKey: r.reciterName,
            })),
          );
        }
        setActiveIdx(0);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, kind, open]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function pick(opt: ParentOption): void {
    onChange(opt);
    setQuery(opt.label);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = results[activeIdx];
      if (opt) pick(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={
          open && results[activeIdx] ? `${id}-opt-${activeIdx}` : undefined
        }
        autoComplete="off"
        value={query}
        placeholder={t(kind === 'reciter' ? 'placeholderReciter' : 'placeholderAlbum')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value && e.target.value !== value.label) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />
      {open && results.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg"
        >
          {renderGrouped(results, activeIdx, pick, id)}
        </ul>
      )}
      {open && query && results.length === 0 && (
        <p className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
          {t('noMatches')}
        </p>
      )}
    </div>
  );
}

function renderGrouped(
  results: ParentOption[],
  activeIdx: number,
  onPick: (opt: ParentOption) => void,
  idPrefix: string,
): React.JSX.Element[] {
  const hasGroups = results.some((r) => r.groupKey);
  if (!hasGroups) {
    return results.map((r, i) => (
      <li
        key={r.id}
        id={`${idPrefix}-opt-${i}`}
        role="option"
        aria-selected={i === activeIdx}
        className={`cursor-pointer px-3 py-2 text-sm ${i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
        onClick={() => onPick(r)}
      >
        {r.label}
      </li>
    ));
  }
  const groups = new Map<string, ParentOption[]>();
  for (const r of results) {
    const k = r.groupKey ?? '';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const rendered: React.JSX.Element[] = [];
  let flatIdx = 0;
  for (const [groupKey, opts] of groups.entries()) {
    rendered.push(
      <li
        key={`group-${groupKey}`}
        role="presentation"
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {groupKey}
      </li>,
    );
    for (const opt of opts) {
      const i = flatIdx;
      rendered.push(
        <li
          key={opt.id}
          id={`${idPrefix}-opt-${i}`}
          role="option"
          aria-selected={i === activeIdx}
          className={`cursor-pointer px-3 py-2 pl-6 text-sm ${i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
          onClick={() => onPick(opt)}
        >
          {opt.label}
        </li>,
      );
      flatIdx++;
    }
  }
  return rendered;
}
