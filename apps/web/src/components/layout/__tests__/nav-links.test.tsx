import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { NavLinks } from '../nav-links';

const mockPathname = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/reciters', label: 'Reciters' },
  { href: '/albums', label: 'Albums' },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NavLinks', () => {
  it('renders all nav links', () => {
    render(<NavLinks links={LINKS} />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Reciters' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Albums' })).toBeDefined();
  });

  it('sets aria-current="page" on the active link', () => {
    mockPathname.mockReturnValue('/reciters');
    render(<NavLinks links={LINKS} />);
    const active = screen.getByRole('link', { name: 'Reciters' });
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('does not set aria-current on inactive links', () => {
    mockPathname.mockReturnValue('/reciters');
    render(<NavLinks links={LINKS} />);
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home.getAttribute('aria-current')).toBeNull();
  });

  it('marks / as active only when pathname is exactly /', () => {
    mockPathname.mockReturnValue('/reciters');
    render(<NavLinks links={LINKS} />);
    const home = screen.getByRole('link', { name: 'Home' });
    expect(home.getAttribute('aria-current')).toBeNull();
  });

  it('calls onClick when a link is clicked', () => {
    const onClick = vi.fn();
    render(<NavLinks links={LINKS} onClick={onClick} />);
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies a custom wrapper className', () => {
    const { container } = render(<NavLinks links={LINKS} className="flex flex-col" />);
    expect((container.firstChild as HTMLElement).className).toContain('flex');
    expect((container.firstChild as HTMLElement).className).toContain('flex-col');
  });
});
