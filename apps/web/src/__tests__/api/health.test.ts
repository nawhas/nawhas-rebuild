// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GET } from '../../../app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 status', async () => {
    const response = GET();
    expect(response.status).toBe(200);
  });

  it('returns JSON body with status "ok" and a string timestamp', async () => {
    const response = GET();
    const body = await response.json() as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(body.timestamp).not.toBe('');
  });

  it('timestamp is a valid ISO 8601 date string', async () => {
    const response = GET();
    const body = await response.json() as { status: string; timestamp: string };
    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });
});
