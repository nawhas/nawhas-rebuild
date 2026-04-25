import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PendingCountBadge } from '../pending-count-badge';

afterEach(() => {
  cleanup();
});

describe('<PendingCountBadge>', () => {
  it('returns null on count=0', () => {
    const { container } = render(<PendingCountBadge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on negative count', () => {
    const { container } = render(<PendingCountBadge count={-3} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the count', () => {
    const { getByText } = render(<PendingCountBadge count={5} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('clamps to 99+ for large counts', () => {
    const { getByText } = render(<PendingCountBadge count={100} />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('uses custom aria-label', () => {
    const { container } = render(<PendingCountBadge count={3} label="3 items pending review" />);
    expect((container.firstChild as HTMLElement | null)?.getAttribute('aria-label')).toBe(
      '3 items pending review',
    );
  });
});
