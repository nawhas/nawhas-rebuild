import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import type { RecentChangeDTO } from '@nawhas/types';

const VERB_KEY: Record<string, string> = {
  'create:reciter': 'verbAddReciter',
  'edit:reciter': 'verbEditReciter',
  'create:album': 'verbAddAlbum',
  'edit:album': 'verbEditAlbum',
  'create:track': 'verbAddTrack',
  'edit:track': 'verbEditTrack',
};

export function ChangeRow({ change }: { change: RecentChangeDTO }): React.JSX.Element {
  const t = useTranslations('changes');
  const fmt = useFormatter();
  const verbKey = VERB_KEY[`${change.action}:${change.entityType}`] ?? 'verbAddReciter';
  return (
    <li className="flex items-center gap-3 py-3">
      {/* avatarUrl is a direct image URL without a slug — inline img is appropriate here */}
      {change.avatarUrl ? (
        <img src={change.avatarUrl} alt="" width={48} height={48} className="rounded-md object-cover" />
      ) : (
        <div className="h-12 w-12 rounded-md bg-[var(--surface-2)]" aria-hidden />
      )}
      <div className="flex-1 text-sm text-[var(--text)]">
        <span>{change.submitterName} {t(verbKey)}: </span>
        <Link
          href={change.entitySlugPath}
          className="font-medium hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          {change.entityTitle}
        </Link>
      </div>
      <time
        dateTime={new Date(change.at).toISOString()}
        className="text-xs text-[var(--text-faint)]"
        title={new Date(change.at).toLocaleString()}
      >
        {fmt.relativeTime(new Date(change.at))}
      </time>
    </li>
  );
}
