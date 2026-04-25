import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { Container } from '@/components/layout/container';
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
            <li className="text-[var(--text)]">Edit reciter</li>
          </ol>
        </nav>
        <h1 className="mt-4 font-serif text-4xl font-medium text-[var(--text)]">
          {t('editReciterTitle', { name: reciter.name })}
        </h1>
        <p className="mt-2 text-base text-[var(--text-dim)]">
          {t('editReciterSubtitle')}
        </p>
        <div className="mt-6 rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-8">
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
        </div>
      </Container>
    </main>
  );
}
