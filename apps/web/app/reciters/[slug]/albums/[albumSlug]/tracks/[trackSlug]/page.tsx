import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { TrackHeader } from '@/components/tracks/track-header';
import { TrackDetailPlayButton } from '@/components/player/track-detail-play-button';
import { LyricsDisplay } from '@/components/tracks/lyrics-display';
import { buildMetadata } from '@/lib/metadata';

// ISR: revalidate every hour.
export const revalidate = 3600;

const createCaller = createCallerFactory(appRouter);

interface TrackPageProps {
  params: Promise<{ slug: string; albumSlug: string; trackSlug: string }>;
}

export async function generateStaticParams(): Promise<
  { slug: string; albumSlug: string; trackSlug: string }[]
> {
  const caller = createCaller({ db, session: null, user: null });
  const { items: albums } = await caller.album.list({ limit: 100 });

  const paramSets = await Promise.all(
    albums.map(async (album) => {
      const tracks = await caller.track.listByAlbum({
        reciterSlug: album.reciterSlug,
        albumSlug: album.slug,
      });
      return tracks.map((track) => ({
        slug: album.reciterSlug,
        albumSlug: album.slug,
        trackSlug: track.slug,
      }));
    }),
  );

  return paramSets.flat();
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { slug: reciterSlug, albumSlug, trackSlug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const track = await caller.track.getBySlug({ reciterSlug, albumSlug, trackSlug });

  if (!track) {
    return buildMetadata({ title: 'Track Not Found' });
  }

  return buildMetadata({
    title: track.title,
    description: `${track.title} by ${track.reciter.name} — from the album ${track.album.title} on Nawhas.`,
    ...(track.album.artworkUrl ? { image: track.album.artworkUrl } : {}),
  });
}

/**
 * Track Detail Page
 *
 * Server Component — fetches track with reciter, album, and lyrics via tRPC
 * server-side caller. No audio player in Milestone 1; layout space is reserved
 * for the player bar that will be wired in M2.
 *
 * URL: /reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]
 */
export default async function TrackPage({ params }: TrackPageProps): Promise<React.JSX.Element> {
  const { slug: reciterSlug, albumSlug, trackSlug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const track = await caller.track.getBySlug({ reciterSlug, albumSlug, trackSlug });

  if (!track) {
    notFound();
  }

  return (
    <div className="py-10">
      <Container size="md">
        <TrackHeader track={track} />

        <TrackDetailPlayButton track={track} />

        {track.lyrics.length > 0 && (
          <div className="mt-10">
            <LyricsDisplay lyrics={track.lyrics} />
          </div>
        )}
      </Container>
    </div>
  );
}
