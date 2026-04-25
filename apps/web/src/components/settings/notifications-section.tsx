'use client';

import { useTranslations } from 'next-intl';

/**
 * Notifications section — M4 placeholder.
 * Toggles are rendered but disabled; preference persistence is implemented in M5.
 */
export function NotificationsSection(): React.JSX.Element {
  const t = useTranslations('settings');

  return (
    <section aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className="font-serif text-2xl font-medium text-[var(--text)]">
        {t('notificationsHeading')}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        {t('notificationsComingSoon')}
      </p>

      <fieldset disabled className="mt-4 space-y-3 opacity-50">
        <legend className="sr-only">{t('notificationsEmailLabel')}</legend>

        <label className="flex cursor-not-allowed items-center gap-3">
          <input
            type="checkbox"
            defaultChecked={false}
            disabled
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          />
          <span className="text-sm text-[var(--text)]">{t('notificationNewAlbums')}</span>
        </label>

        <label className="flex cursor-not-allowed items-center gap-3">
          <input
            type="checkbox"
            defaultChecked={false}
            disabled
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
          />
          <span className="text-sm text-[var(--text)]">{t('notificationWeeklyDigest')}</span>
        </label>
      </fieldset>
    </section>
  );
}
