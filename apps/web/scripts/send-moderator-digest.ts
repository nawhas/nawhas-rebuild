/**
 * Hourly moderator digest cron.
 *
 * Selects pending submissions and access_requests with notified_at IS NULL,
 * sends one digest email per moderator, then UPDATEs notified_at on the
 * included rows in a single transaction.
 *
 * At-least-once: on a partial failure between send and UPDATE, the next run
 * will re-include the same items (preferable to silent drops). The 100-row
 * LIMIT bounds the worst-case re-send blast.
 *
 * Run: pnpm --filter @nawhas/web tsx scripts/send-moderator-digest.ts
 */
import { db, submissions, accessRequests, users } from '@nawhas/db';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { sendModeratorDigest } from '@/lib/email';

const BATCH_LIMIT = 100;

async function main(): Promise<void> {
  const appOrigin = process.env['APP_ORIGIN'] ?? 'https://nawhas.com';

  const pendingSubs = await db
    .select({
      id: submissions.id,
      type: submissions.type,
      action: submissions.action,
      contributorName: users.name,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.submittedByUserId))
    .where(and(eq(submissions.status, 'pending'), isNull(submissions.notifiedAt)))
    .orderBy(submissions.createdAt)
    .limit(BATCH_LIMIT);

  const pendingArs = await db
    .select({
      id: accessRequests.id,
      applicantName: users.name,
      applicantEmail: users.email,
      createdAt: accessRequests.createdAt,
    })
    .from(accessRequests)
    .innerJoin(users, eq(users.id, accessRequests.userId))
    .where(and(eq(accessRequests.status, 'pending'), isNull(accessRequests.notifiedAt)))
    .orderBy(accessRequests.createdAt)
    .limit(BATCH_LIMIT);

  if (pendingSubs.length === 0 && pendingArs.length === 0) {
    console.log('[digest] No new items; exit 0.');
    process.exit(0);
  }

  const moderators = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(inArray(users.role, ['moderator']));

  if (moderators.length === 0) {
    console.warn('[digest] No moderators found; skipping send.');
    process.exit(0);
  }

  let sendErrors = 0;
  for (const mod of moderators) {
    try {
      await sendModeratorDigest({
        to: mod.email,
        moderatorName: mod.name,
        newSubmissions: pendingSubs.map((s) => ({
          id: s.id,
          type: s.type as 'reciter' | 'album' | 'track',
          action: s.action as 'create' | 'edit',
          contributorName: s.contributorName,
          createdAt: s.createdAt,
        })),
        newAccessRequests: pendingArs,
        appOrigin,
      });
      console.log(`[digest] sent to ${mod.email}`);
    } catch (err) {
      console.error(`[digest] FAILED for ${mod.email}`, err);
      sendErrors++;
    }
  }

  // Mark as notified — even if some sends failed, we don't want to repeatedly
  // bombard moderators whose addresses succeeded. A single failure shows up
  // in cron logs; persistent issues need address-list cleanup, not retry.
  await db.transaction(async (tx) => {
    if (pendingSubs.length > 0) {
      await tx
        .update(submissions)
        .set({ notifiedAt: sql`now()` })
        .where(inArray(submissions.id, pendingSubs.map((s) => s.id)));
    }
    if (pendingArs.length > 0) {
      await tx
        .update(accessRequests)
        .set({ notifiedAt: sql`now()` })
        .where(inArray(accessRequests.id, pendingArs.map((a) => a.id)));
    }
  });

  console.log(`[digest] done. submissions=${pendingSubs.length} accessRequests=${pendingArs.length} moderators=${moderators.length} sendErrors=${sendErrors}`);
  process.exit(sendErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
