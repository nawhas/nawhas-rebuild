// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@nawhas/db';
import { reciterRouter } from '../server/routers/reciter';
import { createCallerFactory } from '../server/trpc/trpc';
import { encodeCursor } from '../server/lib/cursor';

const createCaller = createCallerFactory(reciterRouter);

// Helper to build a fake reciter row matching the DB schema shape.
function makeReciter(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  typesenseSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: overrides.name ?? 'Test Reciter',
    slug: overrides.slug ?? 'test-reciter',
    bio: overrides.bio ?? null,
    avatarUrl: overrides.avatarUrl ?? null,
    typesenseSyncedAt: overrides.typesenseSyncedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-01T00:00:00.000Z'),
  };
}

// Build a stub DB whose
// select(...).from(...).leftJoin(...).leftJoin(...).where(...).groupBy(...).orderBy(...).limit(...)
// chain resolves to `rows`. Mirrors the aggregation query used by reciter.list.
function makeStubDb(rows: ReturnType<typeof makeReciter>[]): Database {
  const chain = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  return {
    select: vi.fn().mockReturnValue(chain),
  } as unknown as Database;
}

describe('reciter.list', () => {
  it('returns empty items and null cursor when there are no reciters', async () => {
    const caller = createCaller({ db: makeStubDb([]), session: null, user: null });
    const result = await caller.list({});
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it('returns all items with null cursor when results are under the limit', async () => {
    const rows = [
      makeReciter({ id: '1'.repeat(8) + '-0000-0000-0000-000000000001' }),
      makeReciter({ id: '1'.repeat(8) + '-0000-0000-0000-000000000002' }),
    ];
    const caller = createCaller({ db: makeStubDb(rows), session: null, user: null });
    const result = await caller.list({ limit: 5 });
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it('returns limit items and a nextCursor when results exceed the limit', async () => {
    // Stub returns limit+1 rows to signal there are more pages.
    const rows = Array.from({ length: 3 }, (_, i) =>
      makeReciter({
        id: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa${String(i).padStart(3, '0')}`,
        createdAt: new Date(`2024-0${i + 1}-01T00:00:00.000Z`),
      }),
    );
    const caller = createCaller({ db: makeStubDb(rows), session: null, user: null });
    const result = await caller.list({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
  });

  it('encodes the cursor from the last returned item', async () => {
    const lastItem = makeReciter({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      createdAt: new Date('2024-06-15T12:00:00.000Z'),
    });
    const rows = [
      makeReciter({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
      lastItem,
      // Extra row to trigger hasMore
      makeReciter({ id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' }),
    ];
    const caller = createCaller({ db: makeStubDb(rows), session: null, user: null });
    const result = await caller.list({ limit: 2 });

    // The expected cursor encodes the LAST item in the returned page (index 1).
    const expectedCursor = encodeCursor(lastItem.createdAt, lastItem.id);
    expect(result.nextCursor).toBe(expectedCursor);
  });
});
