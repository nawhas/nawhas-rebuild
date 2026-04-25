import { afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuditFilters } from '../audit-filters';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

// next/navigation router/searchParams mocks
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  pushMock.mockReset();
  cleanup();
});

describe('<AuditFilters />', () => {
  it('passes selected filters to onSubmit and pushes URL', () => {
    const onSubmit = vi.fn();
    render(
      <AuditFilters
        initial={{}}
        onSubmit={onSubmit}
        actions={['submission.applied', 'role.changed']}
      />,
    );
    const select = screen.getByLabelText('filterAction');
    fireEvent.change(select, { target: { value: 'submission.applied' } });
    fireEvent.click(screen.getByRole('button', { name: 'filterApply' }));
    expect(onSubmit).toHaveBeenCalled();
    const arg = onSubmit.mock.calls[0]?.[0];
    expect(arg?.action).toBe('submission.applied');
    expect(pushMock).toHaveBeenCalled();
    const pushedUrl = pushMock.mock.calls[0]?.[0] as string;
    expect(pushedUrl).toContain('action=submission.applied');
  });

  it('reset clears the form and routes to /mod/audit', () => {
    const onSubmit = vi.fn();
    render(
      <AuditFilters
        initial={{ action: 'role.changed' }}
        onSubmit={onSubmit}
        actions={['role.changed']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'filterClear' }));
    expect(pushMock).toHaveBeenCalledWith('/mod/audit');
  });
});
