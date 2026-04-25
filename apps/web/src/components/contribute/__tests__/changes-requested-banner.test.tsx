import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ChangesRequestedBanner } from '../changes-requested-banner';

afterEach(() => {
  cleanup();
});

describe('<ChangesRequestedBanner>', () => {
  const props = {
    comment: 'Add publication year.',
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    priorData: { name: 'Old' },
    currentData: { name: 'New' },
  };

  it('renders the comment', () => {
    const { getByText } = render(<ChangesRequestedBanner {...props} />);
    expect(getByText(/Add publication year/)).toBeTruthy();
  });

  it('toggles diff visibility on click', () => {
    const { getByText, queryByText } = render(<ChangesRequestedBanner {...props} />);
    expect(queryByText(/Hide changes/)).toBeNull();
    fireEvent.click(getByText(/See what's been changed/));
    expect(getByText(/Hide changes/)).toBeTruthy();
  });

  it('omits comment line when null', () => {
    const { queryByText } = render(<ChangesRequestedBanner {...props} comment={null} />);
    expect(queryByText(/Reviewer:/)).toBeNull();
  });
});
