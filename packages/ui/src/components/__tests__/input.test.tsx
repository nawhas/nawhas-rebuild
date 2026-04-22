import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Input } from '../input.js';

afterEach(() => {
  cleanup();
});

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    expect(input.tagName).toBe('INPUT');
  });

  it('forwards type attribute (type="email")', () => {
    render(<Input type="email" data-testid="e" />);
    expect((screen.getByTestId('e') as HTMLInputElement).type).toBe('email');
  });

  it('merges custom className', () => {
    render(<Input className="custom-xyz" data-testid="e" />);
    expect(screen.getByTestId('e').className).toMatch(/custom-xyz/);
  });

  it('applies disabled attribute', () => {
    render(<Input disabled data-testid="e" />);
    expect((screen.getByTestId('e') as HTMLInputElement).disabled).toBe(true);
  });
});
