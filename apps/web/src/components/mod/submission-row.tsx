import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@nawhas/ui/components/card';
import { SubmissionTypeBadge, SubmissionActionBadge, SubmissionStatusBadge } from '@/components/mod/badges';
import type { SubmissionDTO } from '@nawhas/types';

function getSubmissionLabel(
  submission: SubmissionDTO,
  t: (key: string) => string,
): string {
  const data = submission.data as unknown as Record<string, unknown>;
  if (submission.type === 'reciter') return (data.name as string) ?? t('unnamedReciter');
  if (submission.type === 'album') return (data.title as string) ?? t('unnamedAlbum');
  if (submission.type === 'track') return (data.title as string) ?? t('unnamedTrack');
  return submission.id;
}

export function SubmissionRow({ submission }: { submission: SubmissionDTO }): React.JSX.Element {
  const t = useTranslations('contribute.history');
  const label = getSubmissionLabel(submission, t);
  const href = `/mod/submissions/${submission.id}`;

  return (
    <li>
      <Card className="overflow-hidden">
        <Link
          href={href}
          prefetch={false}
          className="flex items-center gap-4 px-5 py-4 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-medium text-foreground">{label}</span>
            <div className="flex items-center gap-2">
              <SubmissionTypeBadge type={submission.type} />
              <SubmissionActionBadge action={submission.action} />
              <SubmissionStatusBadge status={submission.status} />
            </div>
          </div>
          <time
            dateTime={String(submission.createdAt)}
            className="shrink-0 text-xs text-muted-foreground"
            title={new Date(submission.createdAt).toLocaleString()}
          >
            {new Date(submission.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </Link>
      </Card>
    </li>
  );
}
