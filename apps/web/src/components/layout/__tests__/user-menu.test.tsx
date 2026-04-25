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
    expect(screen.queryByText('Account settings')).toBeNull();
  });

  it('opens menu on trigger activation', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeDefined();
    });
  });

  it('shows user name, @username and role badge in open menu', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByText('Ali Hussain')).toBeDefined();
      expect(screen.getByText('@ali_h')).toBeDefined();
      expect(screen.getByText('Member')).toBeDefined();
    });
  });

  it('shows Contributor badge for role=contributor', async () => {
    const user = { ...mockUser, role: 'contributor' as const };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByText('Contributor')).toBeDefined();
    });
  });

  it('shows Moderator badge for role=moderator', async () => {
    const user = { ...mockUser, role: 'moderator' as const };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByText('Moderator')).toBeDefined();
    });
  });

  it('shows My Dashboard, Public profile, Account settings, Sign Out menu items when open', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /My Dashboard/i })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: /Public profile/i })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: /Account settings/i })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Sign Out' })).toBeDefined();
    });
  });

  it('My Dashboard links to /dashboard', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const item = await screen.findByRole('menuitem', { name: /My Dashboard/i });
    const anchor = item.tagName === 'A' ? item : item.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/dashboard');
  });

  it('Public profile links to /contributor/<username>', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const item = await screen.findByRole('menuitem', { name: /Public profile/i });
    const anchor = item.tagName === 'A' ? item : item.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe('/contributor/ali_h');
  });

  it('hides Public profile when user has no username', async () => {
    const user = { ...mockUser, username: null as unknown as string };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /Account settings/i })).toBeDefined();
    });
    expect(screen.queryByRole('menuitem', { name: /Public profile/i })).toBeNull();
  });

  it('Account settings links to /profile', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const item = await screen.findByRole('menuitem', { name: /Account settings/i });
    const anchor = item.tagName === 'A' ? item : item.querySelector('a');
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

  it('hides Moderator Dashboard for role=user', async () => {
    render(<UserMenu user={mockUser} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /Account settings/i })).toBeDefined();
    });
    expect(screen.queryByRole('menuitem', { name: /Moderation queue/i })).toBeNull();
  });

  it('hides Moderator Dashboard for role=contributor', async () => {
    const user = { ...mockUser, role: 'contributor' as const };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /Account settings/i })).toBeDefined();
    });
    expect(screen.queryByRole('menuitem', { name: /Moderation queue/i })).toBeNull();
  });

  it('shows Moderator Dashboard for role=moderator', async () => {
    const user = { ...mockUser, role: 'moderator' as const };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    const modItem = await screen.findByRole('menuitem', { name: /Moderation queue/i });
    const modAnchor = modItem.tagName === 'A' ? modItem : modItem.querySelector('a');
    expect(modAnchor?.getAttribute('href')).toBe('/mod');
  });

  it('does not include a Contribute menu item (moved to header CTA)', async () => {
    const user = { ...mockUser, role: 'contributor' as const };
    render(<UserMenu user={user} />);
    openMenu(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /Account settings/i })).toBeDefined();
    });
    expect(screen.queryByRole('menuitem', { name: 'Contribute' })).toBeNull();
  });
});
