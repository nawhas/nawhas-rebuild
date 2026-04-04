'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/container';

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
  useEffect(() => {
    // Log the error to the console for debugging; replace with a monitoring
    // service call (e.g. Sentry) once observability is wired up.
    console.error(error);
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
            className="flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-4xl font-bold text-red-300"
          >
            500
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300">
              An unexpected error occurred. Please try again or return to the
              home page.
            </p>
          </div>

          <nav aria-label="Recovery navigation" className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Go to home
            </Link>
          </nav>
        </div>
      </Container>
    </main>
  );
}
