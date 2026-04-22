import { Container } from '@/components/layout/container';
import { AlbumCardSkeleton } from '@/components/ui/album-card-skeleton';

export default function AlbumsLoading(): React.JSX.Element {
  return (
    <main className="py-10" aria-busy="true" aria-label="Loading albums">
      <Container>
        <div aria-hidden="true" className="mb-8 h-8 w-28 animate-pulse rounded bg-muted" />
        <ul
          role="list"
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <li key={i}>
              <AlbumCardSkeleton />
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
