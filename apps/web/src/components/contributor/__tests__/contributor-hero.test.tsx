import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ContributorHero } from '../contributor-hero';

afterEach(() => {
  cleanup();
});

describe('<ContributorHero>', () => {
  const baseProps = {
    name: 'Fatima Hussain',
    username: 'fatima_h',
    avatarInitials: 'FH',
    trustLevel: 'trusted' as const,
  };

  it('renders profile variant with stats', () => {
    const { getByText } = render(
      <ContributorHero
        {...baseProps}
        bio="Lead curator"
        stats={{ total: 100, approved: 95, approvalRate: 0.95 }}
      />,
    );
    expect(getByText('Fatima Hussain')).toBeTruthy();
    expect(getByText('@fatima_h')).toBeTruthy();
    expect(getByText('Lead curator')).toBeTruthy();
    expect(getByText('95%')).toBeTruthy();
  });

  it('omits bio paragraph when null', () => {
    const { queryByText } = render(<ContributorHero {...baseProps} bio={null} />);
    expect(queryByText('Lead curator')).toBeNull();
  });

  it('renders dashboard variant without stats block', () => {
    const { queryByText } = render(<ContributorHero {...baseProps} bio={null} variant="dashboard" />);
    expect(queryByText('Total Contributions')).toBeNull();
  });
});
