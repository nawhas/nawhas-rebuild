import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@nawhas/ui', () => ({
  ReciterAvatar: ({ name }: { name: string }) => <div data-testid={`avatar-${name}`} />,
}));

vi.mock('@nawhas/ui/components/section-title', () => ({
  SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h2 id={id}>{children}</h2>
  ),
}));

import { FeaturedReciters } from '../featured-reciters';
import type { ReciterFeaturedDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeReciter(
  id: string,
  name: string,
  slug: string,
  overrides: Partial<ReciterFeaturedDTO> = {},
): ReciterFeaturedDTO {
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
    albumCount: 0,
    trackCount: 0,
    ...overrides,
  } as ReciterFeaturedDTO;
}

describe('FeaturedReciters', () => {
  it('returns null when the reciters array is empty', () => {
    const { container } = render(<FeaturedReciters reciters={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the "Top Reciters" section heading', () => {
    render(
      <FeaturedReciters reciters={[makeReciter('r1', 'Ali Safdar', 'ali-safdar')]} />,
    );
    expect(screen.getByText('Top Reciters')).toBeDefined();
  });

  it('renders one entry per reciter with name + counts subtitle', () => {
    const reciters = [
      makeReciter('r1', 'Ali Safdar', 'ali-safdar', { albumCount: 12, trackCount: 84 }),
      makeReciter('r2', 'Nadeem Sarwar', 'nadeem-sarwar', { albumCount: 25, trackCount: 200 }),
    ];
    render(<FeaturedReciters reciters={reciters} />);
    expect(screen.getByText('Ali Safdar')).toBeDefined();
    expect(screen.getByText('Nadeem Sarwar')).toBeDefined();
    expect(screen.getByText('12 albums · 84 tracks')).toBeDefined();
    expect(screen.getByText('25 albums · 200 tracks')).toBeDefined();
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
