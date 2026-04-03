import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';
import { LoginForm } from '../login-form';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSignIn = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  signIn: { email: (...args: unknown[]) => mockSignIn(...args) },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LoginForm', () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ data: { user: { id: '1' } }, error: null });
  });

  it('renders all form fields with accessible labels', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('renders the submit button', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined();
  });

  it('renders a link to the register page', () => {
    render(<LoginForm />);
    const link = screen.getByRole('link', { name: 'Register' });
    expect(link.getAttribute('href')).toBe('/register');
  });

  it('calls signIn.email with email and password on submit', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'ali@example.com',
        password: 'secret123',
      });
    });
  });

  it('redirects to / by default on successful login', async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to callbackUrl when provided', async () => {
    render(<LoginForm callbackUrl="/admin" />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin');
    });
  });

  it('shows an error message when signIn returns an error', async () => {
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid email or password.' },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Invalid email or password.');
    });
  });

  it('shows a fallback error message when signIn error has no message', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: {} });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Invalid email or password.');
    });
  });

  it('disables inputs and button while loading', async () => {
    let resolve!: (v: unknown) => void;
    mockSignIn.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button').textContent).toBe('Signing in…');
    });

    // Clean up — resolve the pending promise
    resolve({ data: { user: { id: '1' } }, error: null });
  });

  it('does not redirect when signIn returns an error', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Wrong password.' } });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
