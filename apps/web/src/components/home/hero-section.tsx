import { getTranslations } from 'next-intl/server';
import { SearchBar } from '@/components/search/search-bar';

/**
 * Home-page hero section.
 *
 * POC-styled red-gradient hero with serif slogan + hero-variant SearchBar.
 * The `font-serif` utility resolves to Fraunces after Phase A; no per-element
 * font override needed.
 *
 * Server Component — renders translated strings via `getTranslations`.
 */
export async function HeroSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('home.hero');

  return (
    <section
      aria-label={t('ariaLabel')}
      className="relative isolate overflow-hidden bg-gradient-to-br from-[var(--accent)] via-[var(--accent-soft)] to-[#7e1f1c] px-6 py-16 text-white md:py-24"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-serif text-[2.5rem] font-medium leading-tight tracking-normal md:text-[3.5rem]">
          {t('slogan')}
        </h1>
        <p className="mt-4 text-lg text-white/85">
          {t('subtitle')}
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchBar variant="hero" />
        </div>
      </div>
    </section>
  );
}
