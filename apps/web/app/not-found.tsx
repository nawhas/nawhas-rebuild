import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

/**
 * Global 404 page — rendered by Next.js whenever `notFound()` is called
 * or a route segment cannot be matched.
 *
 * Server Component.
 */
export default function NotFound(): React.JSX.Element {
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
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-4xl font-bold text-gray-400"
          >
            404
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              Page not found
            </h1>
            <p className="text-base text-gray-600">
              We couldn&apos;t find the page you&apos;re looking for. It may
              have been moved or doesn&apos;t exist.
            </p>
          </div>

          <nav aria-label="Recovery navigation" className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              Go to home
            </Link>
            <Link
              href="/reciters"
              className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              Browse reciters
            </Link>
          </nav>
        </div>
      </Container>
    </main>
  );
}
