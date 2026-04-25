import { useTranslations, useFormatter } from 'next-intl';
import type { ReviewThreadDTO } from '@nawhas/types';

interface Props {
  thread: ReviewThreadDTO;
  variant: 'moderator' | 'contributor';
}

const ACTION_LABEL_KEY: Record<string, string> = {
  approved: 'reviewThreadActionApproved',
  rejected: 'reviewThreadActionRejected',
  changes_requested: 'reviewThreadActionChangesRequested',
};

const ACTION_BADGE_CLASS: Record<string, string> = {
  approved:
    'bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]',
  rejected:
    'bg-[var(--color-error-50)] text-[var(--color-error-700)] dark:bg-[var(--color-error-950)] dark:text-[var(--color-error-300)]',
  changes_requested:
    'bg-[var(--color-warning-50)] text-[var(--color-warning-700)] dark:bg-[var(--color-warning-950)] dark:text-[var(--color-warning-300)]',
};

export function ReviewThread({ thread, variant }: Props): React.JSX.Element {
  const t = useTranslations('mod.submission');
  const fmt = useFormatter();
  const showReviewer = variant === 'moderator';

  return (
    <section aria-label={t('reviewThreadHeading')} className="mt-8">
      <h2 className="mb-4 font-serif text-[20px] font-medium text-[var(--text)]">
        {t('reviewThreadHeading')}
      </h2>
      <ol className="space-y-4">
        <li className="text-sm text-[var(--text-dim)]">
          {t('reviewThreadSubmittedBy', {
            name: thread.submitter.name,
            date: fmt.dateTime(new Date(thread.submittedAt)),
          })}
        </li>
        {thread.reviews.length === 0 && !thread.appliedAt && (
          <li className="text-sm text-[var(--text-faint)]">{t('reviewThreadEmpty')}</li>
        )}
        {thread.reviews.map((r) => (
          <li
            key={r.id}
            className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE_CLASS[r.action]}`}
              >
                {t(ACTION_LABEL_KEY[r.action]!)}
              </span>
              {showReviewer && r.reviewerName && (
                <span className="text-sm text-[var(--text)]">{r.reviewerName}</span>
              )}
              <time
                dateTime={new Date(r.createdAt).toISOString()}
                className="ml-auto text-xs text-[var(--text-faint)]"
                title={fmt.dateTime(new Date(r.createdAt))}
              >
                {fmt.relativeTime(new Date(r.createdAt))}
              </time>
            </div>
            {r.comment && (
              <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{r.comment}</p>
            )}
          </li>
        ))}
        {thread.appliedAt && (
          <li className="text-sm text-[var(--text-dim)]">
            {t('reviewThreadAppliedAt', {
              date: fmt.dateTime(new Date(thread.appliedAt)),
            })}
          </li>
        )}
      </ol>
    </section>
  );
}
