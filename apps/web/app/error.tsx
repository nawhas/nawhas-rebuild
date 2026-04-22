'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { clientLogger } from '@/lib/logger/client';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary — rendered by Next.js when an uncaught runtime error
 * occurs in a Server or Client Component during rendering.
 *
 * Must be a Client Component (Next.js requirement for error boundaries).
 */
export default function ErrorPage({ error, reset }: ErrorPageProps): React.JSX.Element {
  const t = useTranslations('errors');

  useEffect(() => {
    clientLogger.error('app.error_boundary', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

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
            className="flex h-24 w-24 items-center justify-center rounded-full bg-error-50 text-4xl font-bold text-error-400 dark:bg-error-950 dark:text-error-300"
          >
            500
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {t('somethingWentWrong')}
            </h1>
            <p className="text-base text-muted-foreground">
              {t('unexpectedError')}
            </p>
          </div>

          <nav aria-label={t('recoveryNavLabel')} className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-700 dark:hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              {t('tryAgain')}
            </button>
            <Link
              href="/"
              className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              {t('goToHome')}
            </Link>
          </nav>
        </div>
      </Container>
    </main>
  );
}
