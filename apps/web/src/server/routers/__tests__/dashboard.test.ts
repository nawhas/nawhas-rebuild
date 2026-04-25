// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { submissions, users } from '@nawhas/db';
import { createTestDb, isDbAvailable, makeDashboardCaller, type TestDb } from './helpers';

const dbAvailable = await isDbAvailable();

let testDb: { db: TestDb; close: () => Promise<void> };
const SUFFIX = `dash-${Date.now()}`;
const seededUserIds: string[] = [];

async function seedUser(): Promise<string> {
  const id = `user-${seededUserIds.length}-${SUFFIX}`;
  const now = new Date();
  await testDb.db.insert(users).values({
    id, name: 'T', email: `${id}@example.com`, emailVerified: true,
    role: 'contributor', createdAt: now, updatedAt: now,
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
    await testDb.db.delete(submissions).where(inArray(submissions.submittedByUserId, seededUserIds));
    await testDb.db.delete(users).where(inArray(users.id, seededUserIds));
  }
  await testDb.close();
});

describe('dashboard.mine', () => {
  it.skipIf(!dbAvailable)('returns owner-scoped stats with correct approvalRate', async () => {
    const userId = await seedUser();
    await testDb.db.insert(submissions).values([
      { type: 'reciter', action: 'create', data: { name: 'A' }, status: 'applied', submittedByUserId: userId },
      { type: 'reciter', action: 'create', data: { name: 'B' }, status: 'applied', submittedByUserId: userId },
      { type: 'reciter', action: 'create', data: { name: 'C' }, status: 'pending', submittedByUserId: userId },
      { type: 'reciter', action: 'create', data: { name: 'D' }, status: 'withdrawn', submittedByUserId: userId },
    ]);
    const caller = makeDashboardCaller(testDb.db, userId);
    const out = await caller.mine();
    expect(out.total).toBe(4);
    expect(out.approved).toBe(2);
    expect(out.pending).toBe(1);
    expect(out.withdrawn).toBe(1);
    // approvalRate = 2 / (4 - 1) = 0.6666...
    expect(out.approvalRate).toBeCloseTo(2 / 3, 2);
    expect(out.last4WeeksBuckets.length).toBe(28);
  });

  it.skipIf(!dbAvailable)('returns zeros for a user with no submissions', async () => {
    const userId = await seedUser();
    const caller = makeDashboardCaller(testDb.db, userId);
    const out = await caller.mine();
    expect(out.total).toBe(0);
    expect(out.approvalRate).toBe(0);
  });
});
