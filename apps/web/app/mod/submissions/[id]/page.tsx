import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db, reciters, albums, tracks, lyrics } from '@nawhas/db';
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

  const t = await getTranslations('mod.submission');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* Main column */}
      <div>
        {/* Back link */}
        <Link
          href="/mod/queue"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--text-dim)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        >
          {t('backToQueue')}
        </Link>

        <h1 className="mb-2 font-serif text-[28px] font-medium text-[var(--text)]">
          {t('heading')}
        </h1>

        {/* Meta badges */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <SubmissionTypeBadge type={submission.type} />
          <SubmissionActionBadge action={submission.action} />
          <SubmissionStatusBadge status={submission.status} />
          <time
            dateTime={String(submission.createdAt)}
            className="text-xs text-[var(--text-faint)]"
            title={new Date(submission.createdAt).toLocaleString()}
          >
            {t('submittedAt', {
              date: new Date(submission.createdAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
            })}
          </time>
        </div>

        {/* Notes from submitter */}
        {submission.notes && (
          <section
            aria-label={t('submitterNotesLabel')}
            className="mb-6 rounded-[8px] border border-[var(--color-info-200)] bg-[var(--color-info-50)] px-4 py-3 dark:border-[var(--color-info-800)] dark:bg-[var(--color-info-950)]"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-info-500)]">
              {t('submitterNotesHeading')}
            </p>
            <p className="text-sm text-[var(--text)]">{submission.notes}</p>
          </section>
        )}

        {/* Field-by-field diff or preview */}
        <section
          aria-label={t('dataLabel')}
          className="mb-6 divide-y divide-[var(--border)] rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] px-5"
        >
          <SubmissionFields
            submission={submission}
            currentValues={currentValues}
            t={t}
          />
        </section>

        {/* Review actions */}
        {canReview && <ReviewActions submissionId={submission.id} />}
        {canApply && <ApplyButton submissionId={submission.id} />}
      </div>

      {/* Metadata sidebar */}
      <aside className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] p-6 sticky top-24 self-start">
        <h2 className="font-serif text-[18px] font-medium text-[var(--text)] mb-4">
          Details
        </h2>
        <dl className="space-y-4">
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              ID
            </dt>
            <dd className="text-sm text-[var(--text)] font-mono break-all">{submission.id}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Type
            </dt>
            <dd className="text-sm text-[var(--text)]">
              <SubmissionTypeBadge type={submission.type} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Action
            </dt>
            <dd className="text-sm text-[var(--text)]">
              <SubmissionActionBadge action={submission.action} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Status
            </dt>
            <dd className="text-sm text-[var(--text)]">
              <SubmissionStatusBadge status={submission.status} />
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
              Submitted
            </dt>
            <dd className="text-sm text-[var(--text)]">
              {new Date(submission.createdAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </dd>
          </div>
          {submission.targetId && (
            <div>
              <dt className="text-[13px] text-[var(--text-faint)] uppercase tracking-wide mb-1">
                Target ID
              </dt>
              <dd className="text-sm text-[var(--text)] font-mono break-all">{submission.targetId}</dd>
            </div>
          )}
        </dl>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LyricsMap = Partial<Record<string, string>>;

interface CurrentValues {
  // Reciter fields
  name?: string | null;
  slug?: string | null;
  arabicName?: string | null;
  country?: string | null;
  birthYear?: number | null;
  description?: string | null;
  avatarUrl?: string | null;
  // Album fields
  title?: string | null;
  reciterId?: string | null;
  year?: number | null;
  artworkUrl?: string | null;
  // Track fields
  albumId?: string | null;
  trackNumber?: number | null;
  audioUrl?: string | null;
  youtubeId?: string | null;
  duration?: number | null;
  lyrics?: LyricsMap;
}

async function fetchCurrentValues(submission: SubmissionDTO): Promise<CurrentValues | null> {
  if (submission.action !== 'edit' || !submission.targetId) return null;

  if (submission.type === 'reciter') {
    const [row] = await db.select().from(reciters).where(eq(reciters.id, submission.targetId)).limit(1);
    if (!row) return null;
    return {
      name: row.name,
      slug: row.slug,
      arabicName: row.arabicName,
      country: row.country,
      birthYear: row.birthYear,
      description: row.description,
      avatarUrl: row.avatarUrl,
    };
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
      description: row.description,
    };
  }

  if (submission.type === 'track') {
    const [row] = await db.select().from(tracks).where(eq(tracks.id, submission.targetId)).limit(1);
    if (!row) return null;
    const lyricRows = await db.select().from(lyrics).where(eq(lyrics.trackId, submission.targetId));
    const lyricsMap: LyricsMap = {};
    for (const lyric of lyricRows) {
      lyricsMap[lyric.language] = lyric.text;
    }
    return {
      title: row.title,
      slug: row.slug,
      albumId: row.albumId,
      trackNumber: row.trackNumber,
      audioUrl: row.audioUrl,
      youtubeId: row.youtubeId,
      duration: row.duration,
      lyrics: lyricsMap,
    };
  }

  return null;
}

function SubmissionFields({
  submission,
  currentValues,
  t,
}: {
  submission: SubmissionDTO;
  currentValues: CurrentValues | null;
  t: (key: string) => string;
}): React.JSX.Element {
  const isEdit = submission.action === 'edit' && currentValues !== null;

  if (submission.type === 'reciter') {
    const data = submission.data as ReciterSubmissionData;
    if (isEdit) {
      return (
        <>
          <FieldDiff label={t('fieldNameLabel')} current={currentValues!.name} proposed={data.name} />
          <FieldDiff label={t('fieldSlugLabel')} current={currentValues!.slug} proposed={data.slug} />
          <FieldDiff label={t('fieldArabicNameLabel')} current={currentValues!.arabicName} proposed={data.arabicName} />
          <FieldDiff label={t('fieldCountryLabel')} current={currentValues!.country} proposed={data.country} />
          <FieldDiff label={t('fieldBirthYearLabel')} current={currentValues!.birthYear} proposed={data.birthYear} />
          <FieldDiff label={t('fieldDescriptionLabel')} current={currentValues!.description} proposed={data.description} />
          <FieldDiff label={t('fieldAvatarUrlLabel')} current={currentValues!.avatarUrl} proposed={data.avatarUrl} />
        </>
      );
    }
    return (
      <>
        <DataPreview label={t('fieldNameLabel')} value={data.name} />
        <DataPreview label={t('fieldSlugLabel')} value={data.slug} />
        <DataPreview label={t('fieldArabicNameLabel')} value={data.arabicName} />
        <DataPreview label={t('fieldCountryLabel')} value={data.country} />
        <DataPreview label={t('fieldBirthYearLabel')} value={data.birthYear} />
        <DataPreview label={t('fieldDescriptionLabel')} value={data.description} />
        <DataPreview label={t('fieldAvatarUrlLabel')} value={data.avatarUrl} />
      </>
    );
  }

  if (submission.type === 'album') {
    const data = submission.data as AlbumSubmissionData;
    if (isEdit) {
      return (
        <>
          <FieldDiff label={t('fieldTitleLabel')} current={currentValues!.title} proposed={data.title} />
          <FieldDiff label={t('fieldSlugLabel')} current={currentValues!.slug} proposed={data.slug} />
          <FieldDiff label={t('fieldReciterIdLabel')} current={currentValues!.reciterId} proposed={data.reciterId} />
          <FieldDiff label={t('fieldYearLabel')} current={currentValues!.year} proposed={data.year} />
          <FieldDiff label={t('fieldArtworkUrlLabel')} current={currentValues!.artworkUrl} proposed={data.artworkUrl} />
          <FieldDiff label={t('fieldDescriptionLabel')} current={currentValues!.description} proposed={data.description} />
        </>
      );
    }
    return (
      <>
        <DataPreview label={t('fieldTitleLabel')} value={data.title} />
        <DataPreview label={t('fieldSlugLabel')} value={data.slug} />
        <DataPreview label={t('fieldReciterIdLabel')} value={data.reciterId} />
        <DataPreview label={t('fieldYearLabel')} value={data.year} />
        <DataPreview label={t('fieldArtworkUrlLabel')} value={data.artworkUrl} />
        <DataPreview label={t('fieldDescriptionLabel')} value={data.description} />
      </>
    );
  }

  // track
  const data = submission.data as TrackSubmissionData;
  if (isEdit) {
    const currentLyrics = currentValues!.lyrics ?? {};
    const proposedLyrics = data.lyrics ?? {};
    const allLanguages = Array.from(
      new Set([...Object.keys(currentLyrics), ...Object.keys(proposedLyrics)]),
    );
    return (
      <>
        <FieldDiff label={t('fieldTitleLabel')} current={currentValues!.title} proposed={data.title} />
        <FieldDiff label={t('fieldSlugLabel')} current={currentValues!.slug} proposed={data.slug} />
        <FieldDiff label={t('fieldAlbumIdLabel')} current={currentValues!.albumId} proposed={data.albumId} />
        <FieldDiff label={t('fieldTrackNumberLabel')} current={currentValues!.trackNumber} proposed={data.trackNumber} />
        <FieldDiff label={t('fieldAudioUrlLabel')} current={currentValues!.audioUrl} proposed={data.audioUrl} />
        <FieldDiff label={t('fieldYouTubeIdLabel')} current={currentValues!.youtubeId} proposed={data.youtubeId} />
        <FieldDiff label={t('fieldDurationLabel')} current={currentValues!.duration} proposed={data.duration} />
        {allLanguages.map((lang) => (
          <FieldDiff
            key={lang}
            label={`${t('fieldLyricsLabel')} (${lang})`}
            current={currentLyrics[lang]}
            proposed={proposedLyrics[lang as keyof typeof proposedLyrics]}
          />
        ))}
      </>
    );
  }
  const proposedLyrics = data.lyrics ?? {};
  return (
    <>
      <DataPreview label={t('fieldTitleLabel')} value={data.title} />
      <DataPreview label={t('fieldSlugLabel')} value={data.slug} />
      <DataPreview label={t('fieldAlbumIdLabel')} value={data.albumId} />
      <DataPreview label={t('fieldTrackNumberLabel')} value={data.trackNumber} />
      <DataPreview label={t('fieldAudioUrlLabel')} value={data.audioUrl} />
      <DataPreview label={t('fieldYouTubeIdLabel')} value={data.youtubeId} />
      <DataPreview label={t('fieldDurationLabel')} value={data.duration} />
      {Object.entries(proposedLyrics).map(([lang, text]) => (
        <DataPreview
          key={lang}
          label={`${t('fieldLyricsLabel')} (${lang})`}
          value={text}
        />
      ))}
    </>
  );
}
