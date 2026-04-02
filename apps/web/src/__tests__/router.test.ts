import { describe, expect, it } from 'vitest';
import { appRouter } from '../server/trpc/router';
import { createCallerFactory } from '../server/trpc/trpc';

// Smoke test: verify the tRPC health check route returns the expected response.
const createCaller = createCallerFactory(appRouter);

describe('appRouter', () => {
  it('health procedure returns { status: "ok" }', async () => {
    const caller = createCaller({});
    const result = await caller.health();
    expect(result).toEqual({ status: 'ok' });
  });
});
