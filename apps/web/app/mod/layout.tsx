import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth } from '@/lib/auth';

// Mark as dynamic since we use headers() for auth checks on every request
export const dynamic = 'force-dynamic';

/**
 * Moderation layout — /mod/*
 *
 * Server Component. Requires authentication AND moderator role.
 * Non-authenticated users are redirected to /login.
 * Authenticated non-moderators are redirected to /.
 *
 * Renders a shared sidebar nav for all /mod routes.
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar nav */}
      <nav
        aria-label="Moderation navigation"
        className="w-56 shrink-0 border-r border-border bg-muted px-4 py-6"
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Moderation
        </p>
        <ul className="space-y-1">
          {[
            { href: '/mod', label: 'Overview' },
            { href: '/mod/queue', label: 'Queue' },
            { href: '/mod/users', label: 'Users' },
            { href: '/mod/audit', label: 'Audit Log' },
          ].map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
