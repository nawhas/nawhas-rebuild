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
      className="flex flex-1 items-center justify-center py-20"
    >
      <Container size="sm">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Visual indicator */}
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-4xl font-bold text-muted-foreground"
          >
            404
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {t('pageNotFound')}
            </h1>
            <p className="text-base text-muted-foreground">
              {t('pageNotFoundDescription')}
            </p>
          </div>

          <nav aria-label={t('recoveryNavLabel')} className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-700 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              {t('goToHome')}
            </Link>
            <Link
              href="/reciters"
              className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              {t('browseReciters')}
            </Link>
          </nav>
        </div>
      </Container>
    </main>
  );
}
