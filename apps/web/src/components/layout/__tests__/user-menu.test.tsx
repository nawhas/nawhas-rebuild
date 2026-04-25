import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
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

// Radix uses pointer-capture and scrollIntoView APIs that jsdom does not
// implement. Provide no-op polyfills so the DropdownMenu primitive works in
// tests.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

const mockUser = {
  id: 'user-1',
  name: 'Ali Hussain',
  username: 'ali_h',
  email: 'ali@example.com',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  image: null,
  role: 'user' as const,
  banned: null,
  banReason: null,
  banExpires: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * Dispatch the pointer sequence Radix listens for on its trigger
 * (pointerdown + click). fireEvent.click alone does not open a Radix
 * DropdownMenu because its trigger binds onPointerDown.
 */
function openMenu(trigger: HTMLElement): void {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.pointerUp(trigger, { button: 0 });
  fireEvent.click(trigger);
}

describe('UserMenu', () => {
  it('renders an avatar trigger with initials', () => {
    render(<UserMenu user={mockUser} />);
    const btn = screen.getByRole('button', { name: /account menu/i });
    expect(btn.textContent).toBe('AH');
  });

  it('uses first char of email when name is empty', () => {
    const user = { ...mockUser, name: '' };
    render(<UserMenu user={user} />);
    expect(screen.getByRole('button').textContent).toBe('A');
  });

  it('menu content is not visible initially', () => {
    render(<UserMenu user={mockUser} />);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('opens menu on trigger activation', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeDefined();
    });
  });

  it('shows user name and email in open menu', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByText('Ali Hussain')).toBeDefined();
      expect(screen.getByText('ali@example.com')).toBeDefined();
    });
  });

  it('shows Profile and Sign Out menu items when open', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeDefined();
    });
  });

  it('Profile menu item links to /profile', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const profileItem = await screen.findByRole('menuitem', { name: 'Profile' });
    // asChild <Link> renders an <a href="/profile"> that receives the item role
    const anchor = profileItem.tagName === 'A' ? profileItem : profileItem.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/profile');
  });

  it('calls signOut and redirects to / when Sign Out is activated', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const signOutItem = await screen.findByRole('menuitem', { name: 'Sign Out' });
    // Radix item activation: pointerdown + pointerup + click fires onSelect.
    fireEvent.pointerDown(signOutItem, { button: 0, ctrlKey: false });
    fireEvent.pointerUp(signOutItem, { button: 0 });
    fireEvent.click(signOutItem);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith('/');
      expect(mockRefresh).toHaveBeenCalledOnce();
    });
  });

  it('trigger reflects expanded state via aria-expanded', async () => {
    render(<UserMenu user={mockUser} />);
    const btn = screen.getByRole('button', { name: /account menu/i });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    openMenu(btn);
    await waitFor(() => {
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });
  });

  it('hides Contribute and Moderator Dashboard for role=user', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeDefined();
    });
    expect(screen.queryByRole('menuitem', { name: 'Contribute' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Moderator Dashboard' })).toBeNull();
  });

  it('shows Contribute but not Moderator Dashboard for role=contributor', async () => {
    const user = { ...mockUser, role: 'contributor' as const };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const contribute = await screen.findByRole('menuitem', { name: 'Contribute' });
    const anchor = contribute.tagName === 'A' ? contribute : contribute.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/contribute');
    expect(screen.queryByRole('menuitem', { name: 'Moderator Dashboard' })).toBeNull();
  });

  it('shows both Contribute and Moderator Dashboard for role=moderator', async () => {
    const user = { ...mockUser, role: 'moderator' as const };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const modItem = await screen.findByRole('menuitem', { name: 'Moderator Dashboard' });
    const modAnchor = modItem.tagName === 'A' ? modItem : modItem.querySelector('a');
    expect(modAnchor?.getAttribute('href')).toBe('/mod');
    const contributeItem = screen.getByRole('menuitem', { name: 'Contribute' });
    const contributeAnchor =
      contributeItem.tagName === 'A' ? contributeItem : contributeItem.querySelector('a');
    expect(contributeAnchor?.getAttribute('href')).toBe('/contribute');
  });
});
