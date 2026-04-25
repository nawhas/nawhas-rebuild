'use client';

import { useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSearchAutocomplete } from '@/hooks/use-search-autocomplete';

// ---------------------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------------------

/**
 * Renders a Typesense highlight snippet which may contain <mark> tags.
 * Content originates from our own server — safe to use dangerouslySetInnerHTML.
 */
export function HighlightedText({ snippet, fallback }: { snippet?: string; fallback: string }) {
  if (!snippet) return <span>{fallback}</span>;
  return <span dangerouslySetInnerHTML={{ __html: snippet }} />;
}

export function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-[var(--text-dim)]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 3 12 3 12h1z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SearchBar
// ---------------------------------------------------------------------------

/**
 * Global search bar for the desktop header.
 *
 * - 200ms debounced autocomplete via `useSearchAutocomplete` shared hook
 * - Results grouped by Reciters / Albums / Tracks
 * - Full keyboard navigation: ArrowUp/Down, Enter, Escape, Tab
 * - WCAG 2.1 AA: combobox + listbox + option ARIA pattern
 * - `variant`:
 *   - `'default'` — compact header pill (h-9, md-only, fixed width)
 *   - `'hero'`    — enlarged hero pill (h-14, full-width, rounded-full, shadow)
 */
export interface SearchBarProps {
  /**
   * Visual variant.
   * - `'default'` (header): h-9, rounded-md, fixed 16rem width, hidden on mobile.
   * - `'hero'` (home): h-14, rounded-full, shadow-lg, full-width.
   */
  variant?: 'default' | 'hero';
}

export function SearchBar({ variant = 'default' }: SearchBarProps = {}) {
  const t = useTranslations('search');
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    isOpen,
    setIsOpen,
    activeIndex,
    isPending,
    hasResults,
    groupedSections,
    listboxId,
    activeOptionId,
    handleChange,
    handleKeyDown,
    closeDropdown,
  } = useSearchAutocomplete();

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeDropdown]);

  const isHero = variant === 'hero';
  const containerClass = isHero ? 'relative w-full' : 'relative hidden md:block';
  const iconWrapperClass = isHero
    ? 'pointer-events-none absolute inset-y-0 left-5 flex items-center text-[var(--text-dim)]'
    : 'pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--text-dim)]';
  const iconSize = isHero ? 20 : 16;
  const inputClass = isHero
    ? 'h-14 w-full rounded-full border border-transparent bg-[var(--card-bg)] pl-14 pr-6 text-base text-[var(--text)] placeholder:text-[var(--text-dim)] shadow-lg focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2'
    : 'h-9 w-64 rounded-md border border-[var(--border)] bg-[var(--card-bg)] pl-9 pr-4 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2';
  const listboxClass = isHero
    ? 'absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] shadow-menu'
    : 'absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] shadow-menu';

  return (
    <div ref={containerRef} className={containerClass}>
      <div className="relative">
        {/* Search icon */}
        <span className={iconWrapperClass} aria-hidden="true">
          <svg width={iconSize} height={iconSize} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387A8 8 0 011 9z"
              clipRule="evenodd"
            />
          </svg>
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-label={t('inputLabel')}
          aria-busy={isPending}
          placeholder={t('placeholder')}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          className={inputClass}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t('resultsLabel')}
          className={listboxClass}
        >
          {isPending ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--text-dim)]" aria-live="polite">
              <Spinner />
              {t('searching')}
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-3 text-sm text-[var(--text-dim)]" aria-live="polite">
              {t('noResults', { query })}
            </div>
          ) : (
            <>
              {groupedSections.map((section) => {
                const headerId = `${listboxId}-group-${section.key}`;
                return (
                <div key={section.key} role="group" aria-labelledby={headerId}>
                  <div
                    id={headerId}
                    className="bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]"
                  >
                    {section.label}
                  </div>
                  {section.items.map(({ item, globalIndex }) => (
                    <Link
                      key={item.id}
                      id={`${listboxId}-option-${globalIndex}`}
                      role="option"
                      aria-selected={activeIndex === globalIndex}
                      href={item.href}
                      onClick={closeDropdown}
                      className={`flex flex-col px-4 py-2 text-sm outline-none transition-colors ${
                        activeIndex === globalIndex
                          ? 'bg-[var(--surface-2)] text-[var(--text)]'
                          : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <span className="font-medium [&_mark]:bg-warning-200 [&_mark]:text-warning-950 dark:[&_mark]:bg-warning-800 dark:[&_mark]:text-warning-50">
                        <HighlightedText
                          {...(item.highlightSnippet !== undefined ? { snippet: item.highlightSnippet } : {})}
                          fallback={item.primaryText}
                        />
                      </span>
                      {item.secondaryText && (
                        <span className="text-xs text-[var(--text-dim)]">{item.secondaryText}</span>
                      )}
                    </Link>
                  ))}
                </div>
                );
              })}

              {/* Search all link */}
              <div className="border-t border-[var(--border)]">
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={closeDropdown}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
                >
                  <span>{t('seeAllResults', { query })}</span>
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
