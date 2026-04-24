import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * Site-wide footer with i18n strings, four-column grid, and a bottom
 * copyright bar. Pure presentation — links route to the rebuild's actual
 * routes (`/library`, `/reciters`, `/albums`, `/changes`, `/profile`,
 * `/contribute`, `/mod`).
 *
 * The component renders a `<footer>` landmark element. Note that the
 * shared `PageLayout` already wraps this slot in a `<footer
 * role="contentinfo">`, so this inner element exists primarily to keep
 * the component a self-contained landmark when used outside that layout.
 */
export function Footer(): React.JSX.Element {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-30 border-t border-[var(--border)] bg-[var(--surface)] py-16"
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('product')}</h3>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/library">{t('browse')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/reciters">{t('reciters')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/albums">{t('albums')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('community')}</h3>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/changes">{t('recentChanges')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/profile">{t('dashboard')}</Link></li>
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/contribute">{t('contribute')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('admin')}</h3>
          <ul className="flex flex-col gap-3">
            <li><Link className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]" href="/mod">{t('moderation')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold text-[var(--text)]">{t('about')}</h3>
          <p className="text-sm leading-relaxed text-[var(--text-faint)]">{t('aboutBody')}</p>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1200px] border-t border-[var(--border)] px-8 pt-10 text-center text-xs text-[var(--text-faint)]">
        <p>{t('copyright', { year })}</p>
      </div>
    </footer>
  );
}
