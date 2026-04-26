'use client';

import { useState, useTransition, useMemo } from 'react';
import type { ReciterFeaturedDTO } from '@nawhas/types';
import { ReciterCard } from '@/components/cards/reciter-card';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreReciters } from '@/server/actions/reciters';

interface ReciterGridProps {
  initialItems: ReciterFeaturedDTO[];
  initialCursor: string | null;
}

/**
 * Group reciters by their first letter (A–Z, '#' for non-alpha leading char).
 */
function groupByLetter(
  reciters: ReciterFeaturedDTO[],
): Map<string, ReciterFeaturedDTO[]> {
  const groups = new Map<string, ReciterFeaturedDTO[]>();
  for (const reciter of reciters) {
    const first = reciter.name.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    const list = groups.get(letter) ?? [];
    list.push(reciter);
    groups.set(letter, list);
  }
  return new Map(
    [...groups.entries()].sort(([a], [b]) => {
      // Put '#' (non-alpha bucket) at the end of the directory.
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    }),
  );
}

/**
 * Paginated reciter grid with A–Z anchor navigation.
 *
 * Client Component — manages accumulated items + cursor for "Load More".
 * Reciters are grouped client-side by leading letter; the nav scrolls to
 * the corresponding `<section id="letter-X">` block. Letter buttons use
 * the POC pill-button styling (bordered surface, accent on hover).
 */
export function ReciterGrid({ initialItems, initialCursor }: ReciterGridProps): React.JSX.Element {
  const [items, setItems] = useState<ReciterFeaturedDTO[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => groupByLetter(items), [items]);
  const letters = Array.from(groups.keys());

  function handleLoadMore(): void {
    if (!cursor) return;

    startTransition(async () => {
      const result = await fetchMoreReciters(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <div className="flex flex-col gap-12">
      {/* A–Z anchor nav — POC pill-button styling */}
      <nav
        aria-label="Reciters by letter"
        className="sticky top-16 z-10 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--header-bg)] px-3 py-2 backdrop-blur"
      >
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          >
            {letter}
          </a>
        ))}
      </nav>

      {/* Sections by letter */}
      {letters.map((letter) => {
        const sectionReciters = groups.get(letter) ?? [];
        return (
          <section
            key={letter}
            id={`letter-${letter}`}
            aria-label={`Reciters starting with ${letter}`}
            className="scroll-mt-32"
          >
            <h2
              className="mb-4 font-serif text-2xl font-medium text-[var(--text)]"
            >
              {letter}
            </h2>
            <ul
              role="list"
              className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
              aria-label={`Reciters starting with ${letter}`}
            >
              {sectionReciters.map((reciter) => (
                <li key={reciter.id}>
                  <ReciterCard reciter={reciter} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* Load More — sits below the alpha sections */}
      {cursor !== null && (
        <div className="mt-4 flex justify-center">
          <LoadMore onLoadMore={handleLoadMore} isLoading={isPending} />
        </div>
      )}
    </div>
  );
}
