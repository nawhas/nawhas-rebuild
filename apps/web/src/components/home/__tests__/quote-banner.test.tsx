import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

import { QuoteBanner } from '../quote-banner';

afterEach(() => cleanup());

describe('QuoteBanner', () => {
  it('renders the editorial quote inside a <blockquote>', () => {
    render(<QuoteBanner />);
    const quote = screen.getByText(/spiritual connection it creates with our heritage/i);
    expect(quote.tagName.toLowerCase()).toBe('blockquote');
  });

  it('renders the attribution', () => {
    render(<QuoteBanner />);
    expect(screen.getByText(/recitation community/i)).toBeDefined();
  });

  it('exposes the section as a labelled region', () => {
    render(<QuoteBanner />);
    expect(screen.getByRole('region', { name: /editorial quote/i })).toBeDefined();
  });
});
