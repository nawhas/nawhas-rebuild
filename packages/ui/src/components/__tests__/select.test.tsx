import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select.js';

afterEach(() => {
  cleanup();
});

describe('Select', () => {
  it('renders the trigger as a combobox role', () => {
    render(
      <Select>
        <SelectTrigger aria-label="x">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'x' })).toBeDefined();
  });

  it('does not render items when closed', () => {
    render(
      <Select>
        <SelectTrigger aria-label="x">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.queryByText('A')).toBeNull();
  });

  it('applies aria-label to the trigger', () => {
    render(
      <Select>
        <SelectTrigger aria-label="reciter">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByRole('combobox').getAttribute('aria-label')).toBe('reciter');
  });
});
