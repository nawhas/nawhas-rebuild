'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import Link from 'next/link';
import { useSearchAutocomplete } from '@/hooks/use-search-autocomplete';
import { HighlightedText, Spinner } from './search-bar';

// ---------------------------------------------------------------------------
// MobileSearchOverlay
// ---------------------------------------------------------------------------

/**
 * Mobile search experience — a search icon trigger (visible on `< md`)
 * that opens a full-screen overlay with an auto-focused input and grouped
 * autocomplete results.
 *
 * Uses the same `useSearchAutocomplete` hook as the desktop SearchBar to
 * avoid duplicating search logic.
 *
 * Accessibility:
 * - Overlay has `role="dialog"`, `aria-modal="true"`, and `aria-label`
 * - Focus is trapped within the overlay while open
 * - Escape closes the overlay and restores focus to the trigger button
 * - Screen reader announces the dialog via `role="dialog"`
 */
export function MobileSearchOverlay(): React.JSX.Element {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const {
    query,
    isOpen: dropdownOpen,
    setIsOpen: setDropdownOpen,
    activeIndex,
    isPending,
    hasResults,
    groupedSections,
    listboxId,
    activeOptionId,
    handleChange,
    handleKeyDown: hookKeyDown,
    closeDropdown,
    reset,
  } = useSearchAutocomplete();

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    reset();
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, [reset]);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (!overlayOpen) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [overlayOpen]);

  // Focus trap while overlay is open
  useEffect(() => {
    if (!overlayOpen) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const overlay = overlayRef.current;
      if (!overlay) return;

      const focusableEls = Array.from(
        overlay.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.tabIndex >= 0 && !el.hasAttribute('disabled'));

      if (!focusableEls.length) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [overlayOpen]);

  // Global Escape closes the overlay (handles focus outside the input too)
  useEffect(() => {
    if (!overlayOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeOverlay();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [overlayOpen, closeOverlay]);

  // Override the hook's Escape to close the whole overlay instead of just the dropdown
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeOverlay();
      return;
    }
    hookKeyDown(e);
  }

  return (
    <>
      {/* Trigger button — search icon, visible on mobile only */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOverlayOpen(true)}
        aria-label="Open search"
        aria-haspopup="dialog"
        className="rounded p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 md:hidden"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387A8 8 0 011 9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Full-screen overlay */}
      {overlayOpen && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="fixed inset-0 z-50 flex flex-col bg-white"
        >
          {/* Header row: input + close button */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            {/* Search icon */}
            <span className="flex-shrink-0 text-gray-400" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
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
              aria-expanded={dropdownOpen}
              aria-controls={dropdownOpen ? listboxId : undefined}
              aria-activedescendant={activeOptionId}
              aria-label="Search reciters, albums, and tracks"
              aria-busy={isPending}
              placeholder="Search…"
              value={query}
              onChange={handleChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => {
                if (query.trim()) setDropdownOpen(true);
              }}
              className="min-w-0 flex-1 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
            />

            {/* Close button */}
            <button
              type="button"
              onClick={closeOverlay}
              aria-label="Close search"
              className="flex-shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-y-auto">
            {dropdownOpen && (
              <div
                id={listboxId}
                role="listbox"
                aria-label="Search results"
              >
                {isPending ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-500" aria-live="polite">
                    <Spinner />
                    Searching…
                  </div>
                ) : !hasResults ? (
                  <div className="px-4 py-4 text-sm text-gray-500" aria-live="polite">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <>
                    {groupedSections.map((section) => (
                      <div key={section.key}>
                        <div
                          role="presentation"
                          aria-label={section.label}
                          className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
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
                            onClick={closeOverlay}
                            className={`flex flex-col px-4 py-3 text-sm outline-none transition-colors ${
                              activeIndex === globalIndex
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-700 active:bg-gray-100'
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
                        onClick={closeOverlay}
                        className="flex items-center gap-1 px-4 py-3 text-sm text-gray-500 active:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
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

            {/* Empty state — no query entered yet */}
            {!dropdownOpen && !query && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Start typing to search reciters, albums, and tracks
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
