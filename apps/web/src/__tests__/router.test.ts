import { describe, expect, it } from 'vitest';
import type { Database } from '@nawhas/db';
import { appRouter } from '../server/trpc/router';
import { createCallerFactory } from '../server/trpc/trpc';

// Smoke test: verify the tRPC health check route returns the expected response.
const createCaller = createCallerFactory(appRouter);

// Health check does not use the database — pass a typed stub so the context
// satisfies the TypeScript interface without requiring a real DB connection.
const stubDb = {} as unknown as Database;

describe('appRouter', () => {
  it('health procedure returns { status: "ok" }', async () => {
    const caller = createCaller({ db: stubDb });
    const result = await caller.health();
    expect(result).toEqual({ status: 'ok' });
  });
});
