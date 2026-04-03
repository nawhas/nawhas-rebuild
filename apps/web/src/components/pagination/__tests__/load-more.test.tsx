import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { LoadMore } from '../load-more';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LoadMore', () => {
  it('renders a "Load More" button when not loading', () => {
    render(<LoadMore onLoadMore={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Load More' })).toBeDefined();
  });

  it('renders "Loading…" text while loading', () => {
    render(<LoadMore onLoadMore={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDefined();
  });

  it('calls onLoadMore when clicked', () => {
    const onLoadMore = vi.fn();
    render(<LoadMore onLoadMore={onLoadMore} isLoading={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('is disabled while loading', () => {
    render(<LoadMore onLoadMore={vi.fn()} isLoading={true} />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('is not disabled when not loading', () => {
    render(<LoadMore onLoadMore={vi.fn()} isLoading={false} />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('has aria-busy=true while loading', () => {
    render(<LoadMore onLoadMore={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });

  it('has aria-busy=false when not loading', () => {
    render(<LoadMore onLoadMore={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('false');
  });

  it('does not call onLoadMore when clicked while disabled', () => {
    const onLoadMore = vi.fn();
    render(<LoadMore onLoadMore={onLoadMore} isLoading={true} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
