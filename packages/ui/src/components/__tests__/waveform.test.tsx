import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { Waveform } from '../waveform';

const translations: Record<string, string> = {
  ariaLabel: 'Audio waveform — click to seek',
  decorativeAriaLabel: 'Audio waveform (visual only)',
  barLabel: 'Seek to {percent}%',
};
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const raw = translations[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  },
}));

afterEach(() => cleanup());

describe('Waveform', () => {
  it('renders 64 bars by default', () => {
    const { container } = render(<Waveform slug="x" />);
    expect(container.querySelectorAll('[data-waveform-bar]').length).toBe(64);
  });

  it('produces the same bar pattern for the same slug (deterministic)', () => {
    const { container: a } = render(<Waveform slug="repeat" />);
    const { container: b } = render(<Waveform slug="repeat" />);
    const heightsA = Array.from(a.querySelectorAll<HTMLElement>('[data-waveform-bar]')).map(el => el.style.height);
    const heightsB = Array.from(b.querySelectorAll<HTMLElement>('[data-waveform-bar]')).map(el => el.style.height);
    expect(heightsA).toEqual(heightsB);
  });

  it('highlights the active bar based on currentPercent', () => {
    const { container } = render(<Waveform slug="x" currentPercent={50} />);
    const bars = container.querySelectorAll<HTMLElement>('[data-waveform-bar]');
    // 50% of 64 = bar index 32
    expect(bars[32]?.getAttribute('data-active')).toBe('true');
    expect(bars[31]?.getAttribute('data-active')).toBe('false');
  });

  it('calls onSeek with the clicked bar percent', () => {
    const onSeek = vi.fn();
    const { container } = render(<Waveform slug="x" onSeek={onSeek} />);
    const bars = container.querySelectorAll<HTMLElement>('[data-waveform-bar]');
    fireEvent.click(bars[16]!);
    // bar 16 of 64 = 25%
    expect(onSeek).toHaveBeenCalledWith(25);
  });

  it('renders the duration in M:SS', () => {
    render(<Waveform slug="x" durationSec={245} />);
    expect(screen.getByText('4:05')).toBeDefined();
  });

  it('has an interactive region label when onSeek is provided', () => {
    render(<Waveform slug="x" onSeek={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Audio waveform — click to seek' })).toBeDefined();
  });

  it('has a decorative region label when onSeek is omitted', () => {
    render(<Waveform slug="x" />);
    expect(screen.getByRole('group', { name: 'Audio waveform (visual only)' })).toBeDefined();
  });

  it('renders bars as <div> (not <button>) when onSeek is omitted', () => {
    const { container } = render(<Waveform slug="x" />);
    const buttons = container.querySelectorAll('button[data-waveform-bar]');
    const divs = container.querySelectorAll('div[data-waveform-bar]');
    expect(buttons.length).toBe(0);
    expect(divs.length).toBe(64);
  });

  it('renders em-dash when durationSec is omitted', () => {
    render(<Waveform slug="x" />);
    // 0:00 should not appear as the duration; em-dash should
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
