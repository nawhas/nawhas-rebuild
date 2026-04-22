import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '../skeleton';

describe('Skeleton', () => {
  it('renders a hidden div with animate-pulse', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-muted');
  });

  it('applies additional className', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-20');
  });

  it('is hidden from assistive technology', () => {
    render(<Skeleton />);
    // aria-hidden elements are not found by accessible queries — confirm none present
    const hidden = document.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
  });
});
