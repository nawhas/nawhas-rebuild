// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { albums, reciters, submissions, users } from '@nawhas/db';
import {
  createTestDb,
  isDbAvailable,
  makeSubmissionCaller,
  type TestDb,
} from './helpers';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();

const contributorId = `sub-contrib-${SUFFIX}`;
const otherUserId = `sub-other-${SUFFIX}`;

const seededReciterIds: string[] = [];
const seededSubmissionIds: string[] = [];

describe.skipIf(!dbAvailable)('Submission Router', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    // Seed minimal user rows so FK constraints are satisfied.
    await db.insert(users).values([
      {
        id: contributorId,
        name: 'Contrib User',
        email: `contrib-${SUFFIX}@example.com`,
        emailVerified: true,
        role: 'contributor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: otherUserId,
        name: 'Other User',
        email: `other-${SUFFIX}@example.com`,
        emailVerified: true,
        role: 'contributor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Seed a reciter for edit-submission tests.
    const [reciter] = await db
      .insert(reciters)
      .values({ name: 'Sub Test Reciter', slug: `sub-test-reciter-${SUFFIX}` })
      .returning({ id: reciters.id });
    if (reciter) seededReciterIds.push(reciter.id);
  });

  afterAll(async () => {
    if (!close) return;
    if (seededSubmissionIds.length > 0) {
      await db.delete(submissions).where(inArray(submissions.id, seededSubmissionIds));
    }
    if (seededReciterIds.length > 0) {
      await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
    }
    await db.delete(users).where(inArray(users.id, [contributorId, otherUserId]));
    await close();
  });

  // ── submission.create ─────────────────────────────────────────────────────

  describe('submission.create', () => {
    it('creates a reciter submission with status=pending', async () => {
      const caller = makeSubmissionCaller(db, contributorId);
      const result = await caller.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'New Reciter Submission' },
      });

      seededSubmissionIds.push(result.id);

      expect(result.type).toBe('reciter');
      expect(result.action).toBe('create');
      expect(result.status).toBe('pending');
      expect(result.submittedByUserId).toBe(contributorId);
    });

    it('creates an edit submission for an existing reciter', async () => {
      const caller = makeSubmissionCaller(db, contributorId);
      const result = await caller.create({
        type: 'reciter',
        action: 'edit',
        targetId: seededReciterIds[0]!,
        data: { name: 'Updated Reciter Name' },
      });

      seededSubmissionIds.push(result.id);

      expect(result.action).toBe('edit');
      expect(result.targetId).toBe(seededReciterIds[0]);
    });

    it('throws NOT_FOUND for edit submission with unknown targetId', async () => {
      const caller = makeSubmissionCaller(db, contributorId);
      await expect(
        caller.create({
          type: 'reciter',
          action: 'edit',
          targetId: '00000000-0000-0000-0000-000000000000',
          data: { name: 'Ghost Reciter' },
        }),
      ).rejects.toThrow('No reciter found');
    });

    it('throws BAD_REQUEST for edit submission without targetId', async () => {
      const caller = makeSubmissionCaller(db, contributorId);
      await expect(
        caller.create({
          type: 'reciter',
          action: 'edit',
          data: { name: 'Missing Target' },
        }),
      ).rejects.toThrow('targetId is required');
    });

    it('throws FORBIDDEN for a user with role=user', async () => {
      const userCaller = makeSubmissionCaller(db, otherUserId, 'user');
      await expect(
        userCaller.create({
          type: 'reciter',
          action: 'create',
          data: { name: 'Unauthorized' },
        }),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  // ── submission.update ─────────────────────────────────────────────────────

  describe('submission.update', () => {
    it('updates a changes_requested submission and re-queues as pending', async () => {
      // Seed a changes_requested submission directly.
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Original Name' },
          status: 'changes_requested',
          submittedByUserId: contributorId,
        })
        .returning();

      seededSubmissionIds.push(seeded!.id);

      const caller = makeSubmissionCaller(db, contributorId);
      const result = await caller.update({
        id: seeded!.id,
        type: 'reciter',
        data: { name: 'Revised Name' },
      });

      expect((result.data as { name: string }).name).toBe('Revised Name');
      expect(result.status).toBe('pending');
    });

    it('throws FORBIDDEN if non-owner tries to update', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Owner Only' },
          status: 'draft',
          submittedByUserId: contributorId,
        })
        .returning();

      seededSubmissionIds.push(seeded!.id);

      const otherCaller = makeSubmissionCaller(db, otherUserId);
      await expect(
        otherCaller.update({ id: seeded!.id, type: 'reciter', data: { name: 'Hijacked' } }),
      ).rejects.toThrow('You can only edit');
    });

    it('throws BAD_REQUEST if submission is in pending status', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Locked' },
          status: 'pending',
          submittedByUserId: contributorId,
        })
        .returning();

      seededSubmissionIds.push(seeded!.id);

      const caller = makeSubmissionCaller(db, contributorId);
      await expect(
        caller.update({ id: seeded!.id, type: 'reciter', data: { name: 'New' } }),
      ).rejects.toThrow('Only draft or changes_requested');
    });
  });

  // ── submission.myHistory ──────────────────────────────────────────────────

  describe('submission.myHistory', () => {
    it('returns only the calling user\'s submissions', async () => {
      // Seed one submission for otherUser to ensure isolation.
      const [otherSub] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Other User Sub' },
          status: 'pending',
          submittedByUserId: otherUserId,
        })
        .returning();
      seededSubmissionIds.push(otherSub!.id);

      const caller = makeSubmissionCaller(db, contributorId);
      const result = await caller.myHistory({ limit: 50 });

      expect(result.items.every((s) => s.submittedByUserId === contributorId)).toBe(true);
    });

    it('returns nextCursor when there are more results', async () => {
      // Seed 3 submissions for contributor.
      const values = Array.from({ length: 3 }, (_, i) => ({
        type: 'reciter' as const,
        action: 'create' as const,
        data: { name: `Paged Sub ${i}` },
        status: 'pending' as const,
        submittedByUserId: contributorId,
      }));
      const seeded = await db.insert(submissions).values(values).returning();
      for (const s of seeded) seededSubmissionIds.push(s.id);

      const caller = makeSubmissionCaller(db, contributorId);
      const page1 = await caller.myHistory({ limit: 2 });

      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await caller.myHistory({ limit: 2, cursor: page1.nextCursor! });
      expect(page2.items.length).toBeGreaterThan(0);
      // No overlap between pages.
      const page1Ids = page1.items.map((s) => s.id);
      const page2Ids = page2.items.map((s) => s.id);
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
    });
  });

  // ── submission.get ────────────────────────────────────────────────────────

  describe('submission.get', () => {
    it('allows owner to view their own submission', async () => {
      const caller = makeSubmissionCaller(db, contributorId);
      const created = await caller.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'Get Test' },
      });
      seededSubmissionIds.push(created.id);

      const fetched = await caller.get({ id: created.id });
      expect(fetched.id).toBe(created.id);
    });

    it('throws FORBIDDEN for non-owner non-moderator', async () => {
      const ownerCaller = makeSubmissionCaller(db, contributorId);
      const created = await ownerCaller.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'Private Sub' },
      });
      seededSubmissionIds.push(created.id);

      const otherCaller = makeSubmissionCaller(db, otherUserId);
      await expect(otherCaller.get({ id: created.id })).rejects.toThrow('Access denied');
    });

    it('allows moderator to view any submission', async () => {
      const [seeded] = await db
        .insert(submissions)
        .values({
          type: 'reciter',
          action: 'create',
          data: { name: 'Mod Visible' },
          status: 'pending',
          submittedByUserId: contributorId,
        })
        .returning();
      seededSubmissionIds.push(seeded!.id);

      const modCaller = makeSubmissionCaller(db, otherUserId, 'moderator');
      const result = await modCaller.get({ id: seeded!.id });
      expect(result.id).toBe(seeded!.id);
    });

    it('throws NOT_FOUND for a non-existent id', async () => {
      const caller = makeSubmissionCaller(db, contributorId);
      await expect(
        caller.get({ id: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toThrow('Submission not found');
    });
  });

  // ── rich-field schema tests ───────────────────────────────────────────────

  it('accepts a reciter create with rich fields', async () => {
    const caller = makeSubmissionCaller(db, contributorId);
    const res = await caller.create({
      type: 'reciter',
      action: 'create',
      data: {
        name: 'Rich Reciter',
        arabicName: 'ريتش',
        country: 'IQ',
        birthYear: 1970,
        description: 'A short bio.',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    });
    seededSubmissionIds.push(res.id);
    expect(res.data).toMatchObject({
      name: 'Rich Reciter',
      arabicName: 'ريتش',
      country: 'IQ',
      birthYear: 1970,
      description: 'A short bio.',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('rejects a reciter birthYear before 1800', async () => {
    const caller = makeSubmissionCaller(db, contributorId);
    await expect(
      caller.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'Too Old', birthYear: 1500 },
      }),
    ).rejects.toThrow(/birthYear/);
  });

  it('rejects a reciter description over 500 chars', async () => {
    const caller = makeSubmissionCaller(db, contributorId);
    await expect(
      caller.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'Too Long', description: 'x'.repeat(501) },
      }),
    ).rejects.toThrow(/description/);
  });

  it('accepts an album create with description (slug omitted)', async () => {
    const caller = makeSubmissionCaller(db, contributorId);
    const res = await caller.create({
      type: 'album',
      action: 'create',
      data: {
        title: 'Album With Description',
        reciterId: seededReciterIds[0]!,
        description: 'Album notes.',
      },
    });
    seededSubmissionIds.push(res.id);
    expect((res.data as { description?: string }).description).toBe('Album notes.');
  });

  it('accepts a track create with lyrics map', async () => {
    const [album] = await db
      .insert(albums)
      .values({
        title: `Lyrics Test Album ${SUFFIX}`,
        slug: `lyrics-test-album-${SUFFIX}`,
        reciterId: seededReciterIds[0]!,
      })
      .returning({ id: albums.id });
    const caller = makeSubmissionCaller(db, contributorId);
    const res = await caller.create({
      type: 'track',
      action: 'create',
      data: {
        title: 'Track With Lyrics',
        albumId: album!.id,
        lyrics: { ar: 'اللغة العربية', en: 'English text' },
      },
    });
    seededSubmissionIds.push(res.id);
    await db.delete(albums).where(eq(albums.id, album!.id));
    expect((res.data as { lyrics?: Record<string, string> }).lyrics).toEqual({
      ar: 'اللغة العربية',
      en: 'English text',
    });
  });
});
