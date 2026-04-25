import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ApplyForm } from '../apply-form';

vi.mock('@/server/actions/access-requests', () => ({
  applyForAccess: vi.fn(async () => ({ id: 'x' })),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

describe('<ApplyForm>', () => {
  it('renders submit button and char counter', () => {
    const { getByText } = render(<ApplyForm />);
    expect(getByText('Submit application')).toBeTruthy();
    expect(getByText('0 / 1000')).toBeTruthy();
  });

  it('updates char counter on input', () => {
    const { getByPlaceholderText, getByText } = render(<ApplyForm />);
    const ta = getByPlaceholderText(/Tell us a bit about/);
    fireEvent.change(ta, { target: { value: 'abc' } });
    expect(getByText('3 / 1000')).toBeTruthy();
  });

  it('submits without throwing', () => {
    const { getByText } = render(<ApplyForm />);
    expect(() => fireEvent.click(getByText('Submit application'))).not.toThrow();
  });
});
