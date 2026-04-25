import { eq, sql } from 'drizzle-orm';
import { submissions } from '@nawhas/db';
import { router, protectedProcedure } from '../trpc/trpc';
import type { ContributorDashboardStatsDTO } from '@nawhas/types';

export const dashboardRouter = router({
  /**
   * Owner-scoped contributor dashboard stats.
   * approvalRate denominator excludes withdrawn so self-cancellations don't
   * tank the score.
   * last4WeeksBuckets: 28 entries oldest→newest (UTC days), index 0 = 27 days
   * ago, index 27 = today.
   */
  mine: protectedProcedure.query(async ({ ctx }): Promise<ContributorDashboardStatsDTO> => {
    const [agg] = await ctx.db
      .select({
        total: sql<number>`count(*)::int`,
        approved: sql<number>`count(*) filter (where status = 'applied')::int`,
        pending: sql<number>`count(*) filter (where status in ('pending', 'changes_requested'))::int`,
        withdrawn: sql<number>`count(*) filter (where status = 'withdrawn')::int`,
      })
      .from(submissions)
      .where(eq(submissions.submittedByUserId, ctx.user.id));

    const total = Number(agg?.total ?? 0);
    const approved = Number(agg?.approved ?? 0);
    const pending = Number(agg?.pending ?? 0);
    const withdrawn = Number(agg?.withdrawn ?? 0);
    const denom = total - withdrawn;
    const approvalRate = denom > 0 ? approved / denom : 0;

    const buckets = await ctx.db.execute<{ day_offset: number; n: number }>(sql`
      SELECT (CURRENT_DATE - ${submissions.createdAt}::date)::int AS day_offset, COUNT(*)::int AS n
      FROM ${submissions}
      WHERE ${submissions.submittedByUserId} = ${ctx.user.id}
        AND ${submissions.createdAt} >= CURRENT_DATE - interval '27 days'
      GROUP BY day_offset
    `);
    const last4WeeksBuckets: number[] = Array(28).fill(0);
    const rows = Array.isArray(buckets) ? buckets : (buckets as { rows?: { day_offset: number; n: number }[] }).rows ?? [];
    for (const row of rows) {
      const offset = Number(row.day_offset);
      const n = Number(row.n);
      if (offset >= 0 && offset <= 27) last4WeeksBuckets[27 - offset] = n;
    }

    return { total, approved, pending, withdrawn, approvalRate, last4WeeksBuckets };
  }),
});
