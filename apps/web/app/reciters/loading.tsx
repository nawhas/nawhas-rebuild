import { Container } from '@/components/layout/container';
import { ReciterCardSkeleton } from '@/components/ui/reciter-card-skeleton';

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
              <ReciterCardSkeleton />
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
