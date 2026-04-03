import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { SiteHeader } from '../header';

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
}));

const mockGetSession = vi.fn().mockResolvedValue(null);

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } },
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../user-menu', () => ({
  UserMenu: ({ user }: { user: { name: string } }) => (
    <div data-testid="user-menu">{user.name}</div>
  ),
}));

vi.mock('../mobile-nav', () => ({
  MobileNav: () => <div data-testid="mobile-nav" />,
}));

vi.mock('../nav-links', () => ({
  NavLinks: ({ links }: { links: ReadonlyArray<{ href: string; label: string }> }) => (
    <div data-testid="nav-links">
      {links.map(({ href, label }) => (
        <a key={href} href={href}>
          {label}
        </a>
      ))}
    </div>
  ),
}));

vi.mock('@/components/search/search-bar', () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}));

vi.mock('@/components/search/mobile-search-overlay', () => ({
  MobileSearchOverlay: () => <div data-testid="mobile-search-overlay" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SiteHeader', () => {
  it('renders the logo linking to /', async () => {
    render(await SiteHeader());
    const logo = screen.getByRole('link', { name: /nawhas/i });
    expect(logo.getAttribute('href')).toBe('/');
  });

  it('renders a nav element with main navigation label', async () => {
    render(await SiteHeader());
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeDefined();
  });

  it('renders Sign In link when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    render(await SiteHeader());
    const signIn = screen.getByRole('link', { name: 'Sign In' });
    expect(signIn.getAttribute('href')).toBe('/login');
  });

  it('renders UserMenu when authenticated', async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Ali Hussain',
        email: 'ali@example.com',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        image: null,
      },
      session: {},
    });
    render(await SiteHeader());
    expect(screen.getByTestId('user-menu').textContent).toBe('Ali Hussain');
    expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
  });

  it('renders MobileNav', async () => {
    render(await SiteHeader());
    expect(screen.getByTestId('mobile-nav')).toBeDefined();
  });

  it('renders NavLinks with the three nav links', async () => {
    render(await SiteHeader());
    expect(screen.getByTestId('nav-links')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Home' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Browse Reciters' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Browse Albums' })).toBeDefined();
  });

  it('includes a skip-to-main-content link', async () => {
    render(await SiteHeader());
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip.getAttribute('href')).toBe('#main-content');
  });

  it('renders unauthenticated state when getSession throws', async () => {
    mockGetSession.mockRejectedValue(new Error('DB unavailable'));
    render(await SiteHeader());
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeDefined();
  });
});
