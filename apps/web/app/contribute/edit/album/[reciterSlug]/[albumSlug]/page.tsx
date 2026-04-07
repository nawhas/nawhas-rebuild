import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { AlbumForm } from '@/components/contribute/album-form';

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /contribute/edit/album/[reciterSlug]/[albumSlug] — Edit suggestion for an existing album.
 * Access guard enforced by /contribute layout.
 */
export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ reciterSlug: string; albumSlug: string }>;
}): Promise<React.JSX.Element> {
  const { reciterSlug, albumSlug } = await params;
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const album = await caller.album.getBySlug({ reciterSlug, albumSlug }).catch(() => null);
  if (!album) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        Edit Album: {album.title}
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Suggest changes to this album&apos;s details. Your edit will be reviewed before going live.
      </p>
      <AlbumForm
        action="edit"
        targetId={album.id}
        initialValues={{
          title: album.title,
          reciterId: album.reciterId,
          slug: album.slug,
          ...(album.year !== null ? { year: album.year } : {}),
          ...(album.artworkUrl !== null ? { artworkUrl: album.artworkUrl } : {}),
        }}
      />
    </main>
  );
}
