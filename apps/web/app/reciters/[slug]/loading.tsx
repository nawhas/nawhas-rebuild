import { Container } from '@/components/layout/container';

function SkeletonAlbumCard(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
      <div className="flex flex-col gap-1.5">
        <div aria-hidden="true" className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div aria-hidden="true" className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function ReciterLoading(): React.JSX.Element {
  return (
    <main className="py-10" aria-busy="true" aria-label="Loading reciter profile">
      <Container>
        {/* Header skeleton */}
        <div className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:items-start">
          <div aria-hidden="true" className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-gray-200" />
          <div className="flex flex-col gap-2">
            <div aria-hidden="true" className="h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div aria-hidden="true" className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        </div>

        {/* Discography skeleton */}
        <div className="mt-8">
          <div aria-hidden="true" className="mb-6 h-7 w-36 animate-pulse rounded bg-gray-200" />
          <ul
            role="list"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {Array.from({ length: 10 }, (_, i) => (
              <li key={i}>
                <SkeletonAlbumCard />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </main>
  );
}
