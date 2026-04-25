/**
 * Renders a field-by-field comparison for edit submissions.
 * Uses the `diff` package to highlight changed characters within text fields.
 */

import { diffWords } from 'diff';
import { useTranslations } from 'next-intl';

interface FieldDiffProps {
  label: string;
  current: string | number | null | undefined;
  proposed: string | number | null | undefined;
}

export function FieldDiff({ label, current, proposed }: FieldDiffProps): React.JSX.Element | null {
  const t = useTranslations('mod.diff');
  const currentStr = current != null ? String(current) : '';
  const proposedStr = proposed != null ? String(proposed) : '';
  const unchanged = currentStr === proposedStr;

  return (
    <div className="py-3">
      <p className="mb-1 text-[13px] font-medium uppercase tracking-wider text-[var(--text-dim)]">
        {label}
      </p>
      {unchanged ? (
        <p className="text-sm text-[var(--text)]">{currentStr || <em className="text-[var(--text-faint)]">—</em>}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div role="group" aria-label={`${label}: ${t('currentValueLabel')}`}>
            <p className="mb-1 text-xs text-[var(--text-dim)]">{t('current')}</p>
            <p className="line-through rounded-[6px] bg-[var(--color-error-50)] px-3 py-2 text-sm text-[var(--text)] opacity-70 dark:bg-[var(--color-error-950)]">
              {currentStr || <em>{t('empty')}</em>}
            </p>
          </div>
          <div role="group" aria-label={`${label}: ${t('proposedValueLabel')}`}>
            <p className="mb-1 text-xs text-[var(--text-dim)]">{t('proposed')}</p>
            <InlineWordDiff current={currentStr} proposed={proposedStr} />
          </div>
        </div>
      )}
    </div>
  );
}

function InlineWordDiff({ current, proposed }: { current: string; proposed: string }): React.JSX.Element {
  const t = useTranslations('mod.diff');
  const parts = diffWords(current, proposed);
  return (
    <p className="rounded-[6px] bg-[var(--color-success-50)] px-3 py-2 text-sm dark:bg-[var(--color-success-950)]">
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <ins
              key={i}
              aria-label={`${t('addedPrefix')} ${part.value}`}
              className="bg-[var(--color-success-200)] text-[var(--color-success-900)] no-underline dark:bg-[var(--color-success-800)] dark:text-[var(--color-success-100)]"
            >
              {part.value}
            </ins>
          );
        }
        if (part.removed) return null; // removed parts shown in the "current" column
        return (
          <span key={i} className="text-[var(--text)]">{part.value}</span>
        );
      })}
    </p>
  );
}

interface DataPreviewProps {
  label: string;
  value: string | number | null | undefined;
}

/** Simple field display for create submissions (no diff needed). */
export function DataPreview({ label, value }: DataPreviewProps): React.JSX.Element {
  return (
    <div className="py-3">
      <p className="mb-1 text-[13px] font-medium uppercase tracking-wider text-[var(--text-dim)]">
        {label}
      </p>
      <p className="text-sm text-[var(--text)]">
        {value != null && value !== '' ? String(value) : <em className="text-[var(--text-faint)]">—</em>}
      </p>
    </div>
  );
}
