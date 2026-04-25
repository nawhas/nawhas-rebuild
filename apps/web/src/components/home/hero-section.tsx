import { getTranslations } from 'next-intl/server';
import { SearchBar } from '@/components/search/search-bar';

/**
 * Home-page hero section.
 *
 * POC-styled dark hero with a layered red radial-gradient + soft noise circles
 * overlay, Inter sans-serif headline, and a centered hero search pill.
 */
export async function HeroSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('home.hero');

  return (
    <section
      aria-label={t('ariaLabel')}
      className="relative isolate overflow-hidden bg-[var(--bg)] text-white"
      style={{ padding: '140px 0 110px' }}
    >
      {/* Base gradient: red glow centered + diagonal dark wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(60,20,20,0.4) 0%, transparent 60%), linear-gradient(135deg, #1a0d0d 0%, #0a0a0b 60%, #0a0a0b 100%)',
        }}
      />
      {/* Noise circles — subtle highlights + a deeper accent glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 40%, rgba(255,255,255,0.04) 0%, transparent 20%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.03) 0%, transparent 25%), radial-gradient(circle at 50% 70%, rgba(201,48,44,0.08) 0%, transparent 40%)',
        }}
      />

      <div className="relative mx-auto max-w-[820px] px-8 text-center">
        <h1
          className="font-sans font-bold text-white"
          style={{
            fontSize: 'clamp(34px, 4.2vw, 52px)',
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            marginBottom: '36px',
          }}
        >
          {t('slogan')}
        </h1>

        <div className="mx-auto max-w-[540px]">
          <SearchBar variant="hero" />
        </div>
      </div>
    </section>
  );
}
