import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
import { AlbumHeader } from '@/components/albums/album-header';
import { TrackList } from '@/components/albums/track-list';
import { PlayAllButton } from '@/components/player/play-all-button';
import { buildMetadata, siteUrl } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/json-ld';
import { buildAlbumJsonLd } from '@/lib/jsonld';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// Dynamic rendering avoids production static-generation conflicts with request-bound APIs.
export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

interface AlbumPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
  setDefaultRequestLocale();
  const { slug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const album = await caller.album.getDetail({ slug });

  if (!album) {
    return buildMetadata({ title: 'Album Not Found' });
  }

  return buildMetadata({
    title: album.title,
    description: `Listen to ${album.title} by ${album.reciterName} on Nawhas.`,
    ...(album.artworkUrl != null && { image: album.artworkUrl }),
    canonical: `${siteUrl()}/albums/${slug}`,
  });
}

/**
 * Album Detail Page
 *
 * Server Component — fetches album with tracks and reciter info via tRPC server-side
 * caller. Track list is display-only in Milestone 1; audio playback is wired in M2.
 */
export default async function AlbumPage({ params }: AlbumPageProps): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const { slug } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const album = await caller.album.getDetail({ slug });

  if (!album) {
    notFound();
  }

  return (
    <main id="main-content" className="py-10">
      <JsonLd data={buildAlbumJsonLd(album)} />
      <Container>
        <AlbumHeader album={album} />
        <div className="mt-4 flex justify-start">
          <PlayAllButton tracks={album.tracks} />
        </div>
        <div className="mt-8">
          <TrackList
            tracks={album.tracks}
            reciterSlug={album.reciterSlug}
            albumSlug={album.slug}
          />
        </div>
      </Container>
    </main>
  );
}
