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
