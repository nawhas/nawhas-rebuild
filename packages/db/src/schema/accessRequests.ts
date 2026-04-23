import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

/**
 * Application to become a contributor. A user submits one pending request;
 * a moderator approves (promotes role) or rejects (with comment).
 * Consumed by the W3 workstream; migrated now so both W1 and W3 share one
 * schema migration event.
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
      .$type<'pending' | 'approved' | 'rejected'>(),
    /** Moderator who decided. Null while pending. */
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    /** Moderator comment explaining decision. Null while pending. */
    reviewComment: text('review_comment'),
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
  ],
);
