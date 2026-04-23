// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/storage', () => ({
  s3: { send: vi.fn().mockResolvedValue({}) },
  BUCKET_AUDIO: 'test-audio',
  S3_PUBLIC_BASE_URL: 'http://localhost:9000/test-audio',
}));

import { auth } from '@/lib/auth';
import { POST } from '../route';

const authedSession = {
  session: { id: 's', userId: 'u' },
  user: { id: 'u', role: 'contributor', email: 'a@b.c', name: 'A', emailVerified: true },
} as never;

function makeRequest(body: FormData): Request {
  return new Request('http://localhost/api/uploads/audio', { method: 'POST', body });
}

function makeFormWithMp3(): FormData {
  const fd = new FormData();
  const buf = readFileSync(join(process.cwd(), 'src/server/lib/__tests__/fixtures/5s.mp3'));
  const file = new File([buf], 'test.mp3', { type: 'audio/mpeg' });
  fd.append('file', file);
  return fd;
}

describe('POST /api/uploads/audio', () => {
  it('rejects unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const res = await POST(makeRequest(makeFormWithMp3()));
    expect(res.status).toBe(401);
  });

  it('rejects non-contributor role', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      session: { id: 's', userId: 'u' },
      user: { id: 'u', role: 'user', email: 'a@b.c', name: 'A', emailVerified: true },
    } as never);
    const res = await POST(makeRequest(makeFormWithMp3()));
    expect(res.status).toBe(403);
  });

  it('rejects non-audio mime', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(authedSession);
    const fd = new FormData();
    fd.append('file', new File(['x'], 'x.txt', { type: 'text/plain' }));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it('returns url + duration on success', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(authedSession);
    const res = await POST(makeRequest(makeFormWithMp3()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^http:\/\/localhost:9000\/test-audio\//);
    expect(body.key).toMatch(/^audio\/u\//);
    expect(body.duration).toBeGreaterThanOrEqual(4);
    expect(body.duration).toBeLessThanOrEqual(6);
  });
});
