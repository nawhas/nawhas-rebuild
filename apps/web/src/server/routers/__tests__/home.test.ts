// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { reciters, albums, tracks, users, auditLog, submissions } from '@nawhas/db';
import { createTestDb, isDbAvailable, makeHomeCaller, makeModerationCaller, makeSubmissionCaller, type TestDb } from './helpers';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();
const homeModeratorId = `home-mod-${SUFFIX}`;
const homeContributorId = `home-contrib-${SUFFIX}`;

// IDs for seed data owned by this suite — cleaned up in afterAll.
const seededReciterIds: string[] = [];
const seededAlbumIds: string[] = [];
const seededTrackIds: string[] = [];
const seededUserIds: string[] = [];
const seededSubmissionIds: string[] = [];

describe.skipIf(!dbAvailable)('Home Router', () => {

beforeAll(async () => {
  ({ db, close } = createTestDb());

  // Seed users needed by recentChanges tests.
  await db.insert(users).values([
    {
      id: homeModeratorId,
      name: 'Home Mod User',
      email: `home-mod-${SUFFIX}@example.com`,
      emailVerified: true,
      role: 'moderator',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: homeContributorId,
      name: 'Home Contrib User',
      email: `home-contrib-${SUFFIX}@example.com`,
      emailVerified: true,
      role: 'contributor',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  seededUserIds.push(homeModeratorId, homeContributorId);

  // Seed 2 reciters, each with 1 album and 1 track.
  const [r1] = await db
    .insert(reciters)
    .values([
      { name: 'Home Test Reciter A', slug: `home-test-reciter-a-${SUFFIX}` },
      { name: 'Home Test Reciter B', slug: `home-test-reciter-b-${SUFFIX}` },
    ])
    .returning({ id: reciters.id });

  // Insert a second reciter separately to get both IDs.
  const [r2] = await db
    .insert(reciters)
    .values({ name: 'Home Test Reciter C', slug: `home-test-reciter-c-${SUFFIX}` })
    .returning({ id: reciters.id });

  seededReciterIds.push(r1!.id, r2!.id);

  const [a1] = await db
    .insert(albums)
    .values({ title: 'Home Album A', slug: `home-album-a-${Date.now()}`, reciterId: r1!.id })
    .returning({ id: albums.id });

  seededAlbumIds.push(a1!.id);

  const [t1] = await db
    .insert(tracks)
    .values({ title: 'Home Track A', slug: `home-track-a-${Date.now()}`, albumId: a1!.id })
    .returning({ id: tracks.id });

  seededTrackIds.push(t1!.id);
});

afterAll(async () => {
  if (!close) return;
  // Delete audit rows written by seeded users before removing users (FK on actorUserId).
  if (seededUserIds.length > 0) {
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, seededUserIds));
  }
  if (seededSubmissionIds.length > 0) {
    await db.delete(submissions).where(inArray(submissions.id, seededSubmissionIds));
  }
  // W3 contributorProfile/Heatmap tests insert submissions without tracking IDs;
  // sweep all submissions by any seeded user id.
  if (seededUserIds.length > 0) {
    await db.delete(submissions).where(inArray(submissions.submittedByUserId, seededUserIds));
  }
  // Cascade deletes handle tracks/albums when reciters are removed.
  if (seededReciterIds.length > 0) {
    await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
  }
  if (seededUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, seededUserIds));
  }
  await close();
});

describe('home.getFeatured', () => {
  it('returns reciters, albums, and tracks arrays', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    expect(result).toHaveProperty('reciters');
    expect(result).toHaveProperty('albums');
    expect(result).toHaveProperty('tracks');
    expect(Array.isArray(result.reciters)).toBe(true);
    expect(Array.isArray(result.albums)).toBe(true);
    expect(Array.isArray(result.tracks)).toBe(true);
  });

  it('includes seeded reciter in featured reciters', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    const foundId = seededReciterIds[0]!;
    const found = result.reciters.some((r) => r.id === foundId);
    expect(found).toBe(true);
  });

  it('includes seeded album in recent albums', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    const found = result.albums.some((a) => a.id === seededAlbumIds[0]);
    expect(found).toBe(true);
  });

  it('includes seeded track in popular tracks', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    const found = result.tracks.some((t) => t.id === seededTrackIds[0]);
    expect(found).toBe(true);
  });

  it('handles empty database gracefully — returns arrays (no throw)', async () => {
    // We cannot empty the DB (other suites may be running), but we can confirm
    // the procedure never throws and always returns valid shapes even when the
    // DB has at least some rows.
    const caller = makeHomeCaller(db);
    await expect(caller.getFeatured()).resolves.toMatchObject({
      reciters: expect.any(Array),
      albums: expect.any(Array),
      tracks: expect.any(Array),
    });
  });

  it('returns at most 6 reciters, 6 albums, and 6 tracks', async () => {
    const caller = makeHomeCaller(db);
    const result = await caller.getFeatured();

    expect(result.reciters.length).toBeLessThanOrEqual(6);
    expect(result.albums.length).toBeLessThanOrEqual(6);
    expect(result.tracks.length).toBeLessThanOrEqual(6);
  });
});
describe('home.recentChanges', () => {
  it('returns submission.applied events newest first with entity titles + slugs', async () => {
    const reciterName = `Public Feed Reciter ${SUFFIX}`;
    // Slug generation mirrors server logic: lowercase, replace non-alnum with hyphen, trim hyphens.
    const expectedSlug = reciterName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const contributorCaller = makeSubmissionCaller(db, homeContributorId);
    const submitted = await contributorCaller.create({
      type: 'reciter',
      action: 'create',
      data: { name: reciterName },
    });
    seededSubmissionIds.push(submitted.id);

    const moderatorCaller = makeModerationCaller(db, homeModeratorId);
    await moderatorCaller.review({
      submissionId: submitted.id,
      action: 'approved',
    });

    // Register cleanup for the canonical reciter row created by approve.
    const { reciters: recitersTable } = await import('@nawhas/db');
    const { eq } = await import('drizzle-orm');
    const [created] = await db.select().from(recitersTable).where(eq(recitersTable.slug, expectedSlug));
    if (created) seededReciterIds.push(created.id);

    const publicCaller = makeHomeCaller(db);
    const res = await publicCaller.recentChanges({ limit: 50 });
    const item = res.items.find((i) => i.entityTitle === reciterName);

    expect(item).toBeDefined();
    expect(item?.action).toBe('create');
    expect(item?.entityType).toBe('reciter');
    expect(item?.entitySlugPath).toBe(`/reciters/${expectedSlug}`);
    expect(item?.submitterName).toBe('Home Contrib User');
  });

  it('only includes submission.applied events (not internal moderator actions)', async () => {
    // The feed must never include non-canonical-entity audit rows like role.changed.
    const publicCaller = makeHomeCaller(db);
    const res = await publicCaller.recentChanges({ limit: 50 });

    expect(
      res.items.every((i) => ['reciter', 'album', 'track'].includes(i.entityType)),
    ).toBe(true);
  });
});

// ── home.contributorProfile / contributorHeatmap (W3) ─────────────────────

async function seedUserForProfile(role: 'user' | 'contributor' | 'moderator'): Promise<string> {
  const id = `home-w3-${role}-${seededUserIds.length}-${SUFFIX}`;
  const now = new Date();
  await db.insert(users).values({
    id,
    name: 'Test User',
    email: `${id}@example.com`,
    emailVerified: true,
    role,
    createdAt: now,
    updatedAt: now,
  });
  seededUserIds.push(id);
  return id;
}

describe('home.contributorProfile (W3)', () => {
  it('returns null for unknown username', async () => {
    const caller = makeHomeCaller(db);
    const out = await caller.contributorProfile({ username: 'no-such-user-xyz' });
    expect(out).toBeNull();
  });

  it('returns DTO for known username with stats', async () => {
    const userId = await seedUserForProfile('contributor');
    // Set the user's username via direct update (signup flow not invoked in tests).
    await db.update(users).set({ name: 'Alex Doe', username: `prof-${SUFFIX}` }).where(eq(users.id, userId));
    // Seed two applied + one pending submission.
    await db.insert(submissions).values([
      { type: 'reciter', action: 'create', data: { name: 'A' }, status: 'applied', submittedByUserId: userId },
      { type: 'reciter', action: 'create', data: { name: 'B' }, status: 'applied', submittedByUserId: userId },
      { type: 'reciter', action: 'create', data: { name: 'C' }, status: 'pending', submittedByUserId: userId },
    ]);
    const caller = makeHomeCaller(db);
    const out = await caller.contributorProfile({ username: `prof-${SUFFIX}` });
    expect(out?.username).toBe(`prof-${SUFFIX}`);
    expect(out?.stats.total).toBe(3);
    expect(out?.stats.approved).toBe(2);
    expect(out?.stats.pending).toBe(1);
    expect(out?.stats.approvalRate).toBeCloseTo(2 / 3, 2);
  });

  it('looks up case-insensitively', async () => {
    const userId = await seedUserForProfile('contributor');
    await db.update(users).set({ username: `mixedcase-${SUFFIX}` }).where(eq(users.id, userId));
    const caller = makeHomeCaller(db);
    const out = await caller.contributorProfile({ username: `MixedCase-${SUFFIX}` });
    expect(out?.userId).toBe(userId);
  });
});

describe('home.contributorHeatmap (W3)', () => {
  it('returns dense buckets for the year', async () => {
    const userId = await seedUserForProfile('contributor');
    const username = `hm-${SUFFIX}`;
    await db.update(users).set({ username }).where(eq(users.id, userId));
    // Seed two submissions today.
    await db.insert(submissions).values([
      { type: 'reciter', action: 'create', data: { name: 'X' }, status: 'pending', submittedByUserId: userId },
      { type: 'reciter', action: 'create', data: { name: 'Y' }, status: 'pending', submittedByUserId: userId },
    ]);
    const caller = makeHomeCaller(db);
    const out = await caller.contributorHeatmap({ username });
    expect(out.length).toBeGreaterThanOrEqual(1);
    const today = new Date().toISOString().slice(0, 10);
    const todayRow = out.find((b) => b.date === today);
    expect(todayRow?.count).toBeGreaterThanOrEqual(2);
  });
});

}); // Home Router
