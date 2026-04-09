/**
 * Best-effort redaction of sensitive keys for structured logs (e.g. tRPC input).
 */

const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'secret',
  'token',
  'session',
  'authorization',
  'cookie',
  'credential',
] as const;

function keyLooksSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((frag) => lower.includes(frag));
}

export function redactForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactForLog);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (keyLooksSensitive(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactForLog(v);
      }
    }
    return out;
  }
  return value;
}
