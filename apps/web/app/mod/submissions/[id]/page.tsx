import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { db, reciters, albums, tracks } from '@nawhas/db';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import {
  SubmissionTypeBadge,
  SubmissionActionBadge,
  SubmissionStatusBadge,
} from '@/components/mod/badges';
import { FieldDiff, DataPreview } from '@/components/mod/field-diff';
import { ReviewActions } from '@/components/mod/review-actions';
import { ApplyButton } from '@/components/mod/apply-button';
import type {
  ReciterSubmissionData,
  AlbumSubmissionData,
  TrackSubmissionData,
  SubmissionDTO,
} from '@nawhas/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Submission ${id.slice(0, 8)}… — Moderation` };
}

const createCaller = createCallerFactory(appRouter);

/**
 * /mod/submissions/[id] — Submission detail page.
 *
 * - For action=edit: renders field-by-field diff of current vs. proposed values.
 * - For action=create: renders a preview of the proposed values.
 * - For pending/changes_requested: shows review action buttons.
 * - For approved: shows an Apply button.
 */
export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const { id } = await params;
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  let submission: SubmissionDTO;
  try {
    submission = await caller.moderation.get({ submissionId: id });
  } catch {
    notFound();
  }

  // Fetch current entity values for edit submissions.
  const currentValues = await fetchCurrentValues(submission);

  const canReview = submission.status === 'pending' || submission.status === 'changes_requested';
  const canApply = submission.status === 'approved';

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/mod/queue"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:underline"
      >
        ← Back to queue
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Submission detail
      </h1>

      {/* Meta badges */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SubmissionTypeBadge type={submission.type} />
        <SubmissionActionBadge action={submission.action} />
        <SubmissionStatusBadge status={submission.status} />
        <time
          dateTime={String(submission.createdAt)}
          className="text-xs text-muted-foreground"
          title={new Date(submission.createdAt).toLocaleString()}
        >
          Submitted {new Date(submission.createdAt).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
      </div>

      {/* Notes from submitter */}
      {submission.notes && (
        <section
          aria-label="Submitter notes"
          className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950"
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
            Submitter notes
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-100">{submission.notes}</p>
        </section>
      )}

      {/* Field-by-field diff or preview */}
      <section
        aria-label="Submission data"
        className="mb-6 divide-y divide-border rounded-lg border border-border bg-card px-5"
      >
        <SubmissionFields
          submission={submission}
          currentValues={currentValues}
        />
      </section>

      {/* Review actions */}
      {canReview && <ReviewActions submissionId={submission.id} />}
      {canApply && <ApplyButton submissionId={submission.id} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CurrentValues = Record<string, string | number | null | undefined>;

async function fetchCurrentValues(submission: SubmissionDTO): Promise<CurrentValues | null> {
  if (submission.action !== 'edit' || !submission.targetId) return null;

  if (submission.type === 'reciter') {
    const [row] = await db.select().from(reciters).where(eq(reciters.id, submission.targetId)).limit(1);
    if (!row) return null;
    return { name: row.name, slug: row.slug };
  }

  if (submission.type === 'album') {
    const [row] = await db.select().from(albums).where(eq(albums.id, submission.targetId)).limit(1);
    if (!row) return null;
    return {
      title: row.title,
      slug: row.slug,
      reciterId: row.reciterId,
      year: row.year,
      artworkUrl: row.artworkUrl,
    };
  }

  if (submission.type === 'track') {
    const [row] = await db.select().from(tracks).where(eq(tracks.id, submission.targetId)).limit(1);
    if (!row) return null;
    return {
      title: row.title,
      slug: row.slug,
      albumId: row.albumId,
      trackNumber: row.trackNumber,
      audioUrl: row.audioUrl,
      youtubeId: row.youtubeId,
      duration: row.duration,
    };
  }

  return null;
}

function SubmissionFields({
  submission,
  currentValues,
}: {
  submission: SubmissionDTO;
  currentValues: CurrentValues | null;
}): React.JSX.Element {
  const isEdit = submission.action === 'edit' && currentValues !== null;

  if (submission.type === 'reciter') {
    const data = submission.data as ReciterSubmissionData;
    if (isEdit) {
      return (
        <>
          <FieldDiff label="Name" current={currentValues!.name} proposed={data.name} />
          <FieldDiff label="Slug" current={currentValues!.slug} proposed={data.slug} />
        </>
      );
    }
    return (
      <>
        <DataPreview label="Name" value={data.name} />
        <DataPreview label="Slug" value={data.slug} />
      </>
    );
  }

  if (submission.type === 'album') {
    const data = submission.data as AlbumSubmissionData;
    if (isEdit) {
      return (
        <>
          <FieldDiff label="Title" current={currentValues!.title} proposed={data.title} />
          <FieldDiff label="Slug" current={currentValues!.slug} proposed={data.slug} />
          <FieldDiff label="Reciter ID" current={currentValues!.reciterId} proposed={data.reciterId} />
          <FieldDiff label="Year" current={currentValues!.year} proposed={data.year} />
          <FieldDiff label="Artwork URL" current={currentValues!.artworkUrl} proposed={data.artworkUrl} />
        </>
      );
    }
    return (
      <>
        <DataPreview label="Title" value={data.title} />
        <DataPreview label="Slug" value={data.slug} />
        <DataPreview label="Reciter ID" value={data.reciterId} />
        <DataPreview label="Year" value={data.year} />
        <DataPreview label="Artwork URL" value={data.artworkUrl} />
      </>
    );
  }

  // track
  const data = submission.data as TrackSubmissionData;
  if (isEdit) {
    return (
      <>
        <FieldDiff label="Title" current={currentValues!.title} proposed={data.title} />
        <FieldDiff label="Slug" current={currentValues!.slug} proposed={data.slug} />
        <FieldDiff label="Album ID" current={currentValues!.albumId} proposed={data.albumId} />
        <FieldDiff label="Track Number" current={currentValues!.trackNumber} proposed={data.trackNumber} />
        <FieldDiff label="Audio URL" current={currentValues!.audioUrl} proposed={data.audioUrl} />
        <FieldDiff label="YouTube ID" current={currentValues!.youtubeId} proposed={data.youtubeId} />
        <FieldDiff label="Duration (s)" current={currentValues!.duration} proposed={data.duration} />
      </>
    );
  }
  return (
    <>
      <DataPreview label="Title" value={data.title} />
      <DataPreview label="Slug" value={data.slug} />
      <DataPreview label="Album ID" value={data.albumId} />
      <DataPreview label="Track Number" value={data.trackNumber} />
      <DataPreview label="Audio URL" value={data.audioUrl} />
      <DataPreview label="YouTube ID" value={data.youtubeId} />
      <DataPreview label="Duration (s)" value={data.duration} />
    </>
  );
}
