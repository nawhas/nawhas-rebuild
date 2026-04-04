import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

const mockSetTheme = vi.fn();
let mockTheme = 'system';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockTheme = 'system';
});

// In jsdom, useEffect runs synchronously so the component is always "mounted" in tests.
// The placeholder path is only exercised in a real SSR/hydration scenario.
describe('ThemeToggle', () => {
  it('has aria-label "Switch to light mode" in system mode', () => {
    mockTheme = 'system';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeDefined();
  });

  it('has aria-label "Switch to dark mode" in light mode', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeDefined();
  });

  it('has aria-label "Switch to system mode" in dark mode', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to system mode' })).toBeDefined();
  });

  it('cycles light → dark on click', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('cycles dark → system on click', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to system mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });

  it('cycles system → light on click', () => {
    mockTheme = 'system';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('button is not disabled when mounted', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });
});
