/**
 * ISO-3166-1 alpha-2 subset covering the primary reciter origin countries.
 * Extend as needed — the schema accepts any 2-letter code.
 */
export const COUNTRY_OPTIONS: readonly { code: string; labelKey: string }[] = [
  { code: 'IQ', labelKey: 'country_IQ' },
  { code: 'IR', labelKey: 'country_IR' },
  { code: 'LB', labelKey: 'country_LB' },
  { code: 'PK', labelKey: 'country_PK' },
  { code: 'IN', labelKey: 'country_IN' },
  { code: 'BH', labelKey: 'country_BH' },
  { code: 'SY', labelKey: 'country_SY' },
  { code: 'AZ', labelKey: 'country_AZ' },
  { code: 'AF', labelKey: 'country_AF' },
  { code: 'SA', labelKey: 'country_SA' },
  { code: 'KW', labelKey: 'country_KW' },
  { code: 'GB', labelKey: 'country_GB' },
  { code: 'US', labelKey: 'country_US' },
  { code: 'CA', labelKey: 'country_CA' },
  { code: 'AU', labelKey: 'country_AU' },
] as const;
