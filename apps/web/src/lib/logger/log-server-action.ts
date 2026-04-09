import { serverLogger } from '@/lib/logger/server';

/**
 * Log when a server action short-circuits because there is no session.
 * Avoid calling this for intentional silent no-ops (e.g. library save for guests).
 */
export async function logUnauthenticatedServerAction(actionName: string): Promise<void> {
  await serverLogger.warn('serverAction.unauthenticated', { actionName });
}

/**
 * Log when a server action catches an error and returns a user-visible message instead of throwing.
 * tRPC may also log `trpc.procedure_failed` for the same failure; this preserves the action boundary.
 */
export async function logHandledServerActionError(
  actionName: string,
  message: string,
): Promise<void> {
  await serverLogger.error('serverAction.handled_error', undefined, { actionName, message });
}

/**
 * Wrap a server action body: logs duration at debug on success only.
 * Does not log thrown errors (tRPC middleware covers procedure failures).
 */
export async function withServerActionLogging<T>(
  actionName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  const result = await fn();
  await serverLogger.debug('serverAction.ok', {
    actionName,
    durationMs: Date.now() - start,
  });
  return result;
}
