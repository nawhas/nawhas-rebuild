import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  // English stays at /reciters (no prefix). Future /ar/ and /ur/ added post-launch.
  localePrefix: 'as-needed',
});
