import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
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

  const t = await getTranslations('contribute.pages');

  return (
    <main id="main-content" className="mx-auto max-w-xl py-10 px-4">
      <h1 className="mb-1 text-2xl font-bold text-foreground">
        {t('editReciterTitle', { name: reciter.name })}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('editReciterSubtitle')}
      </p>
      <ReciterForm
        action="edit"
        targetId={reciter.id}
        initialValues={{
          name: reciter.name,
          ...(reciter.arabicName != null ? { arabicName: reciter.arabicName } : {}),
          ...(reciter.country != null ? { country: reciter.country } : {}),
          ...(reciter.birthYear != null ? { birthYear: String(reciter.birthYear) } : {}),
          ...(reciter.description != null ? { description: reciter.description } : {}),
          ...(reciter.avatarUrl !== undefined ? { avatarUrl: reciter.avatarUrl } : {}),
        }}
      />
    </main>
  );
}
