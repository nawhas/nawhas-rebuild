import Link from 'next/link';
import { Card } from '@nawhas/ui/components/card';
import { SubmissionTypeBadge, SubmissionActionBadge, SubmissionStatusBadge } from '@/components/mod/badges';
import type { SubmissionDTO } from '@nawhas/types';

function getSubmissionLabel(submission: SubmissionDTO): string {
  const data = submission.data as unknown as Record<string, unknown>;
  if (submission.type === 'reciter') return (data.name as string) ?? 'Unnamed reciter';
  if (submission.type === 'album') return (data.title as string) ?? 'Unnamed album';
  if (submission.type === 'track') return (data.title as string) ?? 'Unnamed track';
  return submission.id;
}

export function SubmissionRow({ submission }: { submission: SubmissionDTO }): React.JSX.Element {
  const label = getSubmissionLabel(submission);
  const href = `/mod/submissions/${submission.id}`;

  return (
    <li>
      <Card className="overflow-hidden">
        <Link
          href={href}
          prefetch={false}
          className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-400 dark:hover:bg-gray-700"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{label}</span>
            <div className="flex items-center gap-2">
              <SubmissionTypeBadge type={submission.type} />
              <SubmissionActionBadge action={submission.action} />
              <SubmissionStatusBadge status={submission.status} />
            </div>
          </div>
          <time
            dateTime={String(submission.createdAt)}
            className="shrink-0 text-xs text-gray-400 dark:text-gray-500"
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
