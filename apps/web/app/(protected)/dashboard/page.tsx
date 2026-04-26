import * as React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@nawhas/ui';
import { db } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { ContributorHero } from '@/components/contributor/contributor-hero';
import { DashboardTabs } from './dashboard-client';

export const metadata: Metadata = buildMetadata({
  title: 'Dashboard',
  description: 'Your contributor dashboard.',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

/**
 * /dashboard — contributor self-view: hero + headline stats + submission tabs.
 *
 * Auth gate inherited from (protected) layout, but we re-fetch the session
 * here to read user fields (username, trustLevel) that the layout doesn't
 * surface to children. Initial submissions for the "all" tab are fetched
 * server-side; the DashboardTabs client component refetches when the user
 * switches tabs.
 */
export default async function DashboardPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionData) {
    redirect('/login?callbackUrl=' + encodeURIComponent('/dashboard'));
  }

  const caller = createCaller({
    db,
    session: sessionData.session,
    user: sessionData.user,
  });
  const stats = await caller.dashboard.mine();
  const initialAll = await caller.submission.myHistory({ limit: 50, status: 'all' });

  const user = sessionData.user as {
    name: string;
    username?: string | null;
    trustLevel?: string;
  };
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '·';
  // Fallback: if Better-Auth session doesn't surface username yet, derive a
  // safe handle from the display name. Keeps "View profile" off when there's
  // no real username on the user row.
  const fallbackUsername = user.username ?? user.name.toLowerCase().replace(/\s+/g, '_');

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-10 md:grid-cols-[1fr_280px]">
        <div>
          <ContributorHero
            name={user.name}
            username={fallbackUsername}
            bio={null}
            trustLevel={(user.trustLevel as 'new' | 'regular' | 'trusted' | 'maintainer') ?? 'new'}
            avatarInitials={initials}
            variant="dashboard"
          />

          <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Total', value: stats.total },
              { label: 'Approved', value: stats.approved },
              { label: 'Pending', value: stats.pending },
              { label: 'Approval Rate', value: `${Math.round(stats.approvalRate * 100)}%` },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-5 text-center"
              >
                <div className="font-serif text-3xl font-semibold text-[var(--text)]">
                  {s.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-[var(--text-faint)]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <DashboardTabs initialItems={initialAll.items} />
        </div>

        <aside>
          <div className="mb-6 rounded-[12px] bg-[var(--accent-glow)] p-5">
            <h3 className="mb-2 text-sm font-medium text-[var(--text)]">Quick Actions</h3>
            <Button asChild className="mb-2 w-full">
              <Link href="/contribute">New submission</Link>
            </Button>
            {user.username && (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/contributor/${user.username}`}>View profile</Link>
              </Button>
            )}
          </div>

          <MostNeededPanel />
        </aside>
      </div>
    </main>
  );
}

/**
 * "Most Needed" sidebar panel — POC visual restoration.
 *
 * Shows three contribution categories (Translations / Lyrics / Metadata)
 * with placeholder counts (`—`). Real counts are tracked as a Phase 2.6
 * follow-up in the rebuild roadmap; the panel is intentionally inert
 * until those backend aggregations land.
 *
 * Server Component — pure presentation, async only because next-intl's
 * server-side `getTranslations` returns a Promise.
 */
async function MostNeededPanel(): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard.mostNeeded');
  const items = [t('translations'), t('lyrics'), t('metadata')];

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
        {t('heading')}
      </h3>
      <ul className="flex flex-col">
        {items.map((label, idx) => (
          <li
            key={label}
            className={`flex items-center justify-between py-2 text-xs text-[var(--text)] ${idx < items.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
          >
            <span>{label}</span>
            <span aria-hidden="true" className="text-[var(--text-faint)]">—</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
