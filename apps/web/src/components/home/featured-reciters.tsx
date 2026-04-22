import type { ReciterDTO } from '@nawhas/types';
import { SectionTitle } from '@nawhas/ui/components/section-title';
import { ReciterCard } from '@/components/cards/reciter-card';

interface FeaturedRecitersProps {
  reciters: ReciterDTO[];
}

/**
 * Home page section showcasing featured reciters in a responsive grid.
 *
 * Server Component — pure presentation, no interactivity.
 */
export function FeaturedReciters({ reciters }: FeaturedRecitersProps): React.JSX.Element | null {
  if (reciters.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="featured-reciters-heading">
      <SectionTitle id="featured-reciters-heading">Featured Reciters</SectionTitle>

      <ul
        role="list"
        className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"
      >
        {reciters.map((reciter) => (
          <li key={reciter.id}>
            <ReciterCard reciter={reciter} />
          </li>
        ))}
      </ul>
    </section>
  );
}
