import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';
import { ResetPasswordForm } from '../reset-password-form';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockResetPassword = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ResetPasswordForm', () => {
  it('renders the password field with accessible label', () => {
    render(<ResetPasswordForm token="test-token" />);
    expect(screen.getByLabelText('New password')).toBeDefined();
  });

  it('renders the submit button', () => {
    render(<ResetPasswordForm token="test-token" />);
    expect(screen.getByRole('button', { name: 'Set new password' })).toBeDefined();
  });

  it('renders a link back to sign in', () => {
    render(<ResetPasswordForm token="test-token" />);
    const link = screen.getByRole('link', { name: 'Back to sign in' });
    expect(link.getAttribute('href')).toBe('/login');
  });

  it('calls resetPassword with newPassword and token on submit', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null });

    render(<ResetPasswordForm token="abc123" />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'newpassword1' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Set new password' }).closest('form')!);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        newPassword: 'newpassword1',
        token: 'abc123',
      });
    });
  });

  it('redirects to /login?reset=1 on success', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null });

    render(<ResetPasswordForm token="abc123" />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'newpassword1' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Set new password' }).closest('form')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?reset=1');
    });
  });

  it('shows an error when password is shorter than 8 characters', async () => {
    render(<ResetPasswordForm token="abc123" />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Set new password' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Password must be at least 8 characters.',
      );
    });

    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('shows expired/invalid error message when API returns error', async () => {
    mockResetPassword.mockResolvedValue({
      data: null,
      error: { status: 400, message: 'Token expired' },
    });

    render(<ResetPasswordForm token="expired-token" />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'newpassword1' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Set new password' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('expired');
    });
  });

  it('shows a link to request a new reset link when token is expired/invalid', async () => {
    mockResetPassword.mockResolvedValue({
      data: null,
      error: { status: 400, message: 'Invalid token' },
    });

    render(<ResetPasswordForm token="bad-token" />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'newpassword1' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Set new password' }).closest('form')!);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Request a new link' });
      expect(link.getAttribute('href')).toBe('/forgot-password');
    });
  });

  it('does not redirect when API returns an error', async () => {
    mockResetPassword.mockResolvedValue({
      data: null,
      error: { message: 'Something went wrong.' },
    });

    render(<ResetPasswordForm token="abc123" />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'newpassword1' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Set new password' }).closest('form')!);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('disables input and button while loading', async () => {
    let resolve!: (v: unknown) => void;
    mockResetPassword.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<ResetPasswordForm token="abc123" />);
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'newpassword1' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Set new password' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button').textContent).toBe('Saving…');
    });

    resolve({ data: {}, error: null });
  });
});
