import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card.js';

afterEach(() => {
  cleanup();
});

describe('Card', () => {
  it('renders a Card with composed subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Desc')).toBeDefined();
    expect(screen.getByText('Body')).toBeDefined();
    expect(screen.getByText('Foot')).toBeDefined();
  });

  it('applies the card background token class', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toBeDefined();
    expect((container.firstChild as HTMLElement).className).toMatch(/bg-card/);
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="custom-xyz">x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/custom-xyz/);
  });
});
