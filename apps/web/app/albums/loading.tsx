import { Container } from '@/components/layout/container';

function SkeletonCard(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-lg">
      {/* Artwork placeholder */}
      <div aria-hidden="true" className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
      {/* Title placeholder */}
      <div className="flex flex-col gap-1.5">
        <div aria-hidden="true" className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div aria-hidden="true" className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        <div aria-hidden="true" className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function AlbumsLoading(): React.JSX.Element {
  return (
    <main className="py-10" aria-busy="true" aria-label="Loading albums">
      <Container>
        <div aria-hidden="true" className="mb-8 h-8 w-28 animate-pulse rounded bg-gray-200" />
        <ul
          role="list"
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
