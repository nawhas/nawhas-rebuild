import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { YoutubeEmbedSlot } from '../youtube-embed-slot';

afterEach(() => cleanup());

describe('YoutubeEmbedSlot', () => {
  it('renders an iframe with the correct youtube-nocookie src', () => {
    render(<YoutubeEmbedSlot youtubeId="dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle('YouTube video player');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('uses the default title when no title prop is provided', () => {
    render(<YoutubeEmbedSlot youtubeId="abc123" />);
    expect(screen.getByTitle('YouTube video player')).toBeDefined();
  });

  it('uses a custom title when one is provided', () => {
    render(<YoutubeEmbedSlot youtubeId="abc123" title="My Custom Video" />);
    expect(screen.getByTitle('My Custom Video')).toBeDefined();
  });

  it('sets loading="lazy" on the iframe', () => {
    render(<YoutubeEmbedSlot youtubeId="abc123" />);
    const iframe = screen.getByTitle('YouTube video player');
    expect(iframe.getAttribute('loading')).toBe('lazy');
  });

  it('sets allowFullScreen on the iframe', () => {
    render(<YoutubeEmbedSlot youtubeId="abc123" />);
    const iframe = screen.getByTitle('YouTube video player');
    // allowFullScreen is reflected as a boolean attribute in jsdom
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
  });

  it('embeds different video ids correctly', () => {
    render(<YoutubeEmbedSlot youtubeId="XYZ999" />);
    const iframe = screen.getByTitle('YouTube video player');
    expect(iframe.getAttribute('src')).toContain('XYZ999');
  });
});
