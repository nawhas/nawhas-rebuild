import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Immutable audit log for moderation and administrative actions.
 * Examples: submission.approved, role.changed, submission.rejected.
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** The user who performed the action. Restricted deletion — users with audit history cannot be deleted. */
  actorUserId: text('actor_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  /** Dot-namespaced action identifier, e.g. "submission.approved". */
  action: text('action').notNull(),
  /** The type of entity affected, e.g. "submission", "user". */
  targetType: text('target_type'),
  /** The ID of the entity affected. */
  targetId: text('target_id'),
  /** Arbitrary metadata about the action (before/after values, context, etc.). */
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
