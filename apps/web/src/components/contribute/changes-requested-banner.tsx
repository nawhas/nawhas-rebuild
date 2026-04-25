'use client';

import * as React from 'react';
import { FieldDiff } from '@/components/mod/field-diff';

/**
 * Banner above contribute edit forms when status='changes_requested'.
 * Shows the moderator's feedback comment and an expandable field-diff
 * comparing prior submission data to the current edit-form state.
 * Reviewer name is intentionally not surfaced (contributor variant).
 *
 * Note: <FieldDiff> renders a single field (label + current + proposed),
 * so we iterate over the union of keys from priorData and currentData
 * and emit one row per key. `null`/`undefined` get coerced to empty in
 * FieldDiff's stringification.
 */
export function ChangesRequestedBanner({
  comment,
  reviewedAt,
  priorData,
  currentData,
}: {
  comment: string | null;
  reviewedAt: Date | null;
  priorData: Record<string, unknown>;
  currentData: Record<string, unknown>;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const reviewedAgo = reviewedAt ? formatRelative(reviewedAt) : null;

  const allKeys = Array.from(
    new Set([...Object.keys(priorData), ...Object.keys(currentData)]),
  );

  return (
    <div className="mb-6 rounded-[12px] border border-[var(--warning)] bg-[var(--warning-glow)] p-5">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden>⚠</span>
        <span className="font-medium text-[var(--text)]">Changes requested</span>
      </div>
      {comment && (
        <p className="mb-2 text-sm text-[var(--text)]">
          <span className="text-[var(--text-dim)]">Reviewer: </span>
          <q>{comment}</q>
        </p>
      )}
      {reviewedAgo && (
        <p className="mb-3 text-xs text-[var(--text-faint)]">
          Reviewed {reviewedAgo} by a moderator
        </p>
      )}
      <button
        type="button"
        className="text-xs text-[var(--accent)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide changes' : "See what's been changed"}
      </button>
      {open && (
        <div className="mt-3 rounded-[8px] bg-[var(--surface)] p-3">
          {allKeys.map((key) => (
            <FieldDiff
              key={key}
              label={key}
              current={toFieldValue(priorData[key])}
              proposed={toFieldValue(currentData[key])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function toFieldValue(v: unknown): string | number | null | undefined {
  if (v == null) return v as null | undefined;
  if (typeof v === 'string' || typeof v === 'number') return v;
  return JSON.stringify(v);
}

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toISOString().slice(0, 10);
}
