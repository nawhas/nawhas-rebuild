import { setRequestLocale } from 'next-intl/server';
import { routing } from './routing';

/** Call before any next-intl server APIs so ISR/static routes avoid `headers()` (see next-intl static rendering docs). */
export function setDefaultRequestLocale(): void {
  setRequestLocale(routing.defaultLocale);
}
