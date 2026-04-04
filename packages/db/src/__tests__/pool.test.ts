// @vitest-environment node
/**
 * Unit tests for DATABASE_POOL_MAX env var parsing in packages/db/src/index.ts.
 *
 * Uses vi.resetModules() + vi.doMock() to isolate each test from the singleton
 * and force fresh module evaluation with different env var values.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('getDb() DATABASE_POOL_MAX env var parsing', () => {
  const ORIGINAL_DATABASE_URL = process.env['DATABASE_URL'];

  beforeEach(() => {
    vi.resetModules();
    process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/nawhas_test';
  });

  afterEach(() => {
    if (ORIGINAL_DATABASE_URL !== undefined) {
      process.env['DATABASE_URL'] = ORIGINAL_DATABASE_URL;
    } else {
      delete process.env['DATABASE_URL'];
    }
    delete process.env['DATABASE_POOL_MAX'];
    vi.restoreAllMocks();
  });

  it('defaults to max: 10 when DATABASE_POOL_MAX is not set', async () => {
    delete process.env['DATABASE_POOL_MAX'];

    const postgresMock = vi.fn().mockReturnValue({});
    vi.doMock('postgres', () => ({ default: postgresMock }));
    vi.doMock('drizzle-orm/postgres-js', () => ({
      drizzle: vi.fn().mockReturnValue(new Proxy({}, { get: () => vi.fn() })),
    }));

    const { getDb } = await import('../index.js');
    getDb();

    expect(postgresMock).toHaveBeenCalledWith(
      'postgresql://test:test@localhost:5432/nawhas_test',
      { max: 10 },
    );
  });

  it('uses max: 5 when DATABASE_POOL_MAX=5', async () => {
    process.env['DATABASE_POOL_MAX'] = '5';

    const postgresMock = vi.fn().mockReturnValue({});
    vi.doMock('postgres', () => ({ default: postgresMock }));
    vi.doMock('drizzle-orm/postgres-js', () => ({
      drizzle: vi.fn().mockReturnValue(new Proxy({}, { get: () => vi.fn() })),
    }));

    const { getDb } = await import('../index.js');
    getDb();

    expect(postgresMock).toHaveBeenCalledWith(
      'postgresql://test:test@localhost:5432/nawhas_test',
      { max: 5 },
    );
  });
});
