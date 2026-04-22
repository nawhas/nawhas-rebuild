import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Button } from '../button.js';

afterEach(() => {
  cleanup();
});

describe('Button', () => {
  it('renders a button element with the provided children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('applies the default variant class by default', () => {
    render(<Button>x</Button>);
    const btn = screen.getByRole('button');
    // Default variant uses bg-primary via semantic tokens
    expect(btn.className).toMatch(/bg-primary/);
  });

  it('applies the destructive variant when specified', () => {
    render(<Button variant="destructive">x</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-destructive/);
  });

  it('merges custom className without losing variant classes', () => {
    render(<Button className="custom-xyz">x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-primary/);
    expect(btn.className).toMatch(/custom-xyz/);
  });

  it('renders as a slot when asChild is true (no <button>)', () => {
    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>
    );
    // With asChild, no <button> is rendered; the <a> gets the classes
    expect(screen.queryByRole('button')).toBeNull();
    const link = screen.getByRole('link', { name: 'link' });
    expect(link.className).toMatch(/bg-primary/);
  });
});
