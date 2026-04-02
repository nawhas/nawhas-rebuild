import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReciterCardSkeleton } from '../reciter-card-skeleton';

describe('ReciterCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ReciterCardSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  it('is fully hidden from assistive technology', () => {
    const { container } = render(<ReciterCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders an avatar-sized skeleton circle', () => {
    const { container } = render(<ReciterCardSkeleton />);
    const circle = container.querySelector('.rounded-full');
    expect(circle).not.toBeNull();
    expect(circle?.className).toContain('h-16');
    expect(circle?.className).toContain('w-16');
  });

  it('renders a name-line skeleton', () => {
    const { container } = render(<ReciterCardSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    // avatar + name = 2 skeleton elements
    expect(skeletons.length).toBe(2);
  });
});
