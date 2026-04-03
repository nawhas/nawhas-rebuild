import { Container } from '@/components/layout/container';

function SkeletonTrackRow(): React.JSX.Element {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <div aria-hidden="true" className="h-4 w-6 animate-pulse rounded bg-gray-200" />
      <div aria-hidden="true" className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
      <div aria-hidden="true" className="h-3 w-10 animate-pulse rounded bg-gray-200" />
    </li>
  );
}

export default function AlbumLoading(): React.JSX.Element {
  return (
    <main className="py-10" aria-busy="true" aria-label="Loading album">
      <Container>
        {/* Album header skeleton */}
        <div className="flex flex-col items-center gap-6 py-8 sm:flex-row sm:items-start">
          {/* Cover art */}
          <div
            aria-hidden="true"
            className="h-48 w-48 shrink-0 animate-pulse rounded-lg bg-gray-200 sm:h-56 sm:w-56"
          />

          {/* Metadata */}
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div aria-hidden="true" className="h-9 w-64 animate-pulse rounded bg-gray-200" />
            <div aria-hidden="true" className="h-5 w-36 animate-pulse rounded bg-gray-200" />
            <div aria-hidden="true" className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        </div>

        {/* Track list skeleton */}
        <div className="mt-8">
          <div aria-hidden="true" className="mb-4 h-7 w-20 animate-pulse rounded bg-gray-200" />
          <ol
            role="list"
            className="divide-y divide-gray-100 rounded-lg border border-gray-200"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonTrackRow key={i} />
            ))}
          </ol>
        </div>
      </Container>
    </main>
  );
}
