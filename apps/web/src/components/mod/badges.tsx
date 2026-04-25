/**
 * Pill badges for submission type, action, and status.
 * Purely presentational — no interactivity required.
 *
 * Uses POC design token classes per the Status badges pattern in
 * docs/design/visual-vocabulary.md. Each badge follows the pill pattern:
 * `px-2 py-0.5 rounded-full text-[12px] font-medium`.
 */

import { useTranslations } from 'next-intl';
import type { SubmissionAction, SubmissionStatus, SubmissionType } from '@nawhas/types';

const PILL_BASE = 'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium';

const TYPE_CLASSES: Record<SubmissionType, string> = {
  reciter: 'bg-[var(--color-info-50)] text-[var(--color-info-700)] dark:bg-[var(--color-info-950)] dark:text-[var(--color-info-300)]',
  album: 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-950)] dark:text-[var(--color-accent-300)]',
  track: 'bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]',
};

const ACTION_CLASSES: Record<SubmissionAction, string> = {
  create: 'bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]',
  edit: 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)] dark:bg-[var(--color-warning-950)] dark:text-[var(--color-warning-300)]',
};

const STATUS_CLASSES: Record<SubmissionStatus, string> = {
  draft: 'bg-[var(--surface)] text-[var(--text-dim)] dark:bg-[var(--surface-2)]',
  pending: 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)] dark:bg-[var(--color-warning-950)] dark:text-[var(--color-warning-300)]',
  approved: 'bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]',
  rejected: 'bg-[var(--color-error-50)] text-[var(--color-error-700)] dark:bg-[var(--color-error-950)] dark:text-[var(--color-error-300)]',
  changes_requested: 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)] dark:bg-[var(--color-warning-950)] dark:text-[var(--color-warning-300)]',
  withdrawn: 'bg-[var(--surface)] text-[var(--text-dim)] dark:bg-[var(--surface-2)]',
  applied: 'bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]',
};

export function SubmissionTypeBadge({ type }: { type: SubmissionType }): React.JSX.Element {
  const t = useTranslations('mod.type');
  return (
    <span className={`${PILL_BASE} ${TYPE_CLASSES[type]}`}>
      {t(type)}
    </span>
  );
}

export function SubmissionActionBadge({ action }: { action: SubmissionAction }): React.JSX.Element {
  const t = useTranslations('mod.action');
  return (
    <span className={`${PILL_BASE} ${ACTION_CLASSES[action]}`}>
      {t(action)}
    </span>
  );
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }): React.JSX.Element {
  const t = useTranslations('mod.status');
  return (
    <span className={`${PILL_BASE} ${STATUS_CLASSES[status]}`}>
      {t(status)}
    </span>
  );
}

const ROLE_CLASSES: Record<string, string> = {
  moderator: 'bg-[var(--accent)] text-white',
  contributor: 'bg-[var(--color-info-50)] text-[var(--color-info-700)] dark:bg-[var(--color-info-950)] dark:text-[var(--color-info-300)]',
  user: 'bg-[var(--surface)] text-[var(--text-dim)] dark:bg-[var(--surface-2)]',
};

export function RoleBadge({ role }: { role: string }): React.JSX.Element {
  const t = useTranslations('mod.role');
  const classes = ROLE_CLASSES[role] ?? ROLE_CLASSES.user;
  const known = role === 'moderator' || role === 'contributor' || role === 'user';
  const label = known ? t(role) : role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <span className={`${PILL_BASE} ${classes}`}>
      {label}
    </span>
  );
}
