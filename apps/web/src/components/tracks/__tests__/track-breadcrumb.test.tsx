import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { TrackBreadcrumb } from '../track-breadcrumb';
import type { TrackWithRelationsDTO } from '@nawhas/types';

afterEach(() => cleanup());

function makeTrack(): TrackWithRelationsDTO {
  return {
    id: 't1',
    title: 'Salam Hussain',
    slug: 'salam-hussain',
    albumId: 'a1',
    trackNumber: null,
    audioUrl: null,
    youtubeId: null,
    duration: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    reciter: {
      id: 'r1',
      name: 'Ali Safdar',
      slug: 'ali-safdar',
      arabicName: null,
      country: null,
      birthYear: null,
      description: null,
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    album: {
      id: 'a1',
      title: 'Panjtan Pak',
      slug: 'panjtan-pak',
      reciterId: 'r1',
      year: 2020,
      description: null,
      artworkUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    lyrics: [],
  } as TrackWithRelationsDTO;
}

describe('TrackBreadcrumb', () => {
  it('renders a navigation landmark labelled "Breadcrumb"', async () => {
    render(await TrackBreadcrumb({ track: makeTrack() }));
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeDefined();
  });

  it('renders Home, Reciter, Album, and Track in order', async () => {
    render(await TrackBreadcrumb({ track: makeTrack() }));
    const items = screen.getAllByRole('listitem');
    const labels = items.map((li) => li.textContent?.replace(/[•\s]+$/, '').trim());
    expect(labels).toEqual(['Home', 'Ali Safdar', 'Panjtan Pak', 'Salam Hussain']);
  });

  it('links Home to /', async () => {
    render(await TrackBreadcrumb({ track: makeTrack() }));
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('links the reciter crumb to the reciter profile', async () => {
    render(await TrackBreadcrumb({ track: makeTrack() }));
    const link = screen.getByRole('link', { name: 'Ali Safdar' });
    expect(link.getAttribute('href')).toBe('/reciters/ali-safdar');
  });

  it('links the album crumb to the album page', async () => {
    render(await TrackBreadcrumb({ track: makeTrack() }));
    const link = screen.getByRole('link', { name: 'Panjtan Pak' });
    expect(link.getAttribute('href')).toBe('/albums/panjtan-pak');
  });

  it('renders the current track title as plain text with aria-current="page"', async () => {
    render(await TrackBreadcrumb({ track: makeTrack() }));
    // Track is the last crumb — not a link.
    expect(screen.queryByRole('link', { name: 'Salam Hussain' })).toBeNull();
    const current = screen.getByText('Salam Hussain');
    expect(current.getAttribute('aria-current')).toBe('page');
  });
});
