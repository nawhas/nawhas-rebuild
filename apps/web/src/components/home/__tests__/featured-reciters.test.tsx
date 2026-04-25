import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// Stub ReciterCard to avoid pulling in ReciterAvatar / @nawhas/ui in this test
vi.mock('@/components/cards/reciter-card', () => ({
  ReciterCard: ({ reciter }: { reciter: { name: string; slug: string } }) => (
    <a href={`/reciters/${reciter.slug}`} aria-label={`View ${reciter.name}'s profile`}>
      {reciter.name}
    </a>
  ),
}));

// Stub @nawhas/ui/components/section-title — path import that isn't mocked globally
vi.mock('@nawhas/ui/components/section-title', () => ({
  SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id}>{children}</h2>
  ),
}));

import { FeaturedReciters } from '../featured-reciters';
import type { ReciterDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeReciter(id: string, name: string, slug: string): ReciterDTO {
  return {
    id,
    name,
    slug,
    country: null,
    birthYear: null,
    description: null,
    avatarUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as ReciterDTO;
}

describe('FeaturedReciters', () => {
  it('returns null when the reciters array is empty', () => {
    const { container } = render(<FeaturedReciters reciters={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the section heading', () => {
    render(
      <FeaturedReciters reciters={[makeReciter('r1', 'Ali Safdar', 'ali-safdar')]} />,
    );
    expect(screen.getByText('Featured Reciters')).toBeDefined();
  });

  it('renders one card per reciter', () => {
    const reciters = [
      makeReciter('r1', 'Ali Safdar', 'ali-safdar'),
      makeReciter('r2', 'Nadeem Sarwar', 'nadeem-sarwar'),
      makeReciter('r3', 'Syed Raza Abbas', 'syed-raza-abbas'),
    ];
    render(<FeaturedReciters reciters={reciters} />);
    expect(screen.getByText('Ali Safdar')).toBeDefined();
    expect(screen.getByText('Nadeem Sarwar')).toBeDefined();
    expect(screen.getByText('Syed Raza Abbas')).toBeDefined();
  });

  it('links to /reciters/[slug] for each reciter', () => {
    const reciters = [
      makeReciter('r1', 'Ali Safdar', 'ali-safdar'),
      makeReciter('r2', 'Nadeem Sarwar', 'nadeem-sarwar'),
    ];
    render(<FeaturedReciters reciters={reciters} />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/reciters/ali-safdar');
    expect(hrefs).toContain('/reciters/nadeem-sarwar');
  });
});
