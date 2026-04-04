import { Container } from '@/components/layout/container';

const LYRIC_LINE_WIDTHS = [80, 65, 90, 55, 75, 85, 60, 70, 80, 50, 75, 65];

export default function TrackLoading(): React.JSX.Element {
  return (
    <main className="py-10" aria-busy="true" aria-label="Loading track">
      <Container size="md">
        {/* Track header skeleton */}
        <div className="py-8 flex flex-col gap-3">
          <div aria-hidden="true" className="h-9 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div aria-hidden="true" className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Audio player reserved space skeleton */}
        <div aria-hidden="true" className="mt-2 h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />

        {/* Lyrics skeleton */}
        <div className="mt-10">
          <div aria-hidden="true" className="mb-6 h-7 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            {LYRIC_LINE_WIDTHS.map((width, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-5 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}
