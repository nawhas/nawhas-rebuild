'use client';

import { useTranslations } from 'next-intl';
import { slugify } from '@/server/lib/slug';

interface SlugPreviewProps {
  /** Raw name/title input. */
  source: string;
  /** URL template with {slug} placeholder, e.g. "/reciters/{slug}". */
  template: string;
}

/**
 * Read-only preview of the URL that will be generated from the current name/title.
 * Updates live as the user types. Does NOT show collision suffixes — those are
 * only known at apply time. Copy makes this explicit.
 */
export function SlugPreview({ source, template }: SlugPreviewProps): React.JSX.Element | null {
  const t = useTranslations('contribute.slug');
  const slug = slugify(source);
  if (!slug) return null;
  const url = template.replace('{slug}', slug);
  return (
    <p className="mt-1 text-[13px] text-[var(--text-faint)]">
      <span className="font-mono text-[var(--text-dim)]">{t('preview', { url })}</span>
      <span className="ml-1 opacity-75">{t('collisionNote')}</span>
    </p>
  );
}
