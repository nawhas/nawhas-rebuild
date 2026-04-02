import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserMenu } from '../user-menu';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/auth-client', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

const mockUser = {
  id: 'user-1',
  name: 'Ali Hussain',
  email: 'ali@example.com',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UserMenu', () => {
  it('renders an avatar button with initials', () => {
    render(<UserMenu user={mockUser} />);
    const btn = screen.getByRole('button', { name: /account menu/i });
    expect(btn.textContent).toBe('AH');
  });

  it('uses first char of email when name is empty', () => {
    const user = { ...mockUser, name: '' };
    render(<UserMenu user={user} />);
    expect(screen.getByRole('button').textContent).toBe('A');
  });

  it('dropdown is not visible initially', () => {
    render(<UserMenu user={mockUser} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens dropdown on button click', () => {
    render(<UserMenu user={mockUser} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeDefined();
  });

  it('shows user name and email in dropdown', () => {
    render(<UserMenu user={mockUser} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Ali Hussain')).toBeDefined();
    expect(screen.getByText('ali@example.com')).toBeDefined();
  });

  it('shows Profile and Sign Out menu items', () => {
    render(<UserMenu user={mockUser} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeDefined();
  });

  it('closes dropdown on second button click', () => {
    render(<UserMenu user={mockUser} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('calls signOut and redirects to / when Sign Out is clicked', async () => {
    render(<UserMenu user={mockUser} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('has aria-expanded=false when closed and true when open', () => {
    render(<UserMenu user={mockUser} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });
});
