import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AlbumCardSkeleton } from '../album-card-skeleton';

describe('AlbumCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<AlbumCardSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  it('is fully hidden from assistive technology', () => {
    const { container } = render(<AlbumCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a square artwork skeleton', () => {
    const { container } = render(<AlbumCardSkeleton />);
    const artwork = container.querySelector('.aspect-square');
    expect(artwork).not.toBeNull();
  });

  it('renders three metadata line skeletons', () => {
    const { container } = render(<AlbumCardSkeleton />);
    // artwork + 3 metadata lines = 4 total skeleton elements
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4);
  });
});
