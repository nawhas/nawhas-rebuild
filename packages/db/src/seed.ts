/**
 * Development seed script.
 *
 * Run with: pnpm seed  (or pnpm db:seed)
 *
 * What it does:
 *  1. Creates a moderator account (admin@nawhas.com) — idempotent.
 *  2. Uploads placeholder audio and image fixtures to local MinIO (optional —
 *     skipped gracefully if MinIO is not reachable).
 *  3. Upserts seed rows for reciters (6), albums (11), tracks (36), and lyrics
 *     (12 tracks with Arabic text) so the UI is non-empty.
 *
 * Safe to run multiple times — existing rows are updated in-place; no duplicates.
 */
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { runSearchIndex } from './search-index.js';

type ScryptWithOptions = (password: string, salt: string, keylen: number, options: object) => Promise<Buffer>;
const scryptAsync = promisify(scrypt) as unknown as ScryptWithOptions;

// ---------------------------------------------------------------------------
// Config — all values come from env vars.
// ---------------------------------------------------------------------------
const endpoint = process.env['S3_ENDPOINT'] ?? 'http://localhost:9000';
const accessKeyId = process.env['S3_ACCESS_KEY_ID'] ?? 'minio-user';
const secretAccessKey = process.env['S3_SECRET_ACCESS_KEY'] ?? 'minio-local';
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
// Password hashing — same algorithm as Better Auth (scrypt via @noble/hashes).
// Format: `${salt_hex}:${hash_hex}`  (salt=16 bytes, hash=64 bytes, scrypt params
// N=16384, r=16, p=1 as used by better-auth/dist/crypto/password.mjs)
// ---------------------------------------------------------------------------

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password.normalize('NFKC'), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  })) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

// ---------------------------------------------------------------------------
// Moderator account
// ---------------------------------------------------------------------------

const MODERATOR_EMAIL = 'admin@nawhas.com';
const MODERATOR_PASSWORD = (() => {
  const p = process.env['SEED_MODERATOR_PASSWORD'];
  if (!p) throw new Error('SEED_MODERATOR_PASSWORD env var is required');
  return p;
})();
const MODERATOR_USER_ID = 'seed-moderator-00000000-0000-0001';
const MODERATOR_ACCOUNT_ID = 'seed-moderator-account-00000000-0001';

async function seedModerator(): Promise<void> {
  console.log('\nSeeding moderator account…');
  const now = new Date();

  await db
    .insert(schema.users)
    .values({
      id: MODERATOR_USER_ID,
      name: 'Nawhas Admin',
      email: MODERATOR_EMAIL,
      emailVerified: true,
      role: 'moderator',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        role: sql`excluded.role`,
        updatedAt: sql`excluded."updatedAt"`,
      },
    });

  const hashedPassword = await hashPassword(MODERATOR_PASSWORD);

  await db
    .insert(schema.accounts)
    .values({
      id: MODERATOR_ACCOUNT_ID,
      userId: MODERATOR_USER_ID,
      accountId: MODERATOR_EMAIL,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.accounts.id,
      set: {
        password: sql`excluded.password`,
        updatedAt: sql`excluded."updatedAt"`,
      },
    });

  console.log(`  ✓ Moderator: ${MODERATOR_EMAIL} / ****`);
}

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
// MinIO fixture uploads (optional — failures are caught and logged)
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

  try {
    console.log('Uploading audio fixtures to MinIO…');
    for (const key of audioKeys) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketAudio,
          Key: key,
          Body: PLACEHOLDER_MP3,
          ContentType: 'audio/mpeg',
          CacheControl: 'public, max-age=31536000, immutable',
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
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      console.log(`  ✓ ${publicImagesUrl}/${key}`);
    }

    return {
      audioUrls: audioKeys.map((k) => `${publicBaseUrl}/${k}`),
      artworkUrls: imageKeys.map((k) => `${publicImagesUrl}/${k}`),
    };
  } catch {
    console.warn('  ⚠ MinIO not reachable — skipping fixture upload. Audio URLs will be null.');
    return { audioUrls: [], artworkUrls: [] };
  }
}

// ---------------------------------------------------------------------------
// Database seed data — all inserts use onConflictDoUpdate for idempotency.
// ---------------------------------------------------------------------------

async function seedDatabase(audioUrls: string[], artworkUrls: string[]) {
  console.log('\nSeeding database…');

  const audio = (i: number) => audioUrls[i % audioUrls.length] ?? null;
  const artwork = (i: number) => artworkUrls[i % artworkUrls.length] ?? null;

  // ── Reciters (6) ──────────────────────────────────────────────────────────
  const [mirHasanMir, nadeemSarwar, aliSafdar, shadmanRaza, mesumAbbas, salmaBatool] = await db
    .insert(schema.reciters)
    .values([
      { name: 'Mir Hasan Mir', slug: 'mir-hasan-mir' },
      { name: 'Nadeem Sarwar', slug: 'nadeem-sarwar' },
      { name: 'Ali Safdar', slug: 'ali-safdar' },
      { name: 'Shadman Raza', slug: 'shadman-raza' },
      { name: 'Mesum Abbas', slug: 'mesum-abbas' },
      { name: 'Salma Batool', slug: 'salma-batool' },
    ])
    .onConflictDoUpdate({
      target: schema.reciters.slug,
      set: { name: sql`excluded.name` },
    })
    .returning();

  if (!mirHasanMir || !nadeemSarwar || !aliSafdar || !shadmanRaza || !mesumAbbas || !salmaBatool) {
    throw new Error('Failed to upsert reciters');
  }

  console.log('  ✓ 6 reciters upserted');

  // ── Albums (11) ───────────────────────────────────────────────────────────
  const [
    mhm1437, mhm1440, mhm1443,
    ns1435, ns1438, ns1442,
    as1436, as1441,
    sr1439, ma1444,
    sb1440,
  ] = await db
    .insert(schema.albums)
    .values([
      // Mir Hasan Mir — 3 albums
      { title: 'Muharram 1437', slug: 'muharram-1437', reciterId: mirHasanMir.id, year: 2015, artworkUrl: artwork(0) },
      { title: 'Muharram 1440', slug: 'muharram-1440', reciterId: mirHasanMir.id, year: 2018, artworkUrl: artwork(1) },
      { title: 'Muharram 1443', slug: 'muharram-1443', reciterId: mirHasanMir.id, year: 2021, artworkUrl: artwork(0) },
      // Nadeem Sarwar — 3 albums
      { title: 'Muharram 1435', slug: 'muharram-1435', reciterId: nadeemSarwar.id, year: 2013, artworkUrl: artwork(1) },
      { title: 'Muharram 1438', slug: 'muharram-1438', reciterId: nadeemSarwar.id, year: 2016, artworkUrl: artwork(0) },
      { title: 'Muharram 1442', slug: 'muharram-1442', reciterId: nadeemSarwar.id, year: 2020, artworkUrl: artwork(1) },
      // Ali Safdar — 2 albums
      { title: 'Muharram 1436', slug: 'muharram-1436', reciterId: aliSafdar.id, year: 2014, artworkUrl: artwork(0) },
      { title: 'Muharram 1441', slug: 'muharram-1441', reciterId: aliSafdar.id, year: 2019, artworkUrl: artwork(1) },
      // Shadman Raza — 1 album
      { title: 'Muharram 1439', slug: 'muharram-1439', reciterId: shadmanRaza.id, year: 2017, artworkUrl: artwork(0) },
      // Mesum Abbas — 1 album
      { title: 'Muharram 1444', slug: 'muharram-1444', reciterId: mesumAbbas.id, year: 2022, artworkUrl: artwork(1) },
      // Salma Batool — 1 album
      { title: 'Muharram 1440', slug: 'muharram-1440', reciterId: salmaBatool.id, year: 2018, artworkUrl: artwork(0) },
    ])
    .onConflictDoUpdate({
      target: [schema.albums.reciterId, schema.albums.slug],
      set: {
        title: sql`excluded.title`,
        year: sql`excluded.year`,
        artworkUrl: sql`excluded.artwork_url`,
      },
    })
    .returning();

  if (!mhm1437 || !mhm1440 || !mhm1443 || !ns1435 || !ns1438 || !ns1442 || !as1436 || !as1441 || !sr1439 || !ma1444 || !sb1440) {
    throw new Error('Failed to upsert albums');
  }

  console.log('  ✓ 11 albums upserted');

  // ── Tracks (36) ───────────────────────────────────────────────────────────
  const insertedTracks = await db
    .insert(schema.tracks)
    .values([
      // Mir Hasan Mir — Muharram 1437 (4 tracks)
      { title: 'Ya Hussain', slug: 'ya-hussain', albumId: mhm1437.id, trackNumber: 1, audioUrl: audio(0), youtubeId: 'dQw4w9WgXcQ', duration: 420 },
      { title: 'Mera Dil Karbala', slug: 'mera-dil-karbala', albumId: mhm1437.id, trackNumber: 2, audioUrl: audio(1), duration: 390 },
      { title: 'Shab e Ashoor', slug: 'shab-e-ashoor', albumId: mhm1437.id, trackNumber: 3, audioUrl: audio(2), duration: 480 },
      { title: 'Alamdar', slug: 'alamdar', albumId: mhm1437.id, trackNumber: 4, audioUrl: audio(0), duration: 450 },

      // Mir Hasan Mir — Muharram 1440 (4 tracks)
      { title: 'Hussain Zindabad', slug: 'hussain-zindabad', albumId: mhm1440.id, trackNumber: 1, audioUrl: audio(1), duration: 400 },
      { title: 'Labaik Ya Hussain', slug: 'labaik-ya-hussain', albumId: mhm1440.id, trackNumber: 2, audioUrl: audio(2), duration: 375 },
      { title: 'Sabr e Zainab', slug: 'sabr-e-zainab', albumId: mhm1440.id, trackNumber: 3, audioUrl: audio(0), duration: 510 },
      { title: 'Karbala Ki Mitti', slug: 'karbala-ki-mitti', albumId: mhm1440.id, trackNumber: 4, audioUrl: audio(1), duration: 395 },

      // Mir Hasan Mir — Muharram 1443 (3 tracks)
      { title: 'Mola Abbas', slug: 'mola-abbas', albumId: mhm1443.id, trackNumber: 1, audioUrl: audio(2), duration: 460 },
      { title: 'Roz e Ashoor', slug: 'roz-e-ashoor', albumId: mhm1443.id, trackNumber: 2, audioUrl: audio(0), duration: 440 },
      { title: 'Sham e Gham', slug: 'sham-e-gham', albumId: mhm1443.id, trackNumber: 3, audioUrl: audio(1), duration: 500 },

      // Nadeem Sarwar — Muharram 1435 (3 tracks)
      { title: 'Maa Ki Dua', slug: 'maa-ki-dua', albumId: ns1435.id, trackNumber: 1, audioUrl: audio(2), duration: 350 },
      { title: 'Woh Karbala', slug: 'woh-karbala', albumId: ns1435.id, trackNumber: 2, audioUrl: audio(0), duration: 430 },
      { title: 'Jholi Bharo', slug: 'jholi-bharo', albumId: ns1435.id, trackNumber: 3, audioUrl: audio(1), duration: 380 },

      // Nadeem Sarwar — Muharram 1438 (3 tracks)
      { title: 'Sakina', slug: 'sakina', albumId: ns1438.id, trackNumber: 1, audioUrl: audio(2), duration: 465 },
      { title: 'Abbas Mera', slug: 'abbas-mera', albumId: ns1438.id, trackNumber: 2, audioUrl: audio(0), duration: 420 },
      { title: 'Imam e Zaman', slug: 'imam-e-zaman', albumId: ns1438.id, trackNumber: 3, audioUrl: audio(1), duration: 390 },

      // Nadeem Sarwar — Muharram 1442 (3 tracks)
      { title: 'Mola Ali', slug: 'mola-ali', albumId: ns1442.id, trackNumber: 1, audioUrl: audio(2), duration: 420 },
      { title: 'Bibi Fatima', slug: 'bibi-fatima', albumId: ns1442.id, trackNumber: 2, audioUrl: audio(0), duration: 395 },
      { title: 'Roze Pe Aana', slug: 'roze-pe-aana', albumId: ns1442.id, trackNumber: 3, audioUrl: audio(1), duration: 480 },

      // Ali Safdar — Muharram 1436 (3 tracks)
      { title: 'Karbala', slug: 'karbala', albumId: as1436.id, trackNumber: 1, audioUrl: audio(2), duration: 460 },
      { title: 'Matam e Hussain', slug: 'matam-e-hussain', albumId: as1436.id, trackNumber: 2, audioUrl: audio(0), duration: 415 },
      { title: 'Ghaazi Abbas', slug: 'ghaazi-abbas', albumId: as1436.id, trackNumber: 3, audioUrl: audio(1), duration: 375 },

      // Ali Safdar — Muharram 1441 (3 tracks)
      { title: 'Sham e Ghariban', slug: 'sham-e-ghariban', albumId: as1441.id, trackNumber: 1, audioUrl: audio(2), duration: 540 },
      { title: 'Hussain Hai', slug: 'hussain-hai', albumId: as1441.id, trackNumber: 2, audioUrl: audio(0), duration: 410 },
      { title: 'Waris e Anbiya', slug: 'waris-e-anbiya', albumId: as1441.id, trackNumber: 3, audioUrl: audio(1), duration: 385 },

      // Shadman Raza — Muharram 1439 (3 tracks)
      { title: 'Ali Haider', slug: 'ali-haider', albumId: sr1439.id, trackNumber: 1, audioUrl: audio(2), duration: 430 },
      { title: 'Nohay Ki Raat', slug: 'nohay-ki-raat', albumId: sr1439.id, trackNumber: 2, audioUrl: audio(0), duration: 395 },
      { title: 'Koi Nahi Hussain Sa', slug: 'koi-nahi-hussain-sa', albumId: sr1439.id, trackNumber: 3, audioUrl: audio(1), duration: 450 },

      // Mesum Abbas — Muharram 1444 (3 tracks)
      { title: 'Shair e Karbala', slug: 'shair-e-karbala', albumId: ma1444.id, trackNumber: 1, audioUrl: audio(2), duration: 420 },
      { title: 'Shahadat', slug: 'shahadat', albumId: ma1444.id, trackNumber: 2, audioUrl: audio(0), duration: 465 },
      { title: 'Zainab Ki Sadayen', slug: 'zainab-ki-sadayen', albumId: ma1444.id, trackNumber: 3, audioUrl: audio(1), duration: 500 },

      // Salma Batool — Muharram 1440 (3 tracks)
      { title: 'Dua e Kumayl', slug: 'dua-e-kumayl', albumId: sb1440.id, trackNumber: 1, audioUrl: audio(2), duration: 600 },
      { title: 'Ziyarat e Ashura', slug: 'ziyarat-e-ashura', albumId: sb1440.id, trackNumber: 2, audioUrl: audio(0), duration: 720 },
      { title: 'Mujhe Hussnain De', slug: 'mujhe-hussnain-de', albumId: sb1440.id, trackNumber: 3, audioUrl: audio(1), duration: 380 },
    ])
    .onConflictDoUpdate({
      target: [schema.tracks.albumId, schema.tracks.slug],
      set: {
        title: sql`excluded.title`,
        trackNumber: sql`excluded.track_number`,
        audioUrl: sql`excluded.audio_url`,
        youtubeId: sql`excluded.youtube_id`,
        duration: sql`excluded.duration`,
      },
    })
    .returning();

  console.log(`  ✓ ${insertedTracks.length} tracks upserted`);

  // Build track lookup: albumId+slug → track
  const trackByAlbumSlug = Object.fromEntries(
    insertedTracks.map((t) => [`${t.albumId}:${t.slug}`, t]),
  );
  const t = (albumId: string, slug: string) => {
    const track = trackByAlbumSlug[`${albumId}:${slug}`];
    if (!track) throw new Error(`Track not found: album=${albumId} slug=${slug}`);
    return track.id;
  };

  // ── Lyrics — row-per-language model ──────────────────────────────────────
  await db
    .insert(schema.lyrics)
    .values([
      // mhm1437 — ya-hussain
      { trackId: t(mhm1437.id, 'ya-hussain'), language: 'ar', text: 'يا حسين، يا حسين\nأنت نور العيون\nفداكَ روحي يا حسين' },
      { trackId: t(mhm1437.id, 'ya-hussain'), language: 'transliteration', text: 'Ya Hussain, Ya Hussain\nAnta noor al-uyoon\nFidaka rohi ya Hussain' },
      // mhm1437 — mera-dil-karbala
      { trackId: t(mhm1437.id, 'mera-dil-karbala'), language: 'ar', text: 'قلبي في كربلاء\nعيوني تبكي دماً\nيا شهيد الأحرار' },
      { trackId: t(mhm1437.id, 'mera-dil-karbala'), language: 'transliteration', text: "Qalbi fi Karbala\n'Uyooni tabki daman\nYa shaheed al-ahrar" },
      // mhm1437 — shab-e-ashoor
      { trackId: t(mhm1437.id, 'shab-e-ashoor'), language: 'ar', text: 'ليلة عاشوراء\nليلة الدماء والبكاء\nيا إمام الشهداء' },
      { trackId: t(mhm1437.id, 'shab-e-ashoor'), language: 'transliteration', text: 'Laylat Ashura\nLaylat al-dima wal-buka\nYa imam al-shuhada' },
      // mhm1440 — hussain-zindabad
      { trackId: t(mhm1440.id, 'hussain-zindabad'), language: 'ar', text: 'الحسين حيٌّ أبدا\nذكره لا يُنسى\nسلام عليك يا سيدي' },
      { trackId: t(mhm1440.id, 'hussain-zindabad'), language: 'transliteration', text: 'Al-Hussain hayyun abadan\nDhikruhu la yunsaa\nSalaam alayka ya sayyidi' },
      // mhm1440 — labaik-ya-hussain
      { trackId: t(mhm1440.id, 'labaik-ya-hussain'), language: 'ar', text: 'لبيك يا حسين\nلبيك يا مظلوم\nكل دم يصرخ لبيك' },
      { trackId: t(mhm1440.id, 'labaik-ya-hussain'), language: 'transliteration', text: 'Labbayk ya Hussain\nLabbayk ya madhloom\nKull dam yasrukh labbayk' },
      // ns1435 — maa-ki-dua
      { trackId: t(ns1435.id, 'maa-ki-dua'), language: 'ar', text: 'دعاء الأم لولدها\nيا رب احفظ حسيني\nبأمانك يا إلهي' },
      { trackId: t(ns1435.id, 'maa-ki-dua'), language: 'transliteration', text: "Du'a al-umm li-waladiha\nYa rabb ihfadh Hussayni\nBi-amanik ya ilahi" },
      // ns1438 — sakina
      { trackId: t(ns1438.id, 'sakina'), language: 'ar', text: 'سكينة يا سكينة\nأبوكِ في السماء\nيشتاق إليكِ يا حبيبة' },
      { trackId: t(ns1438.id, 'sakina'), language: 'transliteration', text: 'Sakinah ya Sakinah\nAbooki fi al-sama\nYashtaq ilayki ya habibah' },
      // ns1442 — mola-ali
      { trackId: t(ns1442.id, 'mola-ali'), language: 'ar', text: 'يا علي يا علي\nيا أمير المؤمنين\nأنت باب مدينة العلم' },
      { trackId: t(ns1442.id, 'mola-ali'), language: 'transliteration', text: 'Ya Ali ya Ali\nYa amir al-mumineen\nAnta bab madinat al-ilm' },
      // as1436 — karbala
      { trackId: t(as1436.id, 'karbala'), language: 'ar', text: 'كربلاء يا كربلاء\nأرض الفداء والوفاء\nفيكِ دُفن أبطال الإسلام' },
      { trackId: t(as1436.id, 'karbala'), language: 'transliteration', text: 'Karbala ya Karbala\nArd al-fida wal-wafa\nFiki dufina abtal al-Islam' },
      // as1441 — sham-e-ghariban
      { trackId: t(as1441.id, 'sham-e-ghariban'), language: 'ar', text: 'شمع الغريبات يشتعل\nفي ظلام الشام الليل\nيا زينب صبرًا صبرًا' },
      { trackId: t(as1441.id, 'sham-e-ghariban'), language: 'transliteration', text: 'Sham al-gharibat yashtail\nFi dhulmat al-Sham al-layl\nYa Zaynab sabran sabra' },
      // sr1439 — ali-haider
      { trackId: t(sr1439.id, 'ali-haider'), language: 'ar', text: 'علي حيدر كرار\nأسد الله المختار\nيا أبا الحسن الأبرار' },
      { trackId: t(sr1439.id, 'ali-haider'), language: 'transliteration', text: 'Ali Haydar Karrar\nAsad Allah al-mukhtar\nYa Aba al-Hasan al-abrar' },
      // ma1444 — shair-e-karbala
      { trackId: t(ma1444.id, 'shair-e-karbala'), language: 'ar', text: 'شاعر كربلاء يبكي\nبدموع الدم العيون\nعلى شهيد بني هاشم' },
      { trackId: t(ma1444.id, 'shair-e-karbala'), language: 'transliteration', text: 'Shair Karbala yabki\nBi-dumu al-dam al-uyun\nAla shahid Bani Hashim' },
    ])
    .onConflictDoUpdate({
      target: [schema.lyrics.trackId, schema.lyrics.language],
      set: { text: sql`excluded.text` },
    });

  console.log('  ✓ 24 lyrics rows upserted (12 Arabic + 12 transliteration)');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function seed(): Promise<void> {
  await seedModerator();
  const { audioUrls, artworkUrls } = await uploadFixtures();
  await seedDatabase(audioUrls, artworkUrls);

  console.log('\nIndexing seed data into Typesense…');
  try {
    await runSearchIndex(db);
    console.log('  ✓ Typesense index updated');
  } catch (err) {
    console.warn('  ⚠ Typesense not reachable — skipping search index.', err instanceof Error ? err.message : err);
  }
}

async function main() {
  await seed();

  await client.end();

  console.log('\nSeed complete.');
  console.log(`  MinIO console : http://localhost:9001  (minioadmin / minioadmin)`);
  console.log(`  Audio bucket  : ${publicBaseUrl}`);
  console.log(`  Moderator     : ${MODERATOR_EMAIL}  /  ****`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
