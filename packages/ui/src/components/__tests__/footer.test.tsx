import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Footer } from '../footer';

const translations: Record<string, string> = {
  product: 'Product',
  browse: 'Browse',
  reciters: 'Reciters',
  albums: 'Albums',
  community: 'Community',
  recentChanges: 'Recent Changes',
  dashboard: 'Dashboard',
  contribute: 'Contribute',
  admin: 'Admin',
  moderation: 'Moderation',
  about: 'About',
  aboutBody: 'Nawhas is a community-driven library of Islamic devotional recitation and poetry.',
  copyright: '© {year} Nawhas. All rights reserved.',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const raw = translations[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  },
}));

afterEach(() => cleanup());

describe('Footer', () => {
  it('renders the four section headings', () => {
    render(<Footer />);
    expect(screen.getByRole('heading', { name: 'Product' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Community' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'About' })).toBeDefined();
  });

  it('renders a Browse link pointing to /library', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'Browse' });
    expect(link.getAttribute('href')).toBe('/library');
  });

  it('renders the copyright with the current year interpolated', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Nawhas. All rights reserved.`)).toBeDefined();
  });

  it('does not render its own <footer> element (parent provides the landmark)', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeNull();
  });
});
