// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { albums, auditLog, reciters, submissionReviews, submissions, tracks, users } from '@nawhas/db';
import {
  createTestDb,
  isDbAvailable,
  makeModerationCaller,
  type TestDb,
} from './helpers';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();

const moderatorId = `mod-mod-${SUFFIX}`;
const contributorId = `mod-contrib-${SUFFIX}`;

const seededReciterIds: string[] = [];
const seededAlbumIds: string[] = [];
const seededTrackIds: string[] = [];
const seededSubmissionIds: string[] = [];
const seededUserIds: string[] = [];

describe.skipIf(!dbAvailable)('Moderation Router', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    // Seed minimal user rows.
    await db.insert(users).values([
      {
        id: moderatorId,
        name: 'Mod User',
        email: `mod-${SUFFIX}@example.com`,
        emailVerified: true,
        role: 'moderator',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: contributorId,
        name: 'Contrib User',
        email: `modtest-contrib-${SUFFIX}@example.com`,
        emailVerified: true,
        role: 'contributor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    seededUserIds.push(moderatorId, contributorId);

    // Seed a reciter for edit-submission tests.
    const [reciter] = await db
      .insert(reciters)
      .values({ name: 'Mod Test Reciter', slug: `mod-test-reciter-${SUFFIX}` })
      .returning({ id: reciters.id });
    if (reciter) seededReciterIds.push(reciter.id);
  });

  afterAll(async () => {
    if (!close) return;
    if (seededSubmissionIds.length > 0) {
      await db.delete(submissions).where(inArray(submissions.id, seededSubmissionIds));
    }
    if (seededTrackIds.length > 0) {
      await db.delete(tracks).where(inArray(tracks.id, seededTrackIds));
    }
    if (seededAlbumIds.length > 0) {
      await db.delete(albums).where(inArray(albums.id, seededAlbumIds));
    }
    if (seededReciterIds.length > 0) {
      await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
    }
    if (seededUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, seededUserIds));
    }
    await close();
  });

  // ── moderation.queue ──────────────────────────────────────────────────────

  describe('moderation.queue', () => {
    it('returns pending submissions', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Queue Test Sub' },
          status: 'pending',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.queue({ limit: 50 });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every((s) => s.status === 'pending' || s.status === 'changes_requested')).toBe(true);
    });

    it('supports cursor-based pagination', async () => {
      // Seed 3 pending submissions.
      const values = Array.from({ length: 3 }, (_, i) => ({
        type: 'reciter' as const,
        action: 'create' as const,
        data: { name: `Queue Paged ${i}` },
        status: 'pending' as const,
        submittedByUserId: contributorId,
      }));
      const seeded = await db.insert(submissions).values(values).returning();
      for (const s of seeded) seededSubmissionIds.push(s.id);

      const caller = makeModerationCaller(db, moderatorId);
      const page1 = await caller.queue({ limit: 2 });

      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).not.toBeNull();
    });

    it('throws FORBIDDEN for non-moderator', async () => {
      // A contributor-role caller should be rejected by moderatorProcedure.
      // makeSubmissionCaller uses contributorProcedure-level context; we need a
      // moderation-router caller with contributor role to test the middleware gate.
      const { makeAuthCtx } = await import('./helpers');
      const { createCallerFactory } = await import('../../trpc/trpc');
      const { moderationRouter } = await import('../moderation');
      const ctx = makeAuthCtx(db, contributorId, 'contributor');
      const restrictedCaller = createCallerFactory(moderationRouter)(ctx);
      await expect(restrictedCaller.queue({ limit: 10 })).rejects.toThrow('FORBIDDEN');
    });
  });

  // ── moderation.review ─────────────────────────────────────────────────────

  describe('moderation.review', () => {
    it('approves a pending submission and writes a review record', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Review Approve Sub' },
          status: 'pending',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.review({
        submissionId: seeded!.id,
        action: 'approved',
        comment: 'Looks good!',
      });

      expect(result.status).toBe('approved');

      // Verify a review record was written.
      const reviews = await db
        .select()
        .from(submissionReviews)
        .where(
          // inArray on a single value
          inArray(submissionReviews.submissionId, [seeded!.id]),
        );
      expect(reviews).toHaveLength(1);
      expect(reviews[0]!.action).toBe('approved');
    });

    it('sets status to changes_requested and writes audit log', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Review Changes Sub' },
          status: 'pending',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.review({
        submissionId: seeded!.id,
        action: 'changes_requested',
        comment: 'Please fix the name.',
      });

      expect(result.status).toBe('changes_requested');

      // Verify audit log entry.
      const logs = await db
        .select()
        .from(auditLog)
        .where(inArray(auditLog.targetId, [seeded!.id]));
      expect(logs.some((l) => l.action === 'submission.changes_requested')).toBe(true);
    });

    it('throws BAD_REQUEST when reviewing an already-approved submission', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Already Approved' },
          status: 'approved',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      await expect(
        caller.review({ submissionId: seeded!.id, action: 'approved' }),
      ).rejects.toThrow('Only pending or changes_requested');
    });
  });

  // ── moderation.applyApproved ──────────────────────────────────────────────

  describe('moderation.applyApproved', () => {
    it('inserts a new reciter for action=create', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: `Apply New Reciter ${SUFFIX}`, slug: `apply-new-reciter-${SUFFIX}` },
          status: 'approved',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.applyApproved({ submissionId: seeded!.id });

      expect(result.success).toBe(true);
      expect(result.entityId).toBeTruthy();
      seededReciterIds.push(result.entityId);

      // Verify the reciter was inserted.
      const rows = await db
        .select()
        .from(reciters)
        .where(inArray(reciters.id, [result.entityId]));
      expect(rows).toHaveLength(1);
      expect(rows[0]!.name).toBe(`Apply New Reciter ${SUFFIX}`);
    });

    it('updates an existing reciter for action=edit', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'edit',
          targetId: seededReciterIds[0]!,
          data: { name: `Edited Reciter Name ${SUFFIX}`, slug: `edited-reciter-${SUFFIX}` },
          status: 'approved',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.applyApproved({ submissionId: seeded!.id });

      expect(result.success).toBe(true);
      expect(result.entityId).toBe(seededReciterIds[0]);

      const rows = await db
        .select()
        .from(reciters)
        .where(inArray(reciters.id, [seededReciterIds[0]!]));
      expect(rows[0]!.name).toBe(`Edited Reciter Name ${SUFFIX}`);
    });

    it('throws BAD_REQUEST when submission is not approved', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Not Approved Yet' },
          status: 'pending',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      await expect(caller.applyApproved({ submissionId: seeded!.id })).rejects.toThrow('Only approved submissions');
    });

    it('generates a slug from name when slug is not provided', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: `Auto Slug Reciter ${SUFFIX}` },
          status: 'approved',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.applyApproved({ submissionId: seeded!.id });
      seededReciterIds.push(result.entityId);

      const rows = await db
        .select()
        .from(reciters)
        .where(inArray(reciters.id, [result.entityId]));
      expect(rows[0]!.slug).toBeTruthy();
      expect(rows[0]!.slug).not.toContain(' ');
    });
  });

  // ── moderation.setRole ───────────────────────────────────────────────────

  describe('moderation.setRole', () => {
    const targetUserId = `00000000-0000-4000-8000-${String(SUFFIX).padStart(12, '0')}`.slice(0, 36);

    beforeAll(async () => {
      await db.insert(users).values({
        id: targetUserId,
        name: 'Role Target User',
        email: `role-target-${SUFFIX}@example.com`,
        emailVerified: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      seededUserIds.push(targetUserId);
    });

    it('allows moderator to set role to contributor', async () => {
      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.setRole({ userId: targetUserId, role: 'contributor' });
      expect(result.success).toBe(true);

      const rows = await db.select({ role: users.role }).from(users).where(inArray(users.id, [targetUserId]));
      expect(rows[0]!.role).toBe('contributor');

      // Verify audit log entry.
      const logs = await db
        .select()
        .from(auditLog)
        .where(inArray(auditLog.targetId, [targetUserId]));
      const log = logs.find((l) => l.action === 'role.changed' && (l.meta as Record<string, string>).newRole === 'contributor');
      expect(log).toBeDefined();
      expect(log!.actorUserId).toBe(moderatorId);
      expect(log!.targetId).toBe(targetUserId);
      expect((log!.meta as Record<string, string>).oldRole).toBe('user');
      expect((log!.meta as Record<string, string>).newRole).toBe('contributor');
    });

    it('allows moderator to set role back to user', async () => {
      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.setRole({ userId: targetUserId, role: 'user' });
      expect(result.success).toBe(true);

      const rows = await db.select({ role: users.role }).from(users).where(inArray(users.id, [targetUserId]));
      expect(rows[0]!.role).toBe('user');
    });

    it('rejects moderator attempting to promote to moderator', async () => {
      const caller = makeModerationCaller(db, moderatorId);
      // TypeScript prevents this at compile time; we cast to test runtime validation.
      await expect(
        caller.setRole({ userId: targetUserId, role: 'moderator' as 'user' | 'contributor' }),
      ).rejects.toThrow();
    });

    it('throws NOT_FOUND for unknown userId', async () => {
      const caller = makeModerationCaller(db, moderatorId);
      await expect(
        caller.setRole({ userId: '00000000-0000-0000-0000-000000000000', role: 'contributor' }),
      ).rejects.toThrow('User not found');
    });
  });

  // ── moderation.auditLog ───────────────────────────────────────────────────

  describe('moderation.auditLog', () => {
    it('returns audit log entries in descending order', async () => {
      // Insert two entries.
      await db.insert(auditLog).values([
        { actorUserId: moderatorId, action: 'test.action1', targetType: 'submission', targetId: 'x' },
        { actorUserId: moderatorId, action: 'test.action2', targetType: 'submission', targetId: 'y' },
      ]);

      const caller = makeModerationCaller(db, moderatorId);
      const result = await caller.auditLog({ limit: 10 });

      expect(result.items.length).toBeGreaterThan(0);
      // Newest first.
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i]!.createdAt >= result.items[i + 1]!.createdAt).toBe(true);
      }
    });

    it('paginates via cursor', async () => {
      await db.insert(auditLog).values(
        Array.from({ length: 5 }, (_, i) => ({
          actorUserId: moderatorId,
          action: `test.paginate${i}`,
        })),
      );

      const caller = makeModerationCaller(db, moderatorId);
      const page1 = await caller.auditLog({ limit: 3 });

      expect(page1.items).toHaveLength(3);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await caller.auditLog({ limit: 3, cursor: page1.nextCursor! });
      const page1Ids = page1.items.map((e) => e.id);
      const page2Ids = page2.items.map((e) => e.id);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });
  });
});
