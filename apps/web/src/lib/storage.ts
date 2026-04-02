import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.S3_ENDPOINT) throw new Error('S3_ENDPOINT is required');
if (!process.env.S3_ACCESS_KEY_ID) throw new Error('S3_ACCESS_KEY_ID is required');
if (!process.env.S3_SECRET_ACCESS_KEY) throw new Error('S3_SECRET_ACCESS_KEY is required');

/**
 * S3-compatible client. Works with MinIO in dev and any S3-compatible
 * provider in production — switch via env vars only, no code changes.
 */
export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  // Required for MinIO and path-style S3-compatible providers
  forcePathStyle: true,
});

export const BUCKET_AUDIO = process.env.S3_BUCKET_AUDIO ?? 'nawhas-audio';
export const BUCKET_IMAGES = process.env.S3_BUCKET_IMAGES ?? 'nawhas-images';
export const S3_PUBLIC_BASE_URL =
  process.env.S3_PUBLIC_BASE_URL ?? 'http://localhost:9000/nawhas-audio';
