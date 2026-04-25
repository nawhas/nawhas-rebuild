import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
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

  const [album, reciter] = await Promise.all([
    caller.album.getBySlug({ reciterSlug, albumSlug }).catch(() => null),
    caller.reciter.getBySlug({ slug: reciterSlug }).catch(() => null),
  ]);

  if (!album || !reciter) notFound();

  const t = await getTranslations('contribute.pages');

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
            <li aria-current="page" className="text-[var(--text)]">Edit album</li>
          </ol>
        </nav>
        <h1 className="mt-4 font-serif text-4xl font-medium text-[var(--text)]">
          {t('editAlbumTitle', { title: album.title })}
        </h1>
        <p className="mt-2 text-base text-[var(--text-dim)]">
          {t('editAlbumSubtitle')}
        </p>
        <div className="mt-6 rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8">
          <AlbumForm
            action="edit"
            targetId={album.id}
            initialValues={{
              title: album.title,
              reciter: { id: album.reciterId, label: reciter.name },
              year: album.year !== null ? String(album.year) : '',
              description: album.description ?? '',
              artworkUrl: album.artworkUrl ?? null,
            }}
          />
        </div>
      </Container>
    </main>
  );
}
