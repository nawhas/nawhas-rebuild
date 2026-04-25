import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@nawhas/db';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { ContributorHero } from '@/components/contributor/contributor-hero';
import { Heatmap } from '@/components/contributor/heatmap';

export const dynamic = 'force-dynamic';

const createCaller = createCallerFactory(appRouter);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return buildMetadata({
    title: `@${username}`,
    description: `Contributor profile for @${username} on Nawhas.`,
  });
}

/**
 * Public /contributor/[username] profile.
 *
 * Renders ContributorHero (avatar + trust pill + headline stats),
 * a yearly contribution heatmap, summary stat cards, and trust-tier badges.
 * No auth required — public read.
 */
export default async function ContributorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<React.JSX.Element> {
  const { username } = await params;
  const caller = createCaller({ db, session: null, user: null });
  const [profile, heatmap] = await Promise.all([
    caller.home.contributorProfile({ username }),
    caller.home.contributorHeatmap({ username }),
  ]);
  if (!profile) notFound();
  const year = new Date().getUTCFullYear();

  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 py-16">
      <ContributorHero
        name={profile.name}
        username={profile.username}
        bio={profile.bio}
        trustLevel={profile.trustLevel}
        avatarInitials={profile.avatarInitials}
        stats={{
          total: profile.stats.total,
          approved: profile.stats.approved,
          approvalRate: profile.stats.approvalRate,
        }}
      />

      <section className="mt-16">
        <h2 className="mb-5 font-serif text-2xl font-medium text-[var(--text)]">
          Contribution Activity
        </h2>
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <Heatmap buckets={heatmap} year={year} />
        </div>
      </section>

      <section className="mt-10 grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: profile.stats.total },
          { label: 'Approved', value: profile.stats.approved },
          { label: 'Pending', value: profile.stats.pending },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 text-center"
          >
            <div className="font-serif text-3xl font-semibold text-[var(--text)]">
              {stat.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-[var(--text-faint)]">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="mb-3 text-sm font-medium text-[var(--text)]">Badges</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {profile.trustLevel === 'maintainer' && (
            <span className="rounded-[6px] bg-[var(--accent-glow)] px-3 py-1 text-[var(--accent)]">
              ⭐ Maintainer
            </span>
          )}
          {profile.trustLevel === 'trusted' && (
            <span className="rounded-[6px] bg-[var(--accent-glow)] px-3 py-1 text-[var(--accent)]">
              ✓ Trusted
            </span>
          )}
          {profile.stats.total >= 100 && (
            <span className="rounded-[6px] bg-[var(--surface-2)] px-3 py-1 text-[var(--text-dim)]">
              🏆 100+ Contributions
            </span>
          )}
          {profile.trustLevel === 'new' && profile.stats.total < 100 && (
            <span className="text-[var(--text-faint)]">No badges yet</span>
          )}
        </div>
      </section>
    </main>
  );
}
