import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { db, users } from '@nawhas/db';
import { auth } from '@/lib/auth';
import { s3, BUCKET_IMAGES, S3_IMAGES_PUBLIC_BASE_URL } from '@/lib/storage';
import type { UserDTO } from '@nawhas/types';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_SIZE = 256;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validate session
  const sessionData = await auth.api.getSession({ headers: req.headers });
  if (!sessionData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = sessionData.user.id;

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 400 },
    );
  }

  // Resize to 256x256 webp
  const buffer = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toBuffer();

  // Upload to MinIO
  const key = `avatars/${userId}.webp`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_IMAGES,
      Key: key,
      Body: resized,
      ContentType: 'image/webp',
    }),
  );

  // Build public URL and update user record
  const imageUrl = `${S3_IMAGES_PUBLIC_BASE_URL}/${key}`;
  const rows = await db
    .update(users)
    .set({ image: imageUrl, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  const updated = rows[0];
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userDto: UserDTO = {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    image: updated.image ?? null,
  };

  return NextResponse.json(userDto, { status: 200 });
}
