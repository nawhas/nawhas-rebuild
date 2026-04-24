import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { TrackRow } from '../track-row';

afterEach(() => cleanup());

describe('TrackRow', () => {
  it('links the title to /track/[slug]', () => {
    render(<TrackRow slug="kun-faya" title="Kun Faya" reciter="Ali Safdar" reciterSlug="ali-safdar" duration={245} />);
    const link = screen.getByRole('link', { name: 'Kun Faya' });
    expect(link.getAttribute('href')).toBe('/track/kun-faya');
  });

  it('links the reciter to /reciter/[slug]', () => {
    render(<TrackRow slug="kun-faya" title="Kun Faya" reciter="Ali Safdar" reciterSlug="ali-safdar" duration={245} />);
    const link = screen.getByRole('link', { name: 'Ali Safdar' });
    expect(link.getAttribute('href')).toBe('/reciter/ali-safdar');
  });

  it('formats duration as M:SS', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={245} />);
    expect(screen.getByText('4:05')).toBeDefined();
  });

  it('formats sub-minute duration with leading 0:', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={45} />);
    expect(screen.getByText('0:45')).toBeDefined();
  });

  it('renders em-dash for missing poet', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={100} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('formats plays as Xk for thousands', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={100} plays={12345} />);
    expect(screen.getByText('12.3k')).toBeDefined();
  });
});
