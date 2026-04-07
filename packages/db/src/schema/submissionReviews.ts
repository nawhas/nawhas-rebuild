import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { submissions } from './submissions.js';
import { users } from './users.js';

/**
 * Moderator review actions on a submission.
 * Each review records the action taken and an optional comment.
 */
export const submissionReviews = pgTable('submission_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => submissions.id, { onDelete: 'cascade' }),
  reviewerUserId: text('reviewer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  /** The moderation action taken. */
  action: text('action').notNull().$type<'approved' | 'rejected' | 'changes_requested'>(),
  /** Optional public-facing or internal comment from the reviewer. */
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
