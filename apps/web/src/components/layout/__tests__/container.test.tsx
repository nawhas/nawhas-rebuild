import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container } from '../container';

describe('Container', () => {
  it('renders children', () => {
    render(<Container>hello</Container>);
    expect(screen.getByText('hello')).toBeDefined();
  });

  it('applies default xl max-width class', () => {
    const { container } = render(<Container>content</Container>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('max-w-screen-xl');
  });

  it('applies the specified size class', () => {
    const { container } = render(<Container size="md">content</Container>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('max-w-screen-md');
  });

  it('applies full width when size is full', () => {
    const { container } = render(<Container size="full">content</Container>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('max-w-full');
  });

  it('merges extra className prop', () => {
    const { container } = render(<Container className="extra-class">content</Container>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('extra-class');
  });

  it('centres content with mx-auto', () => {
    const { container } = render(<Container>content</Container>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('mx-auto');
  });

  it('passes through HTML attributes', () => {
    const { container } = render(
      <Container data-testid="my-container">content</Container>,
    );
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute('data-testid')).toBe('my-container');
  });
});
