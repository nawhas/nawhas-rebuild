/**
 * Pill badges for submission type, action, and status.
 * Purely presentational — no interactivity required.
 *
 * Wraps the shared <Badge> primitive (variant="secondary") and applies
 * per-key colour classes via className override. The mod UI relies on
 * colour for quick visual scanning (entity type / action / status / role),
 * so we preserve the existing palette rather than collapsing to semantic
 * Badge variants alone.
 */

import { useTranslations } from 'next-intl';
import { Badge } from '@nawhas/ui/components/badge';
import type { SubmissionAction, SubmissionStatus, SubmissionType } from '@nawhas/types';

const TYPE_CLASSES: Record<SubmissionType, string> = {
  reciter: 'bg-info-100 text-info-800 dark:bg-info-900 dark:text-info-200',
  album: 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200',
  track: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
};

const ACTION_CLASSES: Record<SubmissionAction, string> = {
  create: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
  edit: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
};

const STATUS_CLASSES: Record<SubmissionStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
  approved: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
  rejected: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200',
  changes_requested: 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200',
  withdrawn: 'bg-muted text-muted-foreground',
};

export function SubmissionTypeBadge({ type }: { type: SubmissionType }): React.JSX.Element {
  const t = useTranslations('mod.type');
  return (
    <Badge variant="secondary" className={TYPE_CLASSES[type]}>
      {t(type)}
    </Badge>
  );
}

export function SubmissionActionBadge({ action }: { action: SubmissionAction }): React.JSX.Element {
  const t = useTranslations('mod.action');
  return (
    <Badge variant="secondary" className={ACTION_CLASSES[action]}>
      {t(action)}
    </Badge>
  );
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }): React.JSX.Element {
  const t = useTranslations('mod.status');
  return (
    <Badge variant="secondary" className={STATUS_CLASSES[status]}>
      {t(status)}
    </Badge>
  );
}

const ROLE_CLASSES: Record<string, string> = {
  moderator: 'bg-foreground text-background',
  contributor: 'bg-info-100 text-info-800 dark:bg-info-900 dark:text-info-200',
  user: 'bg-muted text-muted-foreground',
};

export function RoleBadge({ role }: { role: string }): React.JSX.Element {
  const t = useTranslations('mod.role');
  const classes = ROLE_CLASSES[role] ?? ROLE_CLASSES.user;
  const known = role === 'moderator' || role === 'contributor' || role === 'user';
  const label = known ? t(role) : role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <Badge variant="secondary" className={classes}>
      {label}
    </Badge>
  );
}
