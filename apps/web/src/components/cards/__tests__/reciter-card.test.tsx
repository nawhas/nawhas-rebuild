import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { ReciterCard } from '../reciter-card';

afterEach(() => cleanup());

const reciter = {
  id: 'r1',
  slug: 'ali-safdar',
  name: 'Ali Safdar',
} as Parameters<typeof ReciterCard>[0]['reciter'];

describe('ReciterCard', () => {
  it('links to the reciter profile route', () => {
    render(<ReciterCard reciter={reciter} />);
    const link = screen.getByRole('link', { name: /view ali safdar's profile/i });
    expect(link.getAttribute('href')).toBe('/reciters/ali-safdar');
  });

  it('renders the reciter name', () => {
    render(<ReciterCard reciter={reciter} />);
    expect(screen.getByText('Ali Safdar')).toBeDefined();
  });

  it('renders a ReciterAvatar with initials in the gradient fallback path', () => {
    render(<ReciterCard reciter={reciter} />);
    expect(screen.getByText('AS')).toBeDefined();
  });
});
