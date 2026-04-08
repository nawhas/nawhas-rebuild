import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { TrackForm } from '@/components/contribute/track-form';

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

  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        Edit Track: {track.title}
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Suggest changes to this track&apos;s details. Your edit will be reviewed before going live.
      </p>
      <TrackForm
        action="edit"
        targetId={track.id}
        initialValues={{
          title: track.title,
          albumId: track.albumId,
          slug: track.slug,
          ...(track.trackNumber !== null ? { trackNumber: track.trackNumber } : {}),
          ...(track.audioUrl !== null ? { audioUrl: track.audioUrl } : {}),
          ...(track.youtubeId !== null ? { youtubeId: track.youtubeId } : {}),
          ...(track.duration !== null ? { duration: track.duration } : {}),
        }}
      />
    </main>
  );
}
