import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../dialog.js';

afterEach(() => {
  cleanup();
});

describe('Dialog', () => {
  it('does not render content when closed', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByText('Title')).toBeNull();
  });

  it('renders content when open=true', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Open Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Open Title')).toBeDefined();
  });

  it('DialogTrigger renders its children as a button', () => {
    render(
      <Dialog>
        <DialogTrigger>Trigger</DialogTrigger>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeDefined();
  });
});
