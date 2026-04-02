/**
 * Development seed script.
 *
 * Run with: pnpm db:seed
 *
 * What it does:
 *  1. Uploads placeholder audio and image fixtures to local MinIO.
 *  2. Inserts seed rows for reciters, albums, and tracks with audioUrl /
 *     artworkUrl values pointing at the uploaded MinIO fixtures.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// ---------------------------------------------------------------------------
// Config — all values come from env vars.
// ---------------------------------------------------------------------------
const endpoint = process.env['S3_ENDPOINT'] ?? 'http://localhost:9000';
const accessKeyId = process.env['S3_ACCESS_KEY_ID'] ?? 'minioadmin';
const secretAccessKey = process.env['S3_SECRET_ACCESS_KEY'] ?? 'minioadmin';
const bucketAudio = process.env['S3_BUCKET_AUDIO'] ?? 'nawhas-audio';
const bucketImages = process.env['S3_BUCKET_IMAGES'] ?? 'nawhas-images';
const publicBaseUrl = process.env['S3_PUBLIC_BASE_URL'] ?? `${endpoint}/${bucketAudio}`;
const publicImagesUrl = `${endpoint}/${bucketImages}`;

const s3 = new S3Client({
  endpoint,
  region: 'us-east-1',
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Minimal valid MP3 and JPEG byte sequences used as placeholders.
// ---------------------------------------------------------------------------

/** 48-byte minimal MP3 frame (silence). */
const PLACEHOLDER_MP3 = Buffer.from(
  'fffb9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  'hex',
);

/** Minimal valid 1×1 white JPEG. */
const PLACEHOLDER_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda00080101003f00fbd3b79ffe00',
  'hex',
);

// ---------------------------------------------------------------------------
// MinIO fixture uploads
// ---------------------------------------------------------------------------

async function uploadFixtures(): Promise<{
  audioUrls: string[];
  artworkUrls: string[];
}> {
  const audioKeys = ['fixtures/track-001.mp3', 'fixtures/track-002.mp3', 'fixtures/track-003.mp3'];
  const imageKeys = [
    'fixtures/album-cover-001.jpg',
    'fixtures/album-cover-002.jpg',
    'fixtures/reciter-photo-001.jpg',
  ];

  console.log('Uploading audio fixtures to MinIO…');
  for (const key of audioKeys) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketAudio,
        Key: key,
        Body: PLACEHOLDER_MP3,
        ContentType: 'audio/mpeg',
      }),
    );
    console.log(`  ✓ ${publicBaseUrl}/${key}`);
  }

  console.log('Uploading image fixtures to MinIO…');
  for (const key of imageKeys) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketImages,
        Key: key,
        Body: PLACEHOLDER_JPEG,
        ContentType: 'image/jpeg',
      }),
    );
    console.log(`  ✓ ${publicImagesUrl}/${key}`);
  }

  return {
    audioUrls: audioKeys.map((k) => `${publicBaseUrl}/${k}`),
    artworkUrls: imageKeys.map((k) => `${publicImagesUrl}/${k}`),
  };
}

// ---------------------------------------------------------------------------
// Database seed data
// ---------------------------------------------------------------------------

async function seedDatabase(audioUrls: string[], artworkUrls: string[]) {
  console.log('\nSeeding database…');

  // Clear existing seed data (idempotent re-run)
  await db.delete(schema.tracks);
  await db.delete(schema.albums);
  await db.delete(schema.reciters);

  // Reciters
  const [bashirMansouri, sajjadZaidi, haiderQayyum] = await db
    .insert(schema.reciters)
    .values([
      { name: 'Bashir Mansouri', slug: 'bashir-mansouri' },
      { name: 'Sajjad Zaidi', slug: 'sajjad-zaidi' },
      { name: 'Haider Qayyum', slug: 'haider-qayyum' },
      { name: 'Ali Safdar', slug: 'ali-safdar' },
      { name: 'Mirza Saadat Baig', slug: 'mirza-saadat-baig' },
    ])
    .returning();

  console.log('  ✓ 5 reciters inserted');

  if (!bashirMansouri || !sajjadZaidi || !haiderQayyum) {
    throw new Error('Failed to insert reciters');
  }

  // Albums
  const [album1, album2, album3] = await db
    .insert(schema.albums)
    .values([
      {
        title: 'Manqabat Collection Vol. 1',
        slug: 'manqabat-collection-vol-1',
        reciterId: bashirMansouri.id,
        year: 2020,
        artworkUrl: artworkUrls[0],
      },
      {
        title: 'Salam aur Nauha',
        slug: 'salam-aur-nauha',
        reciterId: sajjadZaidi.id,
        year: 2021,
        artworkUrl: artworkUrls[1],
      },
      {
        title: 'Muharram Specials',
        slug: 'muharram-specials',
        reciterId: haiderQayyum.id,
        year: 2022,
        artworkUrl: artworkUrls[1],
      },
      {
        title: 'Best of 2023',
        slug: 'best-of-2023',
        reciterId: bashirMansouri.id,
        year: 2023,
        artworkUrl: artworkUrls[0],
      },
    ])
    .returning();

  console.log('  ✓ 4 albums inserted');

  if (!album1 || !album2 || !album3) {
    throw new Error('Failed to insert albums');
  }

  // Tracks — audioUrl references the uploaded MinIO fixtures
  await db.insert(schema.tracks).values([
    // Album 1
    {
      title: 'Ya Ali Madad',
      slug: 'ya-ali-madad',
      albumId: album1.id,
      trackNumber: 1,
      audioUrl: audioUrls[0],
      duration: 240,
    },
    {
      title: 'Mera Dil Badal De',
      slug: 'mera-dil-badal-de',
      albumId: album1.id,
      trackNumber: 2,
      audioUrl: audioUrls[1],
      duration: 310,
    },
    {
      title: 'Hussain Zindabad',
      slug: 'hussain-zindabad',
      albumId: album1.id,
      trackNumber: 3,
      audioUrl: audioUrls[2],
      duration: 275,
    },
    // Album 2
    {
      title: 'Salam Hussain',
      slug: 'salam-hussain',
      albumId: album2.id,
      trackNumber: 1,
      audioUrl: audioUrls[0],
      duration: 195,
    },
    {
      title: 'Karbala Ka Safar',
      slug: 'karbala-ka-safar',
      albumId: album2.id,
      trackNumber: 2,
      audioUrl: audioUrls[1],
      duration: 360,
    },
    // Album 3
    {
      title: 'Aseer e Zewar e Aza',
      slug: 'aseer-e-zewar-e-aza',
      albumId: album3.id,
      trackNumber: 1,
      audioUrl: audioUrls[2],
      duration: 290,
    },
    {
      title: 'Shah Ast Hussain',
      slug: 'shah-ast-hussain',
      albumId: album3.id,
      trackNumber: 2,
      audioUrl: audioUrls[0],
      duration: 320,
    },
  ]);

  console.log('  ✓ 7 tracks inserted (all with audioUrl → MinIO)');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const { audioUrls, artworkUrls } = await uploadFixtures();
  await seedDatabase(audioUrls, artworkUrls);

  await client.end();

  console.log('\nSeed complete.');
  console.log(`  MinIO console:  http://localhost:9001  (minioadmin / minioadmin)`);
  console.log(`  Audio bucket:   ${publicBaseUrl}`);
  console.log(`  Mailpit UI:     http://localhost:8025`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
