/**
 * One-shot: flip any submissions stuck in 'approved' (i.e. approved
 * but never applied under the legacy two-step flow) back to 'pending'
 * so they go through the new merged approve+apply path.
 *
 * Idempotent: re-running on a clean DB is a no-op.
 *
 * Run: pnpm --filter @nawhas/web tsx scripts/reset-approved-submissions.ts
 */
import { db, submissions } from '@nawhas/db';
import { eq } from 'drizzle-orm';

async function main(): Promise<void> {
  const result = await db
    .update(submissions)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(submissions.status, 'approved'))
    .returning({ id: submissions.id });
  console.log(`Reset ${result.length} approved submissions to pending.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
