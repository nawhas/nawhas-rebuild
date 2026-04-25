'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const LANGUAGES = ['en', 'ar', 'ur', 'transliteration'] as const;
type Language = (typeof LANGUAGES)[number];

export type LyricsMap = Partial<Record<Language, string>>;

interface LyricsTabsProps {
  value: LyricsMap;
  onChange: (next: LyricsMap) => void;
  disabled?: boolean;
}

const RTL = new Set<Language>(['ar', 'ur']);

/**
 * Tabbed multi-language lyrics editor.
 * Languages: English, Arabic, Urdu, Transliteration.
 * Dot indicator on a tab signals that language has content.
 * Empty tabs produce no lyrics row on apply; existing languages cleared to ""
 * delete the corresponding row.
 */
export function LyricsTabs({ value, onChange, disabled }: LyricsTabsProps): React.JSX.Element {
  const t = useTranslations('contribute.lyrics');
  const [active, setActive] = useState<Language>('en');

  function updateLang(lang: Language, text: string): void {
    onChange({ ...value, [lang]: text });
  }

  return (
    <div className="rounded-[8px] border border-[var(--border)]">
      <div role="tablist" aria-label={t('tablistLabel')} className="flex border-b border-[var(--border)]">
        {LANGUAGES.map((lang) => {
          const hasContent = (value[lang] ?? '').trim().length > 0;
          return (
            <button
              key={lang}
              type="button"
              role="tab"
              aria-selected={active === lang}
              aria-controls={`lyrics-panel-${lang}`}
              id={`lyrics-tab-${lang}`}
              onClick={() => setActive(lang)}
              className={`flex-1 px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 ${
                active === lang
                  ? 'border-b-2 border-[var(--accent)] text-[var(--text)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              {t(`lang_${lang}`)}
              {hasContent && (
                <span aria-hidden="true" className="ml-1 text-[var(--accent)]">
                  •
                </span>
              )}
            </button>
          );
        })}
      </div>
      {LANGUAGES.map((lang) => (
        <div
          key={lang}
          role="tabpanel"
          id={`lyrics-panel-${lang}`}
          aria-labelledby={`lyrics-tab-${lang}`}
          hidden={active !== lang}
          className="pt-4 p-3"
        >
          <textarea
            value={value[lang] ?? ''}
            onChange={(e) => updateLang(lang, e.target.value)}
            disabled={disabled}
            dir={RTL.has(lang) ? 'rtl' : 'ltr'}
            rows={12}
            placeholder={t(`placeholder_${lang}`)}
            className="w-full resize-y rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
            maxLength={20000}
          />
          <p className="mt-1 text-[13px] text-[var(--text-faint)]">
            {t('charCount', { count: (value[lang] ?? '').length, max: 20000 })}
          </p>
        </div>
      ))}
    </div>
  );
}
