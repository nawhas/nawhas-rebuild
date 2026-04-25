'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { LyricDTO } from '@nawhas/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@nawhas/ui/components/tabs';
import { ArabicText } from '@/components/ui/arabic-text';
import { UrduText } from '@/components/ui/urdu-text';

/** Canonical display order for language tabs. */
const LANGUAGE_ORDER = ['ar', 'ur', 'en', 'transliteration'] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  ar: 'Arabic',
  ur: 'Urdu',
  en: 'English',
  transliteration: 'Romanized',
};

const STORAGE_KEY = 'nawhas-lyrics-language';

/** Returns the highest-priority available language (Arabic > Urdu > English > others). */
function getDefaultLanguage(available: string[]): string {
  for (const lang of LANGUAGE_ORDER) {
    if (available.includes(lang)) return lang;
  }
  return available[0] ?? 'en';
}

/** Builds an ordered list of language codes present in the lyrics array. */
function getAvailableLanguages(lyrics: LyricDTO[]): string[] {
  const known = LANGUAGE_ORDER.filter((lang) => lyrics.some((l) => l.language === lang));
  const unknown = lyrics
    .filter((l) => !(LANGUAGE_ORDER as readonly string[]).includes(l.language))
    .map((l) => l.language)
    .filter((lang, idx, arr) => arr.indexOf(lang) === idx); // dedupe
  return [...known, ...unknown];
}

interface LyricContentProps {
  lyric: LyricDTO;
}

/**
 * Map a LyricDTO language code to a BCP-47 `lang` attribute value.
 * Romanized content is Latin-script transliteration, so we expose it as
 * `en-Latn` to help screen readers pick an appropriate voice/pronunciation.
 */
function langAttrFor(language: string): string {
  if (language === 'transliteration') return 'en-Latn';
  return language;
}

function LyricContent({ lyric }: LyricContentProps): React.JSX.Element {
  if (lyric.language === 'ar') {
    return <ArabicText>{lyric.text}</ArabicText>;
  }
  if (lyric.language === 'ur') {
    return <UrduText>{lyric.text}</UrduText>;
  }
  // English, Romanized, or any unknown language — LTR with standard body font.
  // `lang` is required so screen readers switch to the correct pronunciation
  // model (Phase 2.3 Task 14, a11y audit Important finding).
  return (
    <p
      lang={langAttrFor(lyric.language)}
      className="whitespace-pre-wrap text-base leading-loose text-[var(--text)]"
    >
      {lyric.text}
    </p>
  );
}

interface LyricsDisplayProps {
  lyrics: LyricDTO[];
  /**
   * Track-edit URL — used by the inline "Edit lyrics" / "Add translation"
   * pills next to the language tabs and by the empty-state Contribute CTA.
   * Optional: when omitted the contribution affordances are not rendered.
   */
  editHref?: string;
}

/**
 * Displays track lyrics with a language tab switcher.
 * - Shows only tabs for language variants present on the track.
 * - Defaults to Arabic > Urdu > English.
 * - Persists the selected tab to localStorage so preference is remembered across tracks.
 * - English UI chrome is always LTR; RTL is scoped to individual content blocks.
 * - Uses the Radix-backed <Tabs> primitive (Phase 2.2 Task 6).
 * - Empty-state surface invites lyrics contribution rather than disappearing.
 *
 * NOTE: Timestamp-driven highlight/scroll-sync is parked for Phase 2.1c research.
 * The `LyricDTO` shape preserves any timestamp field it already carries; we just
 * don't consume it yet.
 *
 * Client Component — required for localStorage and tab interactivity.
 */
export function LyricsDisplay({ lyrics, editHref }: LyricsDisplayProps): React.JSX.Element {
  const t = useTranslations('trackDetail.lyrics');

  // Hooks FIRST (Rules of Hooks). The empty-state branch reuses the heading
  // shell so we still render a `<section>`, just with a CTA card body.
  const availableLanguages = useMemo(() => getAvailableLanguages(lyrics), [lyrics]);
  const defaultLanguage = useMemo(
    () => getDefaultLanguage(availableLanguages),
    [availableLanguages],
  );

  const [activeLanguage, setActiveLanguage] = useState<string>(defaultLanguage);

  // Restore persisted language preference after mount (avoids hydration mismatch).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && availableLanguages.includes(saved)) {
      setActiveLanguage(saved);
    }
  }, [availableLanguages]);

  function handleValueChange(lang: string): void {
    setActiveLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  const isEmpty = lyrics.length === 0;
  const showTabs = !isEmpty && availableLanguages.length > 1;

  return (
    <section aria-labelledby="lyrics-heading">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="lyrics-heading"
          className="font-serif text-[28px] font-normal tracking-[-0.02em] text-[var(--text)]"
        >
          {t('heading')}
        </h2>
        {!isEmpty && editHref !== undefined && (
          <div className="flex items-center gap-2">
            <Link
              href={editHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <PencilIcon />
              {t('editLyrics')}
            </Link>
            <Link
              href={editHref}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <span aria-hidden="true">+</span>
              {t('addTranslation')}
            </Link>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <p className="text-sm text-[var(--text-dim)]">{t('emptyTitle')}</p>
          {editHref !== undefined && (
            <Link
              href={editHref}
              className="mt-4 inline-flex items-center rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <span aria-hidden="true" className="mr-1.5">+</span>
              {t('contributeCta')}
            </Link>
          )}
        </div>
      ) : (
        <Tabs value={activeLanguage} onValueChange={handleValueChange}>
          {showTabs && (
            <TabsList
              aria-label="Lyrics language"
              className="mb-6 h-auto w-full justify-start gap-0 rounded-none border-b border-[var(--border)] bg-transparent p-0"
            >
              {availableLanguages.map((lang) => (
                <TabsTrigger
                  key={lang}
                  value={lang}
                  className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-[var(--text-dim)] shadow-none transition-colors hover:text-[var(--text)] data-[state=active]:border-[var(--accent)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--accent)] data-[state=active]:shadow-none"
                >
                  {LANGUAGE_LABELS[lang] ?? lang.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {availableLanguages.map((lang) => {
            const lyric = lyrics.find((l) => l.language === lang);
            if (!lyric) return null;
            return (
              <TabsContent key={lang} value={lang}>
                <LyricContent lyric={lyric} />
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </section>
  );
}

function PencilIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
