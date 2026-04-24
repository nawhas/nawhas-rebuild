import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { CoverArt } from '../cover-art';

const translations: Record<string, string> = {
  albumAlt: 'Cover art for {label}',
  placeholderLabel: 'Album cover',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const raw = translations[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  },
}));

afterEach(() => cleanup());

describe('CoverArt', () => {
  it('renders an <img> when artworkUrl is provided', () => {
    render(<CoverArt slug="x" artworkUrl="https://example.com/art.png" label="Panjtan Pak" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/art.png');
    expect(img.getAttribute('alt')).toBe('Cover art for Panjtan Pak');
  });

  it('falls back to a gradient div when artworkUrl is undefined', () => {
    const { container } = render(<CoverArt slug="panjtan-pak" label="Panjtan Pak" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-cover-variant]')).not.toBeNull();
  });

  it('picks the same gradient variant for the same slug (deterministic)', () => {
    const { container: a } = render(<CoverArt slug="repeatable" label="A" />);
    const { container: b } = render(<CoverArt slug="repeatable" label="B" />);
    const va = a.querySelector('[data-cover-variant]')?.getAttribute('data-cover-variant');
    const vb = b.querySelector('[data-cover-variant]')?.getAttribute('data-cover-variant');
    expect(va).toBe(vb);
  });

  it('size="sm" applies the small size token', () => {
    const { container } = render(<CoverArt slug="x" label="A" size="sm" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('data-size')).toBe('sm');
  });

  it('fluid mode fills its parent (100% width/height) instead of using fixed pixel dimensions', () => {
    const { container } = render(<CoverArt slug="x" label="A" fluid />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe('100%');
    expect(root.style.height).toBe('100%');
  });

  it('marks the artwork-present <img> as lazy and async-decoded', () => {
    render(<CoverArt slug="x" artworkUrl="https://example.com/a.png" label="A" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });
});
