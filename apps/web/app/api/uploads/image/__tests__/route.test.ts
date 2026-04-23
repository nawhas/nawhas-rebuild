// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage', () => ({
  s3: { send: vi.fn().mockResolvedValue({}) },
  BUCKET_IMAGES: 'test-images',
  S3_IMAGES_PUBLIC_BASE_URL: 'http://localhost:9000/test-images',
}));

import { auth } from '@/lib/auth';
import { POST } from '../route';

function makeRequest(body: FormData): Request {
  return new Request('http://localhost/api/uploads/image', { method: 'POST', body });
}

function makeFormWithPng(sizeBytes = 1024): FormData {
  const fd = new FormData();
  const file = new File([new Uint8Array(sizeBytes)], 'test.png', { type: 'image/png' });
  fd.append('file', file);
  return fd;
}

const authedSession = {
  session: { id: 's', userId: 'u' },
  user: { id: 'u', role: 'contributor', email: 'a@b.c', name: 'A', emailVerified: true },
} as never;

describe('POST /api/uploads/image', () => {
  it('rejects unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const res = await POST(makeRequest(makeFormWithPng()));
    expect(res.status).toBe(401);
  });

  it('rejects non-contributor role', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      session: { id: 's', userId: 'u' },
      user: { id: 'u', role: 'user', email: 'a@b.c', name: 'A', emailVerified: true },
    } as never);
    const res = await POST(makeRequest(makeFormWithPng()));
    expect(res.status).toBe(403);
  });

  it('rejects non-image mime', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(authedSession);
    const fd = new FormData();
    fd.append('file', new File(['x'], 'x.txt', { type: 'text/plain' }));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it('rejects oversized file', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(authedSession);
    const res = await POST(makeRequest(makeFormWithPng(6 * 1024 * 1024)));
    expect(res.status).toBe(413);
  });

  it('returns url on success', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(authedSession);
    const res = await POST(makeRequest(makeFormWithPng()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^http:\/\/localhost:9000\/test-images\//);
    expect(body.key).toMatch(/^images\/u\//);
  });
});
