import type { LyricDTO } from '@nawhas/types';

/** Human-readable labels for lyric language codes. */
const LANGUAGE_LABELS: Record<string, string> = {
  ar: 'Arabic',
  en: 'English',
  ur: 'Urdu',
  transliteration: 'Transliteration',
};

function getLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language.toUpperCase();
}

interface LyricsDisplayProps {
  lyrics: LyricDTO[];
}

/**
 * Displays track lyrics with appropriate directionality per language.
 * Arabic and Urdu are rendered RTL with the Noto Naskh Arabic font.
 *
 * Full multilingual tab UI is in NAW-56.
 *
 * Server Component — no interactivity required.
 */
export function LyricsDisplay({ lyrics }: LyricsDisplayProps): React.JSX.Element | null {
  if (lyrics.length === 0) return null;

  return (
    <section aria-labelledby="lyrics-heading">
      <h2 id="lyrics-heading" className="mb-6 text-xl font-semibold text-gray-900">
        Lyrics
      </h2>

      <div className="space-y-10">
        {lyrics.map((lyric) => {
          const isRtl = lyric.language === 'ar' || lyric.language === 'ur';
          const isArabic = lyric.language === 'ar';

          return (
            <div key={lyric.id}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {getLanguageLabel(lyric.language)}
              </h3>
              <div
                dir={isRtl ? 'rtl' : 'ltr'}
                lang={lyric.language === 'transliteration' ? undefined : lyric.language}
                className={[
                  'whitespace-pre-wrap leading-loose text-gray-800',
                  isArabic ? 'font-arabic text-2xl' : 'text-base',
                ]
                  .join(' ')
                  .trim()}
              >
                {lyric.text}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
