// @vitest-environment node
/**
 * accessRequests router integration tests.
 *
 * Real Postgres via createTestDb(). Each test seeds + cleans up its own
 * data; we never share state across tests.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { accessRequests, auditLog, users } from '@nawhas/db';
import { createTestDb, isDbAvailable, makeAccessRequestsCaller, type TestDb } from './helpers';

const dbAvailable = await isDbAvailable();

let testDb: { db: TestDb; close: () => Promise<void> };
const SUFFIX = `w3-${Date.now()}`;
const seededUserIds: string[] = [];

async function seedUser(role: 'user' | 'contributor' | 'moderator' = 'user'): Promise<string> {
  const id = `user-${role}-${seededUserIds.length}-${SUFFIX}`;
  const now = new Date();
  await testDb.db.insert(users).values({
    id,
    name: `Test ${role}`,
    email: `${id}@example.com`,
    emailVerified: true,
    role,
    createdAt: now,
    updatedAt: now,
  });
  seededUserIds.push(id);
  return id;
}

beforeAll(async () => {
  if (!dbAvailable) return;
  testDb = createTestDb();
});

afterAll(async () => {
  if (!dbAvailable || !testDb) return;
  if (seededUserIds.length > 0) {
    await testDb.db.delete(auditLog).where(inArray(auditLog.actorUserId, seededUserIds));
    await testDb.db.delete(accessRequests).where(inArray(accessRequests.userId, seededUserIds));
    await testDb.db.delete(users).where(inArray(users.id, seededUserIds));
  }
  await testDb.close();
});

beforeEach(() => {
  if (!dbAvailable) return;
});

describe('accessRequests.create', () => {
  it.skipIf(!dbAvailable)('inserts a pending row with reason', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    const out = await caller.create({ reason: 'I want to help with Urdu translations.' });
    expect(out.id).toBeDefined();

    const [row] = await testDb.db.select().from(accessRequests).where(eq(accessRequests.id, out.id));
    expect(row?.status).toBe('pending');
    expect(row?.reason).toBe('I want to help with Urdu translations.');
    expect(row?.userId).toBe(userId);
  });

  it.skipIf(!dbAvailable)('accepts a null reason', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    const out = await caller.create({ reason: null });
    expect(out.id).toBeDefined();
  });

  it.skipIf(!dbAvailable)('rejects role=contributor with FORBIDDEN', async () => {
    const userId = await seedUser('contributor');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'contributor');
    await expect(caller.create({ reason: null })).rejects.toThrow(TRPCError);
  });

  it.skipIf(!dbAvailable)('rejects a duplicate pending application with CONFLICT', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    await caller.create({ reason: null });
    await expect(caller.create({ reason: null })).rejects.toThrow(/already.*pending|CONFLICT/i);
  });
});

describe('accessRequests.withdrawMine', () => {
  it.skipIf(!dbAvailable)('flips status to withdrawn and stamps withdrawn_at', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    const { id } = await caller.create({ reason: null });
    await caller.withdrawMine({ id });
    const [row] = await testDb.db.select().from(accessRequests).where(eq(accessRequests.id, id));
    expect(row?.status).toBe('withdrawn');
    expect(row?.withdrawnAt).toBeInstanceOf(Date);
  });

  it.skipIf(!dbAvailable)("rejects withdrawing another user's row with NOT_FOUND", async () => {
    const ownerId = await seedUser('user');
    const otherId = await seedUser('user');
    const ownerCaller = makeAccessRequestsCaller(testDb.db, ownerId, 'user');
    const { id } = await ownerCaller.create({ reason: null });
    const otherCaller = makeAccessRequestsCaller(testDb.db, otherId, 'user');
    await expect(otherCaller.withdrawMine({ id })).rejects.toThrow(/NOT_FOUND/i);
  });

  it.skipIf(!dbAvailable)('rejects withdrawing an already-withdrawn row with BAD_REQUEST', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    const { id } = await caller.create({ reason: null });
    await caller.withdrawMine({ id });
    await expect(caller.withdrawMine({ id })).rejects.toThrow(/BAD_REQUEST|status/i);
  });

  it.skipIf(!dbAvailable)('writes an audit_log row', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    const { id } = await caller.create({ reason: null });
    await caller.withdrawMine({ id });
    const rows = await testDb.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, 'access_request.withdrawn'), eq(auditLog.targetId, id)));
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe('accessRequests.getMine', () => {
  it.skipIf(!dbAvailable)('returns null when the user has no application', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    const out = await caller.getMine();
    expect(out).toBeNull();
  });

  it.skipIf(!dbAvailable)('returns the most recent application', async () => {
    const userId = await seedUser('user');
    const caller = makeAccessRequestsCaller(testDb.db, userId, 'user');
    const { id } = await caller.create({ reason: 'first' });
    await caller.withdrawMine({ id });
    const { id: id2 } = await caller.create({ reason: 'second' });
    const out = await caller.getMine();
    expect(out?.id).toBe(id2);
    expect(out?.status).toBe('pending');
  });
});

describe('accessRequests.queue', () => {
  it.skipIf(!dbAvailable)('lists pending requests, newest first', async () => {
    const modId = await seedUser('moderator');
    const u1 = await seedUser('user');
    const u2 = await seedUser('user');
    const c1 = makeAccessRequestsCaller(testDb.db, u1, 'user');
    const c2 = makeAccessRequestsCaller(testDb.db, u2, 'user');
    await c1.create({ reason: 'r1' });
    await c2.create({ reason: 'r2' });
    const mod = makeAccessRequestsCaller(testDb.db, modId, 'moderator');
    const out = await mod.queue({});
    expect(out.items.length).toBeGreaterThanOrEqual(2);
    // Newest first: u2 then u1
    const ids = out.items.map((i) => i.userId);
    expect(ids.indexOf(u2)).toBeLessThan(ids.indexOf(u1));
  });

  it.skipIf(!dbAvailable)('joins applicant name and email', async () => {
    const modId = await seedUser('moderator');
    const u = await seedUser('user');
    const cu = makeAccessRequestsCaller(testDb.db, u, 'user');
    await cu.create({ reason: null });
    const mod = makeAccessRequestsCaller(testDb.db, modId, 'moderator');
    const out = await mod.queue({});
    const item = out.items.find((i) => i.userId === u);
    expect(item?.applicantEmail).toContain(u);
  });

  it.skipIf(!dbAvailable)('rejects role=user with FORBIDDEN', async () => {
    const u = await seedUser('user');
    const c = makeAccessRequestsCaller(testDb.db, u, 'user');
    await expect(c.queue({})).rejects.toThrow(/FORBIDDEN/i);
  });
});
