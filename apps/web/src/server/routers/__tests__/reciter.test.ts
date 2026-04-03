// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { reciters, albums } from '@nawhas/db';
import { createTestDb, makeReciterCaller, type TestDb } from './helpers';

let db: TestDb;
let close: () => Promise<void>;

const seededReciterIds: string[] = [];

// Unique suffix prevents collisions with other test runs.
const SUFFIX = Date.now();

beforeAll(async () => {
  ({ db, close } = createTestDb());

  const rows = await db
    .insert(reciters)
    .values([
      { name: 'Reciter Test Alpha', slug: `reciter-test-alpha-${SUFFIX}` },
      { name: 'Reciter Test Beta', slug: `reciter-test-beta-${SUFFIX}` },
      { name: 'Reciter Test Gamma', slug: `reciter-test-gamma-${SUFFIX}` },
    ])
    .returning({ id: reciters.id });

  for (const row of rows) seededReciterIds.push(row.id);

  // Attach two albums to the first reciter for the getBySlug test.
  await db.insert(albums).values([
    {
      title: 'Reciter Alpha Album 1',
      slug: `reciter-alpha-album-1-${SUFFIX}`,
      reciterId: seededReciterIds[0]!,
      year: 2020,
    },
    {
      title: 'Reciter Alpha Album 2',
      slug: `reciter-alpha-album-2-${SUFFIX}`,
      reciterId: seededReciterIds[0]!,
      year: 2022,
    },
  ]);
});

afterAll(async () => {
  if (seededReciterIds.length > 0) {
    await db.delete(reciters).where(inArray(reciters.id, seededReciterIds));
  }
  await close();
});

describe('reciter.list', () => {
  it('returns a paginated result with items and nextCursor', async () => {
    const caller = makeReciterCaller(db);
    const result = await caller.list({});

    expect(Array.isArray(result.items)).toBe(true);
    // nextCursor is null when no more pages exist.
    expect(result.nextCursor === null || typeof result.nextCursor === 'string').toBe(true);
  });

  it('includes seeded reciters in the first page', async () => {
    const caller = makeReciterCaller(db);
    const result = await caller.list({ limit: 100 });

    for (const id of seededReciterIds) {
      expect(result.items.some((r) => r.id === id)).toBe(true);
    }
  });

  it('respects the limit parameter', async () => {
    const caller = makeReciterCaller(db);
    const result = await caller.list({ limit: 1 });

    expect(result.items.length).toBeLessThanOrEqual(1);
  });

  it('paginates with a cursor — second page does not overlap with first', async () => {
    const caller = makeReciterCaller(db);
    const first = await caller.list({ limit: 1 });

    // Only test pagination if the cursor exists (i.e., more than 1 row in DB).
    if (!first.nextCursor) return;

    const second = await caller.list({ limit: 1, cursor: first.nextCursor });
    const firstIds = first.items.map((r) => r.id);
    const secondIds = second.items.map((r) => r.id);
    const overlap = firstIds.filter((id) => secondIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('returns items ordered newest first (createdAt DESC)', async () => {
    const caller = makeReciterCaller(db);
    const result = await caller.list({ limit: 100 });

    for (let i = 1; i < result.items.length; i++) {
      const prev = result.items[i - 1]!.createdAt;
      const curr = result.items[i]!.createdAt;
      // prev should be >= curr (DESC order)
      expect(new Date(prev).getTime()).toBeGreaterThanOrEqual(new Date(curr).getTime());
    }
  });
});

describe('reciter.getBySlug', () => {
  it('returns the reciter with their albums when the slug exists', async () => {
    const caller = makeReciterCaller(db);
    const slug = `reciter-test-alpha-${SUFFIX}`;
    const result = await caller.getBySlug({ slug });

    expect(result).not.toBeNull();
    expect(result!.slug).toBe(slug);
    expect(result!.name).toBe('Reciter Test Alpha');
    expect(Array.isArray(result!.albums)).toBe(true);
    expect(result!.albums.length).toBe(2);
  });

  it('returns albums ordered by year DESC', async () => {
    const caller = makeReciterCaller(db);
    const result = await caller.getBySlug({ slug: `reciter-test-alpha-${SUFFIX}` });

    expect(result).not.toBeNull();
    const years = result!.albums.map((a) => a.year);
    expect(years[0]).toBeGreaterThanOrEqual(years[1] ?? 0);
  });

  it('returns null for a non-existent slug', async () => {
    const caller = makeReciterCaller(db);
    const result = await caller.getBySlug({ slug: 'slug-that-does-not-exist-xyz-99999' });

    expect(result).toBeNull();
  });
});
