import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { ReciterAvatar } from '../reciter-avatar';

afterEach(() => cleanup());

describe('ReciterAvatar', () => {
  it('renders an <img> when avatarUrl is provided', () => {
    render(<ReciterAvatar avatarUrl="https://example.com/a.png" name="Ali Safdar" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/a.png');
    expect(img.getAttribute('alt')).toBe('Ali Safdar');
  });

  it('falls back to gradient circle with initials when no avatarUrl', () => {
    render(<ReciterAvatar name="Ali Safdar" />);
    expect(screen.getByText('AS')).toBeDefined();
  });

  it('derives initials from a single-word name', () => {
    render(<ReciterAvatar name="Hassan" />);
    expect(screen.getByText('H')).toBeDefined();
  });

  it('picks the same gradient for the same name (deterministic)', () => {
    const { container: a } = render(<ReciterAvatar name="Repeat" />);
    const { container: b } = render(<ReciterAvatar name="Repeat" />);
    const va = a.querySelector('[data-avatar-variant]')?.getAttribute('data-avatar-variant');
    const vb = b.querySelector('[data-avatar-variant]')?.getAttribute('data-avatar-variant');
    expect(va).toBe(vb);
  });
});
