import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { TrackHeader } from '@/components/tracks/track-header';
import { TrackActions } from '@/components/tracks/track-actions';
import { TrackDetailPlayButton } from '@/components/player/track-detail-play-button';
import { MediaToggle } from '@/components/tracks/media-toggle';
import { LyricsDisplay } from '@/components/tracks/lyrics-display';
import { Waveform } from '@nawhas/ui';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/json-ld';
import { buildTrackJsonLd } from '@/lib/jsonld';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// Dynamic rendering avoids production static-generation conflicts with request-bound APIs.
export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

interface TrackPageProps {
  params: Promise<{ slug: string; albumSlug: string; trackSlug: string }>;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  setDefaultRequestLocale();
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
    canonical: `${siteUrl()}/reciters/${reciterSlug}/albums/${albumSlug}/tracks/${trackSlug}`,
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
  setDefaultRequestLocale();
  const { slug: reciterSlug, albumSlug, trackSlug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const track = await caller.track.getBySlug({ reciterSlug, albumSlug, trackSlug });

  if (!track) {
    notFound();
  }

  return (
    <div className="py-10">
      <JsonLd data={buildTrackJsonLd(track, reciterSlug, albumSlug, trackSlug)} />
      <Container size="md">
        <TrackHeader track={track} />
        <TrackActions trackId={track.id} />

        {track.youtubeId ? (
          <MediaToggle track={track} />
        ) : (
          <TrackDetailPlayButton track={track} lyrics={track.lyrics} />
        )}

        <div className="mt-6">
          <Waveform slug={track.slug} durationSec={track.duration ?? undefined} />
        </div>

        {track.lyrics.length > 0 && (
          <div className="mt-10">
            <LyricsDisplay lyrics={track.lyrics} />
          </div>
        )}
      </Container>
    </div>
  );
}
