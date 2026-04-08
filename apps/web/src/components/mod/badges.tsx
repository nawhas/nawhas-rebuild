/**
 * Pill badges for submission type, action, and status.
 * Purely presentational — no interactivity required.
 */

import type { SubmissionAction, SubmissionStatus, SubmissionType } from '@nawhas/types';

const TYPE_CLASSES: Record<SubmissionType, string> = {
  reciter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  album: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  track: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const ACTION_CLASSES: Record<SubmissionAction, string> = {
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  edit: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const STATUS_CLASSES: Record<SubmissionStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  changes_requested: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
};

const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

export function SubmissionTypeBadge({ type }: { type: SubmissionType }): React.JSX.Element {
  return (
    <span className={`${base} ${TYPE_CLASSES[type]}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

export function SubmissionActionBadge({ action }: { action: SubmissionAction }): React.JSX.Element {
  return (
    <span className={`${base} ${ACTION_CLASSES[action]}`}>
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </span>
  );
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }): React.JSX.Element {
  return (
    <span className={`${base} ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const ROLE_CLASSES: Record<string, string> = {
  moderator: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  contributor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  user: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export function RoleBadge({ role }: { role: string }): React.JSX.Element {
  const classes = ROLE_CLASSES[role] ?? ROLE_CLASSES.user;
  return (
    <span className={`${base} ${classes}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}
