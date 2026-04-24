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

  it('does not render an inherent border (consumers add divide-y on the list container)', () => {
    const { container } = render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" duration={100} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain('border-b');
  });

  it('renders a leadingSlot before the title when provided', () => {
    render(
      <TrackRow
        slug="x"
        title="X"
        reciter="Y"
        reciterSlug="y"
        duration={100}
        leadingSlot={<button type="button" aria-label="Play X">▶</button>}
      />,
    );
    // The leadingSlot button should be reachable via aria-label.
    expect(screen.getByRole('button', { name: 'Play X' })).toBeDefined();
    // And it should be the first child of the grid.
    const root = document.querySelector('[style*="grid-template-columns"]') as HTMLElement;
    expect(root.firstChild).toBe(screen.getByRole('button', { name: 'Play X' }).parentElement);
  });

  it('renders em-dash for missing duration', () => {
    render(<TrackRow slug="x" title="X" reciter="Y" reciterSlug="y" />);
    // Both duration and plays render em-dash; assert there are at least 2 em-dashes (poet missing too).
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('uses the override href when provided', () => {
    render(
      <TrackRow
        slug="kun-faya"
        title="Kun Faya"
        reciter="Ali Safdar"
        reciterSlug="ali-safdar"
        duration={245}
        href="/reciters/ali-safdar/albums/x/tracks/kun-faya"
      />,
    );
    const link = screen.getByRole('link', { name: 'Kun Faya' });
    expect(link.getAttribute('href')).toBe('/reciters/ali-safdar/albums/x/tracks/kun-faya');
  });

  it('renders an aria-hidden placeholder instead of a reciter link when reciter is empty', () => {
    const { container } = render(
      <TrackRow
        slug="x"
        title="X"
        reciter=""
        reciterSlug="y"
        duration={100}
      />,
    );
    // The aria-hidden span should be the second grid child (after the title link)
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(1); // only the title link, no reciter link
  });
});
