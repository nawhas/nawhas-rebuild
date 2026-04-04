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
      <h2 id="notifications-heading" className="text-base font-semibold text-gray-900">
        {t('notificationsHeading')}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {t('notificationsComingSoon')}
      </p>

      <fieldset disabled className="mt-4 space-y-3 opacity-50" aria-label={t('notificationsEmailLabel')}>
        <legend className="sr-only">{t('notificationsEmailLabel')}</legend>

        <label className="flex cursor-not-allowed items-center gap-3">
          <input
            type="checkbox"
            defaultChecked={false}
            disabled
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
          <span className="text-sm text-gray-700">{t('notificationNewAlbums')}</span>
        </label>

        <label className="flex cursor-not-allowed items-center gap-3">
          <input
            type="checkbox"
            defaultChecked={false}
            disabled
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
          <span className="text-sm text-gray-700">{t('notificationWeeklyDigest')}</span>
        </label>
      </fieldset>
    </section>
  );
}
