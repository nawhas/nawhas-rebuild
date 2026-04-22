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
      <h2 id="notifications-heading" className="text-base font-semibold text-foreground">
        {t('notificationsHeading')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('notificationsComingSoon')}
      </p>

      <fieldset disabled className="mt-4 space-y-3 opacity-50">
        <legend className="sr-only">{t('notificationsEmailLabel')}</legend>

        <label className="flex cursor-not-allowed items-center gap-3">
          <input
            type="checkbox"
            defaultChecked={false}
            disabled
            className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
          />
          <span className="text-sm text-foreground">{t('notificationNewAlbums')}</span>
        </label>

        <label className="flex cursor-not-allowed items-center gap-3">
          <input
            type="checkbox"
            defaultChecked={false}
            disabled
            className="h-4 w-4 rounded border-border text-foreground focus:ring-ring"
          />
          <span className="text-sm text-foreground">{t('notificationWeeklyDigest')}</span>
        </label>
      </fieldset>
    </section>
  );
}
