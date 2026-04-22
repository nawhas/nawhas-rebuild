import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Badge } from '../badge.js';

afterEach(() => {
  cleanup();
});

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeDefined();
  });

  it('applies the default variant class', () => {
    const { container } = render(<Badge>x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/bg-primary/);
  });

  it('applies the destructive variant', () => {
    const { container } = render(<Badge variant="destructive">x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/bg-destructive/);
  });

  it('merges custom className', () => {
    const { container } = render(<Badge className="custom-xyz">x</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/custom-xyz/);
  });
});
