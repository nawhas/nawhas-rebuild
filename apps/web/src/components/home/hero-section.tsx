import { getTranslations } from 'next-intl/server';
import { SearchBar } from '@/components/search/search-bar';

/**
 * Home-page hero section.
 *
 * Ports the legacy red-gradient hero surface (Phase 2.1 audit flagged the
 * rebuild as missing it — previously only an `sr-only h1`). The legacy
 * typography was a Roboto-200 thin display; Phase 2.2 resolved to replace
 * it with Bellefair serif at a contemporary medium weight for a richer,
 * more devotional feel while preserving the gradient + centered layout.
 *
 * Server Component — renders translated strings via `getTranslations`.
 */
export async function HeroSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('home.hero');

  return (
    <section
      aria-label={t('ariaLabel')}
      className="relative isolate overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 px-6 py-16 text-primary-foreground md:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-serif text-[2.5rem] font-medium leading-tight tracking-normal md:text-[3.5rem]">
          {t('slogan')}
        </h1>
        <p className="mt-4 text-lg text-primary-foreground/85">
          {t('subtitle')}
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar variant="hero" />
        </div>
      </div>
    </section>
  );
}
