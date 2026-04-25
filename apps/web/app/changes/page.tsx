import type { Metadata } from 'next';
import { db } from '@nawhas/db';
import { getTranslations } from 'next-intl/server';
import { createCallerFactory } from '@/server/trpc/trpc';
import { appRouter } from '@/server/trpc/router';
import { buildMetadata } from '@/lib/metadata';
import { setDefaultRequestLocale } from '@/i18n/request-locale';
import { ChangesDaySection } from '@/components/changes/changes-day-section';
import type { RecentChangeDTO } from '@nawhas/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Recent changes',
  description: 'Latest additions and edits to the catalogue.',
});

const createCaller = createCallerFactory(appRouter);

/**
 * Public /changes feed — shows the last 50 catalogue changes grouped by UTC day.
 *
 * Server Component — force-dynamic so the feed is always fresh, no static cache.
 * Public route — no auth required; recentChanges is a publicProcedure.
 */
export default async function ChangesPage(): Promise<React.JSX.Element> {
  setDefaultRequestLocale();
  const caller = createCaller({ db, session: null, user: null });
  const { items } = await caller.home.recentChanges({ limit: 50 });
  const t = await getTranslations('changes');

  // Group by UTC day.
  const groups = new Map<string, { date: Date; changes: RecentChangeDTO[] }>();
  for (const c of items) {
    const day = new Date(c.at).toISOString().slice(0, 10);
    if (!groups.has(day)) groups.set(day, { date: new Date(day), changes: [] });
    groups.get(day)!.changes.push(c);
  }
  const sections = Array.from(groups.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 font-serif text-[36px] font-medium text-[var(--text)]">
        {t('pageTitle')}
      </h1>
      <p className="mb-8 text-sm text-[var(--text-dim)]">{t('pageDescription')}</p>
      {sections.length === 0 ? (
        <p className="text-sm text-[var(--text-faint)]">{t('empty')}</p>
      ) : (
        sections.map((s) => (
          <ChangesDaySection key={s.date.toISOString()} date={s.date} changes={s.changes} />
        ))
      )}
    </main>
  );
}
