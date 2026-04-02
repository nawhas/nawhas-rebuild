import { Container } from '@/components/layout/container';

function SkeletonCard(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg p-4">
      <div aria-hidden="true" className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
      <div aria-hidden="true" className="h-4 w-20 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export default function RecitersLoading(): React.JSX.Element {
  return (
    <main className="py-10" aria-busy="true" aria-label="Loading reciters">
      <Container>
        <div aria-hidden="true" className="mb-8 h-8 w-32 animate-pulse rounded bg-gray-200" />
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
