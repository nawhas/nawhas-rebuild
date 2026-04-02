import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export function createContext(_opts: FetchCreateContextFnOptions): Record<string, never> {
  return {};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
