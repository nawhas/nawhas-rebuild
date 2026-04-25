import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

// Stub SearchBar to avoid pulling in the full search hook and its deps
vi.mock('@/components/search/search-bar', () => ({
  SearchBar: ({ variant }: { variant?: string }) => (
    <div role="search" data-variant={variant} aria-label="Search" />
  ),
}));

import { HeroSection } from '../hero-section';

afterEach(() => cleanup());

describe('HeroSection', () => {
  it('renders a semantic h1 heading', async () => {
    render(await HeroSection());
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeDefined();
  });

  it('renders the translated slogan', async () => {
    render(await HeroSection());
    // en.json: home.hero.slogan = "Discover the beauty of nawha recitation."
    expect(screen.getByText('Discover the beauty of nawha recitation.')).toBeDefined();
  });

  it('renders the SearchBar', async () => {
    render(await HeroSection());
    expect(screen.getByRole('search')).toBeDefined();
  });

  it('renders the hero section with an accessible label', async () => {
    render(await HeroSection());
    // en.json: home.hero.ariaLabel = "Hero"
    expect(screen.getByRole('region', { name: 'Hero' })).toBeDefined();
  });
});
