import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { s3, BUCKET_AUDIO, S3_PUBLIC_BASE_URL } from '@/lib/storage';
import { probeAudioDuration } from '@/server/lib/audio';

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg']);

export async function POST(req: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'contributor' && role !== 'moderator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'unsupported media type' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file too large (max 50 MB)' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const duration = await probeAudioDuration(buffer, file.type);

  const ext = file.type.split('/')[1] ?? 'bin';
  const key = `audio/${session.user.id}/${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_AUDIO,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  return NextResponse.json({
    url: `${S3_PUBLIC_BASE_URL}/${key}`,
    key,
    duration,
  });
}
