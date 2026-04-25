'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AuditLogDTO } from '@nawhas/types';

interface Props {
  entry: AuditLogDTO;
}

export function AuditRow({ entry }: Props): React.JSX.Element {
  const t = useTranslations('mod.audit');
  const [open, setOpen] = useState(false);
  const subRowId = `audit-row-meta-${entry.id}`;
  const meta = entry.meta as Record<string, unknown> | null;
  const hasMeta = meta !== null && Object.keys(meta).length > 0;

  return (
    <>
      <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
        <td className="w-8 px-2 py-3">
          {hasMeta && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={subRowId}
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]"
            >
              {open ? t('metaToggleCollapse') : t('metaToggleExpand')}
            </button>
          )}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">{entry.action}</td>
        <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{entry.targetType ?? '—'}</td>
        <td className="max-w-0 truncate px-4 py-3 text-xs text-[var(--text-dim)]">
          {entry.targetId ?? '—'}
        </td>
        <td className="px-4 py-3 text-right text-xs text-[var(--text-dim)]">
          <time
            dateTime={String(entry.createdAt)}
            title={new Date(entry.createdAt).toLocaleString()}
          >
            {new Date(entry.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </td>
      </tr>
      {open && hasMeta && meta && (
        <tr id={subRowId} className="bg-[var(--surface-2)]">
          <td colSpan={5} className="px-4 py-3">
            <table className="text-xs text-[var(--text)]">
              <tbody>
                {Object.entries(meta).map(([k, v]) => (
                  <tr key={k} className="align-top">
                    <th scope="row" className="pr-3 text-left font-medium text-[var(--text-dim)]">
                      {k}
                    </th>
                    <td>
                      {typeof v === 'object' && v !== null ? (
                        <pre className="whitespace-pre-wrap font-mono text-[11px]">
                          {JSON.stringify(v, null, 2)}
                        </pre>
                      ) : (
                        <span className="font-mono">{String(v)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
