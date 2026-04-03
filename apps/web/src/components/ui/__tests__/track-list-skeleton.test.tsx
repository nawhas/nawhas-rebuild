import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TrackListSkeleton } from '../track-list-skeleton';

describe('TrackListSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<TrackListSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  it('is fully hidden from assistive technology', () => {
    const { container } = render(<TrackListSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders 8 rows by default', () => {
    const { container } = render(<TrackListSkeleton />);
    // Each row has 3 skeleton divs (number + title + duration).
    // Plus 1 heading skeleton = 8*3 + 1 = 25 total animate-pulse divs.
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(25);
  });

  it('renders the specified number of rows', () => {
    const { container } = render(<TrackListSkeleton count={3} />);
    // 3 rows × 3 items + 1 heading = 10
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(10);
  });

  it('renders a bordered track list container', () => {
    const { container } = render(<TrackListSkeleton />);
    const list = container.querySelector('.rounded-lg.border');
    expect(list).not.toBeNull();
  });
});
