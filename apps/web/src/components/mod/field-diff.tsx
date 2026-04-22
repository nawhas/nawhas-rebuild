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
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {unchanged ? (
        <p className="text-sm text-foreground">{currentStr || <em className="text-muted-foreground">—</em>}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t('current')}</p>
            <p className="rounded bg-red-50 px-2 py-1 text-sm text-red-800 line-through dark:bg-red-950 dark:text-red-200">
              {currentStr || <em>{t('empty')}</em>}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t('proposed')}</p>
            <InlineWordDiff current={currentStr} proposed={proposedStr} />
          </div>
        </div>
      )}
    </div>
  );
}

function InlineWordDiff({ current, proposed }: { current: string; proposed: string }): React.JSX.Element {
  const parts = diffWords(current, proposed);
  return (
    <p className="rounded bg-green-50 px-2 py-1 text-sm dark:bg-green-950">
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <ins key={i} className="bg-green-200 text-green-900 no-underline dark:bg-green-800 dark:text-green-100">
              {part.value}
            </ins>
          );
        }
        if (part.removed) return null; // removed parts shown in the "current" column
        return (
          <span key={i} className="text-foreground">{part.value}</span>
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
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">
        {value != null && value !== '' ? String(value) : <em className="text-muted-foreground">—</em>}
      </p>
    </div>
  );
}
