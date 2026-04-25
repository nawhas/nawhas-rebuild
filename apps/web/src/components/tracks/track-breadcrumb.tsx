import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { TrackWithRelationsDTO } from '@nawhas/types';

interface TrackBreadcrumbProps {
  track: TrackWithRelationsDTO;
}

/**
 * Track-detail breadcrumb — Home • Reciter • Album • Track.
 *
 * Renders a semantic `<nav aria-label="Breadcrumb">` containing an `<ol>` of
 * crumbs. Earlier crumbs are links; the current page (track title) is plain
 * text with `aria-current="page"`.
 *
 * Server Component — pure presentation, no interactivity.
 */
export async function TrackBreadcrumb({ track }: TrackBreadcrumbProps): Promise<React.JSX.Element> {
  const t = await getTranslations('trackDetail.breadcrumb');

  const crumbs: Array<{ label: string; href?: string }> = [
    { label: t('home'), href: '/' },
    { label: track.reciter.name, href: `/reciters/${track.reciter.slug}` },
    { label: track.album.title, href: `/albums/${track.album.slug}` },
    { label: track.title },
  ];

  return (
    <nav aria-label={t('label')} className="py-5">
      <ol className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-faint)]">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={`${idx}-${crumb.label}`} className="flex items-center gap-2">
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="rounded transition-colors hover:text-[var(--text-dim)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="text-[var(--text-dim)]">
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className="text-[var(--text-faint)]">
                  &bull;
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
