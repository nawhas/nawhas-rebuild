import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { ModNav } from '@/components/mod/mod-nav';

// Mark as dynamic since we use headers() for auth checks on every request
export const dynamic = 'force-dynamic';

/**
 * Moderation layout — /mod/*
 *
 * Server Component. Requires authentication AND moderator role.
 * Non-authenticated users are redirected to /login.
 * Authenticated non-moderators are redirected to /.
 *
 * Renders a shared horizontal sub-nav for all /mod routes.
 */
export default async function ModLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  if (!sessionData) {
    const callbackPath = reqHeaders.get('x-pathname') ?? '/mod';
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const role = (sessionData.user as { role?: string }).role;
  if (role !== 'moderator') {
    redirect('/');
  }

  const t = await getTranslations('mod.nav');

  const items = [
    { href: '/mod', label: t('overview') },
    { href: '/mod/queue', label: t('queue') },
    { href: '/mod/users', label: t('users') },
    { href: '/mod/audit', label: t('audit') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Sub-nav header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg)] px-6 pt-8 pb-0">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-4 font-serif text-4xl font-medium text-[var(--text)]">
            {t('heading')}
          </h1>
          <ModNav items={items} />
        </div>
      </div>

      {/* Main content */}
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
