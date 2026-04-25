import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

/**
 * Application to become a contributor. A user submits one pending request;
 * a moderator approves (promotes role) or rejects (with comment). The
 * applicant can withdraw a pending request before review.
 */
export const accessRequests = pgTable(
  'access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Optional free-text reason supplied by the applicant. */
    reason: text('reason'),
    status: text('status')
      .notNull()
      .default('pending')
      .$type<'pending' | 'approved' | 'rejected' | 'withdrawn'>(),
    /** Moderator who decided. Null while pending or withdrawn. */
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    /** Moderator comment explaining decision. Null while pending or withdrawn. */
    reviewComment: text('review_comment'),
    /** When the moderator decided (approve/reject). Null while pending or withdrawn. */
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    /** When the applicant withdrew. Null unless status='withdrawn'. */
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    /** When the moderator digest cron last included this row. Null while not yet notified. */
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('access_requests_user_id_idx').on(t.userId),
    index('access_requests_status_idx').on(t.status),
    // Only one pending request per user (enforced as a partial unique index).
    uniqueIndex('access_requests_one_pending_per_user')
      .on(t.userId)
      .where(sql`status = 'pending'`),
    // Digest-cron query: pending and unnotified, ordered by createdAt.
    index('access_requests_pending_unnotified_idx')
      .on(t.createdAt)
      .where(sql`status = 'pending' AND notified_at IS NULL`),
  ],
);
