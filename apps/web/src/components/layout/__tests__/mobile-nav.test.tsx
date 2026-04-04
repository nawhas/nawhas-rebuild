import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileNav } from '../mobile-nav';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockPathname = vi.fn(() => '/');
const mockSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => mockPathname(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/auth-client', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock('@/components/theme/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle" aria-label="Toggle theme" />,
}));

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/reciters', label: 'Browse Reciters' },
];

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

describe('MobileNav', () => {
  it('renders a hamburger toggle button', () => {
    render(<MobileNav links={LINKS} user={null} />);
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeDefined();
  });

  it('menu is hidden initially', () => {
    render(<MobileNav links={LINKS} user={null} />);
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).toBeNull();
  });

  it('opens the menu on hamburger click', () => {
    render(<MobileNav links={LINKS} user={null} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeDefined();
  });

  it('closes the menu on second hamburger click', () => {
    render(<MobileNav links={LINKS} user={null} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).toBeNull();
  });

  it('shows nav links when open', () => {
    render(<MobileNav links={LINKS} user={null} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('link', { name: 'Home' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Browse Reciters' })).toBeDefined();
  });

  it('shows Sign In link when user is null', () => {
    render(<MobileNav links={LINKS} user={null} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeDefined();
  });

  it('shows user info and Sign Out when authenticated', () => {
    render(<MobileNav links={LINKS} user={mockUser} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Ali Hussain')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeDefined();
  });

  it('calls signOut and redirects when Sign Out clicked', async () => {
    render(<MobileNav links={LINKS} user={mockUser} />);
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('closes the menu when a nav link is clicked', () => {
    render(<MobileNav links={LINKS} user={null} />);
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).toBeNull();
  });

  it('renders ThemeToggle in the mobile menu when open', () => {
    render(<MobileNav links={LINKS} user={null} />);
    fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
    expect(screen.getByTestId('theme-toggle')).toBeDefined();
  });

  it('button has aria-expanded=false when closed', () => {
    render(<MobileNav links={LINKS} user={null} />);
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false');
  });

  it('button has aria-expanded=true when open', () => {
    render(<MobileNav links={LINKS} user={null} />);
    fireEvent.click(screen.getByRole('button'));
    expect(
      screen.getByRole('button', { name: /close navigation menu/i }).getAttribute('aria-expanded'),
    ).toBe('true');
  });
});
