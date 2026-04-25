import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeratorNotes } from '../moderator-notes';

vi.mock('@/server/actions/moderation', () => ({
  setSubmissionModeratorNotes: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('<ModeratorNotes />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('debounces saves; multiple rapid keystrokes -> one save', async () => {
    const { setSubmissionModeratorNotes } = await import('@/server/actions/moderation');
    render(<ModeratorNotes submissionId="s1" initialNotes="" />);
    const ta = screen.getByRole('textbox');

    // Simulate multiple rapid changes (only the last one should be saved)
    fireEvent.change(ta, { target: { value: 'h' } });
    fireEvent.change(ta, { target: { value: 'he' } });
    fireEvent.change(ta, { target: { value: 'hel' } });
    fireEvent.change(ta, { target: { value: 'hell' } });
    fireEvent.change(ta, { target: { value: 'hello' } });

    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    expect(setSubmissionModeratorNotes).toHaveBeenCalledTimes(1);
    expect(setSubmissionModeratorNotes).toHaveBeenCalledWith('s1', 'hello');
  });
});
