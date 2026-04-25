import { describe, it, expect } from 'vitest';
import { formatDuration } from '../format-duration.js';

describe('formatDuration', () => {
  it('formats whole minutes', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(180)).toBe('3:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(245)).toBe('4:05');
  });

  it('handles sub-minute durations', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(60.7)).toBe('1:00');
    expect(formatDuration(65.9)).toBe('1:05');
  });

  it('returns em-dash for missing or invalid input', () => {
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
    expect(formatDuration(Infinity)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
  });
});
