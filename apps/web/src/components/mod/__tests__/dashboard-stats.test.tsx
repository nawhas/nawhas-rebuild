import { afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardStats } from '../dashboard-stats';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

afterEach(cleanup);

describe('<DashboardStats />', () => {
  it('renders three cards and 7 sparkline bars', () => {
    render(<DashboardStats stats={{
      pendingCount: 3,
      last7DaysCount: 12,
      last7DaysBuckets: [1, 2, 0, 3, 1, 4, 1],
      oldestPendingHours: 26,
    }} />);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByLabelText(/^bar:/).length).toBe(7);
  });

  it('shows All caught up when pendingCount=0', () => {
    render(<DashboardStats stats={{
      pendingCount: 0,
      last7DaysCount: 0,
      last7DaysBuckets: [0, 0, 0, 0, 0, 0, 0],
      oldestPendingHours: null,
    }} />);
    expect(screen.queryByText(/statPendingEmpty/)).not.toBeNull();
    expect(screen.queryByText(/statOldestEmpty/)).not.toBeNull();
  });
});
