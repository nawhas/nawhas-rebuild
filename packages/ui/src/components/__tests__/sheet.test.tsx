import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '../sheet.js';

afterEach(() => {
  cleanup();
});

describe('Sheet', () => {
  it('renders the trigger as a button', () => {
    render(
      <Sheet>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByRole('button', { name: 'Open sheet' })).toBeDefined();
  });

  it('does not render content when closed', () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent><SheetTitle>Title</SheetTitle></SheetContent>
      </Sheet>
    );
    expect(screen.queryByText('Title')).toBeNull();
  });

  it('renders content when open=true', () => {
    render(
      <Sheet open>
        <SheetContent><SheetTitle>Title</SheetTitle></SheetContent>
      </Sheet>
    );
    // Radix may render title twice (visible + aria-describedby); accept either
    expect(screen.getAllByText('Title').length).toBeGreaterThan(0);
  });
});
