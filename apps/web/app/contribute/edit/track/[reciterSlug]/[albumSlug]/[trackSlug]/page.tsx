import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
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
    <main id="main-content" className="py-10">
      <Container size="md">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[13px]">
            <li>
              <Link href="/contribute" className="text-[var(--text-dim)] hover:text-[var(--text)]">
                Contribute
              </Link>
            </li>
            <li className="text-[var(--text-faint)]">/</li>
            <li className="text-[var(--text)]">Edit track</li>
          </ol>
        </nav>
        <h1 className="mt-4 font-serif text-4xl font-medium text-[var(--text)]">
          {t('editTrackTitle', { title: track.title })}
        </h1>
        <p className="mt-2 text-base text-[var(--text-dim)]">
          {t('editTrackSubtitle')}
        </p>
        <div className="mt-6 rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8">
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
        </div>
      </Container>
    </main>
  );
}
