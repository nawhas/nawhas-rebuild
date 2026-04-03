'use client';

import { useRef, useEffect, useId } from 'react';
import Link from 'next/link';
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
      className="h-4 w-4 animate-spin text-gray-400"
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
 * - Hidden on mobile (`hidden md:block`) — mobile search handled by MobileSearchOverlay
 */
export function SearchBar() {
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
    flatItems,
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

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        {/* Search icon */}
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
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
          aria-label="Search reciters, albums, and tracks"
          aria-busy={isPending}
          placeholder="Search…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          className="h-9 w-64 rounded-md border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {isPending ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500" aria-live="polite">
              <Spinner />
              Searching…
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-3 text-sm text-gray-500" aria-live="polite">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {groupedSections.map((section) => (
                <div key={section.key}>
                  <div
                    role="presentation"
                    aria-label={section.label}
                    className="bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500"
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
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium [&_mark]:bg-yellow-100 [&_mark]:text-gray-900">
                        <HighlightedText
                          {...(item.highlightSnippet !== undefined ? { snippet: item.highlightSnippet } : {})}
                          fallback={item.primaryText}
                        />
                      </span>
                      {item.secondaryText && (
                        <span className="text-xs text-gray-500">{item.secondaryText}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}

              {/* Search all link */}
              <div className="border-t border-gray-100">
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={closeDropdown}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                >
                  <span>See all results for &ldquo;{query}&rdquo;</span>
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
