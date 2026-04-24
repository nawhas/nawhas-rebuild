import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

const mockSetTheme = vi.fn();
let mockTheme = 'dark';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

const translations: Record<string, string> = {
  toggleThemeLabel: 'Toggle theme',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => translations[key] ?? key,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockTheme = 'dark';
});

describe('ThemeToggle (2-way cycle)', () => {
  it('has aria-label "Switch to dark mode" in light mode', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeDefined();
  });

  it('has aria-label "Switch to light mode" in dark mode', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeDefined();
  });

  it('cycles light → dark on click', () => {
    mockTheme = 'light';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('cycles dark → light on click', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('button is not disabled when mounted', () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });
});
