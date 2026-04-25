import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReviewThread } from '../review-thread';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({
    relativeTime: (d: Date) => `rel:${d.toISOString()}`,
    dateTime: (d: Date) => `dt:${d.toISOString()}`,
  }),
}));

const baseThread = {
  submitter: { id: 'u1', name: 'Alice' },
  submittedAt: new Date('2026-04-20T10:00:00Z'),
  reviews: [
    {
      id: 'r1',
      action: 'changes_requested' as const,
      comment: 'Add a description.',
      reviewerName: 'Bob',
      reviewerRole: 'moderator' as const,
      createdAt: new Date('2026-04-21T10:00:00Z'),
    },
  ],
  appliedAt: null,
};

describe('<ReviewThread />', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders submitter bookend, review row, and the comment', () => {
    render(<ReviewThread thread={baseThread} variant="moderator" />);
    expect(screen.getByText(/Alice/)).toBeDefined();
    expect(screen.getByText(/Add a description/)).toBeDefined();
    expect(screen.getByText(/Bob/)).toBeDefined();
  });

  it('redacts reviewer name in contributor variant', () => {
    const redacted = {
      ...baseThread,
      reviews: [{ ...baseThread.reviews[0]!, reviewerName: '', reviewerRole: null }],
    };
    render(<ReviewThread thread={redacted} variant="contributor" />);
    expect(screen.queryByText(/Bob/)).toBeNull();
  });

  it('shows applied bookend when appliedAt is set', () => {
    const applied = { ...baseThread, appliedAt: new Date('2026-04-22T10:00:00Z') };
    render(<ReviewThread thread={applied} variant="moderator" />);
    expect(screen.getByText(/reviewThreadAppliedAt/)).toBeDefined();
  });

  it('shows empty hint when reviews is empty and not applied', () => {
    const empty = { ...baseThread, reviews: [] };
    render(<ReviewThread thread={empty} variant="moderator" />);
    expect(screen.getByText(/reviewThreadEmpty/)).toBeDefined();
  });
});
