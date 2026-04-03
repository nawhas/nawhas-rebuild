'use client';

import { useState, useEffect } from 'react';
import type { LyricDTO } from '@nawhas/types';
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

function LyricContent({ lyric }: LyricContentProps): React.JSX.Element {
  if (lyric.language === 'ar') {
    return <ArabicText>{lyric.text}</ArabicText>;
  }
  if (lyric.language === 'ur') {
    return <UrduText>{lyric.text}</UrduText>;
  }
  // English, Romanized, or any unknown language — LTR with standard body font
  return (
    <p className="whitespace-pre-wrap text-base leading-loose text-neutral-800">
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
 *
 * Client Component — required for localStorage and tab interactivity.
 */
export function LyricsDisplay({ lyrics }: LyricsDisplayProps): React.JSX.Element | null {
  if (lyrics.length === 0) return null;

  const availableLanguages = getAvailableLanguages(lyrics);
  const defaultLanguage = getDefaultLanguage(availableLanguages);

  const [activeLanguage, setActiveLanguage] = useState<string>(defaultLanguage);

  // Restore persisted language preference after mount (avoids hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && availableLanguages.includes(saved)) {
      setActiveLanguage(saved);
    }
  }, []);

  function handleTabChange(lang: string): void {
    setActiveLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  const showTabs = availableLanguages.length > 1;

  return (
    <section aria-labelledby="lyrics-heading">
      <h2 id="lyrics-heading" className="mb-6 text-xl font-semibold text-neutral-900">
        Lyrics
      </h2>

      {showTabs && (
        <div
          role="tablist"
          aria-label="Lyrics language"
          className="mb-6 flex gap-0 border-b border-neutral-200"
        >
          {availableLanguages.map((lang) => (
            <button
              key={lang}
              role="tab"
              aria-selected={lang === activeLanguage}
              aria-controls={`lyrics-panel-${lang}`}
              id={`lyrics-tab-${lang}`}
              onClick={() => handleTabChange(lang)}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
                lang === activeLanguage
                  ? 'border-b-2 border-primary-600 text-primary-700'
                  : 'text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {LANGUAGE_LABELS[lang] ?? (lang as string).toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {availableLanguages.map((lang) => {
        const lyric = lyrics.find((l) => l.language === lang);
        if (!lyric) return null;

        return (
          <div
            key={lang}
            role={showTabs ? 'tabpanel' : undefined}
            id={showTabs ? `lyrics-panel-${lang}` : undefined}
            aria-labelledby={showTabs ? `lyrics-tab-${lang}` : undefined}
            hidden={lang !== activeLanguage}
          >
            <LyricContent lyric={lyric} />
          </div>
        );
      })}
    </section>
  );
}
