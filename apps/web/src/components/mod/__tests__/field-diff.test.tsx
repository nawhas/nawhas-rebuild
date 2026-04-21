import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { FieldDiff } from '../field-diff';

afterEach(() => {
  cleanup();
});

describe('FieldDiff', () => {
  it('renders unchanged value with no <ins> markers when current equals proposed', () => {
    const { container, getByText } = render(
      <FieldDiff label="Title" current="same value" proposed="same value" />,
    );
    expect(getByText('same value')).toBeDefined();
    expect(container.querySelectorAll('ins').length).toBe(0);
    expect(container.querySelectorAll('del').length).toBe(0);
  });

  it('renders the em-dash placeholder when both values are empty strings', () => {
    const { container } = render(
      <FieldDiff label="Title" current="" proposed="" />,
    );
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe('—');
    expect(container.querySelectorAll('ins').length).toBe(0);
  });

  it('renders the two-column Current / Proposed grid when values differ', () => {
    const { getByText } = render(
      <FieldDiff label="Title" current="old" proposed="new" />,
    );
    expect(getByText('Current')).toBeDefined();
    expect(getByText('Proposed')).toBeDefined();
  });

  it('wraps added words in <ins> inside the Proposed column', () => {
    const { container } = render(
      <FieldDiff label="Title" current="hello" proposed="hello world" />,
    );
    const insElements = container.querySelectorAll('ins');
    // ≥1 rather than ==1: diff v9 may tokenise leading whitespace as a
    // separate added token, which is not a behaviour regression we care about.
    expect(insElements.length).toBeGreaterThanOrEqual(1);
    const insText = Array.from(insElements).map((el) => el.textContent ?? '').join('');
    expect(insText).toContain('world');
  });

  it('does not render removed words in the Proposed column', () => {
    const { container } = render(
      <FieldDiff label="Title" current="hello world" proposed="hello" />,
    );
    // No additions when only a word is removed.
    expect(container.querySelectorAll('ins').length).toBe(0);

    // The Proposed column is the second column's <p> (green background).
    // Identify it as the <p> that is NOT line-through inside the grid.
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    const paragraphs = grid!.querySelectorAll(':scope > div > p');
    // There are 4 <p> inside the grid: "Current" label + current value,
    // "Proposed" label + proposed value. Pick the last one (proposed value).
    const proposedParagraph = paragraphs[paragraphs.length - 1] as HTMLElement;
    expect(proposedParagraph.textContent).not.toContain('world');
    expect(proposedParagraph.textContent).toContain('hello');
  });

  it('shows the full current string with line-through styling when values differ', () => {
    const { container } = render(
      <FieldDiff label="Title" current="old text" proposed="new text" />,
    );
    const strikethrough = container.querySelector('.line-through');
    expect(strikethrough).not.toBeNull();
    expect(strikethrough?.textContent).toContain('old text');
  });

  it('handles mixed additions and removals within the same string', () => {
    const { container } = render(
      <FieldDiff
        label="Title"
        current="the quick brown fox"
        proposed="the slow brown fox"
      />,
    );
    const insElements = container.querySelectorAll('ins');
    expect(insElements.length).toBeGreaterThanOrEqual(1);
    // At least one <ins> contains the added word "slow".
    const insTexts = Array.from(insElements).map((el) => el.textContent ?? '');
    expect(insTexts.some((t) => t.includes('slow'))).toBe(true);

    // Isolate the Proposed column's paragraph and check its contents.
    const grid = container.querySelector('.grid');
    const paragraphs = grid!.querySelectorAll(':scope > div > p');
    const proposedParagraph = paragraphs[paragraphs.length - 1] as HTMLElement;

    // "quick" was removed and must NOT appear in the Proposed column.
    expect(proposedParagraph.textContent).not.toContain('quick');
    // "brown fox" is unchanged trailing text and should appear as a <span>.
    expect(proposedParagraph.textContent).toContain('brown fox');
    // "the " should also remain as unchanged leading text.
    expect(proposedParagraph.textContent).toContain('the');
  });

  it('coerces numeric values to strings and still diffs them', () => {
    const { container, getByText } = render(
      <FieldDiff label="Year" current={2020} proposed={2021} />,
    );
    // Both labels present means we took the differing branch.
    expect(getByText('Current')).toBeDefined();
    expect(getByText('Proposed')).toBeDefined();
    // Current column should still contain "2020" (the whole string line-through).
    const strikethrough = container.querySelector('.line-through');
    expect(strikethrough?.textContent).toContain('2020');
  });

  it('coerces null/undefined to empty string and treats proposed text as an addition', () => {
    const { container } = render(
      <FieldDiff label="Title" current={null} proposed="hello" />,
    );
    const insElements = container.querySelectorAll('ins');
    expect(insElements.length).toBeGreaterThanOrEqual(1);
    const insText = Array.from(insElements).map((el) => el.textContent ?? '').join('');
    expect(insText).toContain('hello');
  });
});
