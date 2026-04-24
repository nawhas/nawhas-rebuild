'use client';

import { useState, useTransition, useMemo } from 'react';
import type { ReciterDTO } from '@nawhas/types';
import { ReciterCard } from '@/components/cards/reciter-card';
import { LoadMore } from '@/components/pagination/load-more';
import { fetchMoreReciters } from '@/server/actions/reciters';

interface ReciterGridProps {
  initialItems: ReciterDTO[];
  initialCursor: string | null;
}

/**
 * Group reciters by their first letter (A–Z, '#' for non-alpha leading char).
 */
function groupByLetter(reciters: ReciterDTO[]): Map<string, ReciterDTO[]> {
  const groups = new Map<string, ReciterDTO[]>();
  for (const reciter of reciters) {
    const first = reciter.name.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    const list = groups.get(letter) ?? [];
    list.push(reciter);
    groups.set(letter, list);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Paginated reciter grid with A–Z anchor navigation.
 *
 * Client Component — manages accumulated items + cursor for "Load More".
 * Reciters are grouped client-side by leading letter; the nav scrolls to
 * the corresponding `<section id="letter-X">` block.
 */
export function ReciterGrid({ initialItems, initialCursor }: ReciterGridProps): React.JSX.Element {
  const [items, setItems] = useState<ReciterDTO[]>(initialItems);
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
      {/* A–Z anchor nav */}
      <nav
        aria-label="Reciters by letter"
        className="sticky top-16 z-10 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--header-bg)] px-4 py-2 backdrop-blur"
      >
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="rounded px-2 py-1 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
            className="scroll-mt-24"
          >
            <h2
              id={`letter-${letter}-heading`}
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
