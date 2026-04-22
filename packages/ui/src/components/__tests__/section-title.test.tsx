import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { SectionTitle } from '../section-title.js';

afterEach(() => {
  cleanup();
});

describe('SectionTitle', () => {
  it('renders its children as an h2 by default', () => {
    render(<SectionTitle>Top Nawhas</SectionTitle>);
    const el = screen.getByText('Top Nawhas');
    expect(el.tagName).toBe('H2');
  });

  it('renders with a custom heading level via the `as` prop', () => {
    render(<SectionTitle as="h3">Sub</SectionTitle>);
    expect(screen.getByText('Sub').tagName).toBe('H3');
  });

  it('applies the design-system size class (text-[1.4rem])', () => {
    render(<SectionTitle>x</SectionTitle>);
    expect(screen.getByText('x').className).toMatch(/text-\[1\.4rem\]/);
  });

  it('applies the bottom-margin class (mb-3)', () => {
    render(<SectionTitle>x</SectionTitle>);
    expect(screen.getByText('x').className).toMatch(/mb-3/);
  });

  it('merges custom className without losing base classes', () => {
    render(<SectionTitle className="custom-xyz">x</SectionTitle>);
    const el = screen.getByText('x');
    expect(el.className).toMatch(/custom-xyz/);
    expect(el.className).toMatch(/mb-3/);
  });
});
