import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Community submission for creating or editing reciters, albums, or tracks.
 * Submitted by contributors and reviewed by moderators.
 */
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Entity type being submitted. */
    type: text('type').notNull().$type<'reciter' | 'album' | 'track'>(),
    /** Whether this is a new-content submission or an edit to an existing entity. */
    action: text('action').notNull().$type<'create' | 'edit'>(),
    /** FK to the existing entity being edited; null for new-content submissions. */
    targetId: uuid('target_id'),
    /** Submitted field values — Zod-validated at the API layer. */
    data: jsonb('data').notNull(),
    /** Moderation status of the submission. */
    status: text('status')
      .notNull()
      .default('pending')
      .$type<'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'>(),
    submittedByUserId: text('submitted_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** Optional moderator-facing notes. */
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('submissions_submitted_by_user_id_idx').on(t.submittedByUserId),
    index('submissions_status_idx').on(t.status),
    index('submissions_type_action_idx').on(t.type, t.action),
  ],
);
