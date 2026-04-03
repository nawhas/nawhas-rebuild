import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No results found"
        description="Try adjusting your search."
      />,
    );
    expect(screen.getByText('No results found')).toBeDefined();
    expect(screen.getByText('Try adjusting your search.')).toBeDefined();
  });

  it('renders action link when provided', () => {
    render(
      <EmptyState
        title="No reciters"
        description="There are no reciters yet."
        action={{ label: 'Browse all', href: '/reciters' }}
      />,
    );
    const link = screen.getByRole('link', { name: 'Browse all' });
    expect(link).toBeDefined();
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/reciters');
  });

  it('does not render action link when action is not provided', () => {
    render(
      <EmptyState title="Empty" description="Nothing here." />,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('has role=status for live region announcement', () => {
    const { container } = render(
      <EmptyState title="Empty" description="Nothing here." />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });
});
