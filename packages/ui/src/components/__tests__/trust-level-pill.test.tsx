import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TrustLevelPill } from '../trust-level-pill.js';

afterEach(() => {
  cleanup();
});

describe('<TrustLevelPill>', () => {
  it('renders nothing for level="new"', () => {
    const { container } = render(<TrustLevelPill level="new" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Trusted contributor" for level="trusted"', () => {
    const { getByText } = render(<TrustLevelPill level="trusted" />);
    expect(getByText('Trusted contributor')).toBeTruthy();
  });

  it('renders "Maintainer contributor" for level="maintainer"', () => {
    const { getByText } = render(<TrustLevelPill level="maintainer" />);
    expect(getByText('Maintainer contributor')).toBeTruthy();
  });

  it('has aria-label matching the level', () => {
    const { container } = render(<TrustLevelPill level="regular" />);
    expect(container.firstChild?.textContent).toContain('Regular');
  });
});
