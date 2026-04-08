import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { ReciterForm } from '@/components/contribute/reciter-form';

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /contribute/edit/reciter/[slug] — Edit suggestion for an existing reciter.
 * Pre-fills the form with current values.
 * Access guard enforced by /contribute layout.
 */
export default async function EditReciterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  const caller = createCaller({
    db,
    session: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  });

  const reciter = await caller.reciter.getBySlug({ slug }).catch(() => null);
  if (!reciter) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        Edit Reciter: {reciter.name}
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Suggest changes to this reciter&apos;s details. Your edit will be reviewed before going live.
      </p>
      <ReciterForm
        action="edit"
        targetId={reciter.id}
        initialValues={{ name: reciter.name, slug: reciter.slug }}
      />
    </main>
  );
}
