import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/layout/container';
import { TrackBreadcrumb } from '@/components/tracks/track-breadcrumb';
import { TrackHero } from '@/components/tracks/track-hero';
import { TrackSidebar } from '@/components/tracks/track-sidebar';
import { YoutubeEmbedSlot } from '@/components/tracks/youtube-embed-slot';
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

  // Related tracks (same reciter, excluding this one) — surfaced in the
  // right-hand sidebar below the waveform. Fired in parallel with the
  // track query above wouldn't work because we need `track.id` first.
  const related = await caller.track.getRelated({ trackId: track.id });

  const tWatch = await getTranslations('trackDetail.watch');

  return (
    <div className="py-10">
      <JsonLd data={buildTrackJsonLd(track, reciterSlug, albumSlug, trackSlug)} />
      <Container size="xl">
        <TrackBreadcrumb track={track} />
        <TrackHero track={track} />

        <div className="mt-10 border-t border-[var(--border)] pt-10">
          <Waveform slug={track.slug} durationSec={track.duration ?? undefined} />
        </div>

        {track.youtubeId && (
          <section aria-labelledby="track-watch-heading" className="mt-10">
            <h2
              id="track-watch-heading"
              className="mb-4 font-serif text-[28px] font-normal tracking-[-0.02em] text-[var(--text)]"
            >
              {tWatch('heading')}
            </h2>
            <YoutubeEmbedSlot
              youtubeId={track.youtubeId}
              title={`${track.title} — YouTube video`}
            />
          </section>
        )}

        {/* 2-col body — lyrics on the left, album+related sidebar on the right */}
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <LyricsDisplay
              lyrics={track.lyrics}
              editHref={`/contribute/edit/track/${reciterSlug}/${albumSlug}/${trackSlug}`}
            />
          </div>
          <TrackSidebar track={track} related={related} />
        </div>
      </Container>
    </div>
  );
}
