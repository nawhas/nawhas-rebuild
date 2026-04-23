import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { TrackForm } from '@/components/contribute/track-form';
import type { LyricsMap } from '@/components/contribute/lyrics-tabs';

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /contribute/edit/track/[reciterSlug]/[albumSlug]/[trackSlug]
 * Edit suggestion for an existing track.
 * Access guard enforced by /contribute layout.
 */
export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ reciterSlug: string; albumSlug: string; trackSlug: string }>;
}): Promise<React.JSX.Element> {
  const { reciterSlug, albumSlug, trackSlug } = await params;
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const track = await caller.track.getBySlug({ reciterSlug, albumSlug, trackSlug }).catch(() => null);
  if (!track) notFound();

  const t = await getTranslations('contribute.pages');

  // Build lyrics map from the fetched lyrics rows.
  const lyricsMap: LyricsMap = {};
  for (const row of track.lyrics) {
    lyricsMap[row.language as keyof LyricsMap] = row.text;
  }

  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-foreground">
        {t('editTrackTitle', { title: track.title })}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('editTrackSubtitle')}
      </p>
      <TrackForm
        action="edit"
        targetId={track.id}
        defaultAlbum={{ id: track.album.id, label: track.album.title }}
        initialValues={{
          title: track.title,
          trackNumber: track.trackNumber !== null ? String(track.trackNumber) : '',
          audioUrl: track.audioUrl ?? null,
          youtubeId: track.youtubeId ?? '',
          duration: track.duration !== null ? String(track.duration) : '',
          lyrics: lyricsMap,
        }}
      />
    </main>
  );
}
