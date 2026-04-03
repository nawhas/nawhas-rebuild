import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PageLayout } from '../page-layout';

afterEach(cleanup);

describe('PageLayout', () => {
  const defaultProps = {
    header: <nav>Site Nav</nav>,
    footer: <p>Site Footer</p>,
    children: <p>Main Content</p>,
  };

  it('renders header, main content, and footer', () => {
    const { container } = render(<PageLayout {...defaultProps} />);
    expect(container.querySelector('nav')?.textContent).toBe('Site Nav');
    expect(container.querySelector('main')?.textContent).toBe('Main Content');
    expect(container.querySelector('footer')?.textContent).toBe('Site Footer');
  });

  it('wraps header in a <header> element with role="banner"', () => {
    const { container } = render(<PageLayout {...defaultProps} />);
    const header = container.querySelector('header[role="banner"]');
    expect(header).not.toBeNull();
    expect(header?.tagName.toLowerCase()).toBe('header');
  });

  it('wraps children in a <main> element with role="main"', () => {
    const { container } = render(<PageLayout {...defaultProps} />);
    const main = container.querySelector('main[role="main"]');
    expect(main).not.toBeNull();
    expect(main?.tagName.toLowerCase()).toBe('main');
  });

  it('wraps footer in a <footer> element with role="contentinfo"', () => {
    const { container } = render(<PageLayout {...defaultProps} />);
    const footer = container.querySelector('footer[role="contentinfo"]');
    expect(footer).not.toBeNull();
    expect(footer?.tagName.toLowerCase()).toBe('footer');
  });

  it('provides a skip-target id on main for keyboard navigation', () => {
    const { container } = render(<PageLayout {...defaultProps} />);
    const main = container.querySelector('#main-content');
    expect(main).not.toBeNull();
  });

  it('renders with min-h-screen to fill the viewport', () => {
    const { container } = render(<PageLayout {...defaultProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('min-h-screen');
  });
});
