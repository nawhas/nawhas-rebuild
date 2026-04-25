'use client';

import { useState, useEffect, useMemo } from 'react';
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
}

/**
 * Displays track lyrics with a language tab switcher.
 * - Shows only tabs for language variants present on the track.
 * - Defaults to Arabic > Urdu > English.
 * - Persists the selected tab to localStorage so preference is remembered across tracks.
 * - English UI chrome is always LTR; RTL is scoped to individual content blocks.
 * - Uses the Radix-backed <Tabs> primitive (Phase 2.2 Task 6).
 *
 * NOTE: Timestamp-driven highlight/scroll-sync is parked for Phase 2.1c research.
 * The `LyricDTO` shape preserves any timestamp field it already carries; we just
 * don't consume it yet.
 *
 * Client Component — required for localStorage and tab interactivity.
 */
export function LyricsDisplay({ lyrics }: LyricsDisplayProps): React.JSX.Element | null {
  // --- Hooks FIRST (Rules of Hooks) --------------------------------------
  // Previously this component returned null before the first useState/useEffect
  // call when `lyrics` was empty. That violated the Rules of Hooks and was
  // dormant only because the parent mounts us conditionally. Hooks now run
  // unconditionally; the empty-state return is moved AFTER them.

  const availableLanguages = useMemo(() => getAvailableLanguages(lyrics), [lyrics]);
  const defaultLanguage = useMemo(
    () => getDefaultLanguage(availableLanguages),
    [availableLanguages],
  );

  const [activeLanguage, setActiveLanguage] = useState<string>(defaultLanguage);

  // Restore persisted language preference after mount (avoids hydration mismatch).
  // Depends on `availableLanguages` so we only apply a saved value we can honour;
  // the useMemo above keeps the reference stable across renders for a given
  // `lyrics` input, so this does not re-fire unnecessarily.
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

  // --- Conditional return AFTER all hooks --------------------------------
  if (lyrics.length === 0) return null;

  const showTabs = availableLanguages.length > 1;

  return (
    <section aria-labelledby="lyrics-heading">
      <h2
        id="lyrics-heading"
        className="mb-6 font-serif text-2xl font-medium tracking-tight text-[var(--text)]"
      >
        Lyrics
      </h2>

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
    </section>
  );
}
