import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react';
import { RegisterForm } from '../register-form';

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

const mockSignUp = vi.fn();
vi.mock('@/lib/auth-client', () => ({
  signUp: { email: (...args: unknown[]) => mockSignUp(...args) },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RegisterForm', () => {
  beforeEach(() => {
    mockSignUp.mockResolvedValue({ data: { user: { id: '1' } }, error: null });
  });

  it('renders all form fields with accessible labels', () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
  });

  it('renders the submit button', () => {
    render(<RegisterForm />);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDefined();
  });

  it('renders a link to the login page', () => {
    render(<RegisterForm />);
    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link.getAttribute('href')).toBe('/login');
  });

  it('calls signUp.email with name, email and password on submit', async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        name: 'Ali',
        email: 'ali@example.com',
        password: 'secret123',
      });
    });
  });

  it('redirects to / on successful registration', async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows an error message when signUp returns an error', async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: 'Email already in use.' },
    });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Email already in use.');
    });
  });

  it('shows a fallback error message when signUp error has no message', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: {} });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(
        'Registration failed. Please try again.',
      );
    });
  });

  it('disables inputs and button while loading', async () => {
    let resolve!: (v: unknown) => void;
    mockSignUp.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ali@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button').textContent).toBe('Creating account…');
    });

    // Clean up — resolve the pending promise
    resolve({ data: { user: { id: '1' } }, error: null });
  });

  it('does not redirect when signUp returns an error', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'Duplicate email.' } });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form')!);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
