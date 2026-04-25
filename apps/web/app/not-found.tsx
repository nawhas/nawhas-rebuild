import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/layout/container';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

/**
 * Global 404 page — rendered by Next.js whenever `notFound()` is called
 * or a route segment cannot be matched.
 *
 * Server Component.
 */
export default async function NotFound(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const t = await getTranslations('errors');

  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center py-16 px-6"
    >
      <Container size="sm">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Visual indicator */}
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface)] text-4xl font-bold text-[var(--text-dim)]"
          >
            404
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-[36px] font-medium text-[var(--text)]">
              {t('pageNotFound')}
            </h1>
            <p className="text-base text-[var(--text-dim)]">
              {t('pageNotFoundDescription')}
            </p>
          </div>

          <nav aria-label={t('recoveryNavLabel')} className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-[8px] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              {t('goToHome')}
            </Link>
            <Link
              href="/reciters"
              className="rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              {t('browseReciters')}
            </Link>
          </nav>
        </div>
      </Container>
    </main>
  );
}
