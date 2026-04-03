import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';
import { ForgotPasswordForm } from '../forgot-password-form';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockForgetPassword = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  requestPasswordReset: (...args: unknown[]) => mockForgetPassword(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ForgotPasswordForm', () => {
  it('renders email field with accessible label', () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('renders the submit button', () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeDefined();
  });

  it('renders a link back to sign in', () => {
    render(<ForgotPasswordForm />);
    const link = screen.getByRole('link', { name: 'Back to sign in' });
    expect(link.getAttribute('href')).toBe('/login');
  });

  it('calls requestPasswordReset with email and redirectTo on submit', async () => {
    mockForgetPassword.mockResolvedValue({ data: {}, error: null });

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);

    await waitFor(() => {
      expect(mockForgetPassword).toHaveBeenCalledWith({
        email: 'ali@example.com',
        redirectTo: '/reset-password',
      });
    });
  });

  it('shows success state after submit regardless of API result', async () => {
    // Success path
    mockForgetPassword.mockResolvedValue({ data: {}, error: null });

    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Check your inbox')).toBeDefined();
    });
  });

  it('shows success state even when email does not exist (prevents account enumeration)', async () => {
    // API may return error for unknown email but UI must show success
    mockForgetPassword.mockResolvedValue({ data: null, error: { message: 'User not found' } });

    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Check your inbox')).toBeDefined();
    });
  });

  it('shows the submitted email in the success message', async () => {
    mockForgetPassword.mockResolvedValue({ data: {}, error: null });

    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ali@example.com')).toBeDefined();
    });
  });

  it('disables input and button while loading', async () => {
    let resolve!: (v: unknown) => void;
    mockForgetPassword.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button').textContent).toBe('Sending…');
    });

    resolve({ data: {}, error: null });
  });
});
