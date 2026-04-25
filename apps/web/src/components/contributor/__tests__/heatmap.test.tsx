import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Heatmap } from '../heatmap';

afterEach(() => {
  cleanup();
});

describe('<Heatmap>', () => {
  it('renders 52-53 weeks worth of cells', () => {
    const { container } = render(<Heatmap buckets={[]} year={2026} />);
    const grid = container.querySelector('[role="img"]');
    expect(grid).not.toBeNull();
    // 52 or 53 weeks * 7 days = 364 or 371 cells (incl. padding)
    const cells = grid?.children.length ?? 0;
    expect(cells).toBeGreaterThan(363);
  });

  it('marks days with submissions via title', () => {
    const { container } = render(<Heatmap buckets={[{ date: '2026-04-25', count: 3 }]} year={2026} />);
    const cells = container.querySelectorAll('[title*="2026-04-25"]');
    expect(cells.length).toBe(1);
    expect(cells[0]?.getAttribute('title')).toContain('3 contributions');
  });

  it('exposes a screen-reader-only table mirror', () => {
    const { container } = render(<Heatmap buckets={[{ date: '2026-04-25', count: 1 }]} year={2026} />);
    const table = container.querySelector('table.sr-only');
    expect(table).not.toBeNull();
  });
});
