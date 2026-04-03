/**
 * E2E Test Seed Fixture
 *
 * Inserts a minimal, deterministic set of test data before each test and
 * cleans it up afterwards so tests are fully independent.
 *
 * Usage: import { test, expect } from '@/fixtures/seed' in any spec file.
 *
 * Data inserted per test run:
 *   - 1 reciter  (slug: test-reciter-e2e)
 *   - 1 album    (slug: test-album-e2e, year: 2024)
 *   - 1 track    (slug: test-track-e2e, track number: 1, with audioUrl + youtubeId)
 *   - 1 track    (slug: test-track-2-e2e, track number: 2, audio only — for queue tests)
 *   - 2 lyric rows on track 1: Arabic ('ar') + English ('en')
 */

import { test as base, expect } from '@playwright/test';
import postgres from 'postgres';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/nawhas';

export { expect };

export interface SeedData {
  reciter: { id: string; name: string; slug: string };
  album: { id: string; title: string; slug: string; year: number };
  track: { id: string; title: string; slug: string; audioUrl: string; youtubeId: string };
  track2: { id: string; title: string; slug: string };
}

async function insertSeedData(): Promise<SeedData> {
  const sql = postgres(DATABASE_URL);

  try {
    // Reciter — idempotent via ON CONFLICT
    const [reciter] = await sql<{ id: string; name: string; slug: string }[]>`
      INSERT INTO reciters (id, name, slug)
      VALUES (gen_random_uuid(), 'Test Reciter E2E', 'test-reciter-e2e')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, slug
    `;

    if (!reciter) throw new Error('Failed to insert reciter');

    // Album — unique per (reciter_id, slug)
    const [album] = await sql<{ id: string; title: string; slug: string; year: number }[]>`
      INSERT INTO albums (id, title, slug, reciter_id, year)
      VALUES (gen_random_uuid(), 'Test Album E2E', 'test-album-e2e', ${reciter.id}, 2024)
      ON CONFLICT (reciter_id, slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id, title, slug, year
    `;

    if (!album) throw new Error('Failed to insert album');

    // Track — unique per (album_id, slug)
    // audio_url points to the MinIO test fixture; youtube_id is a stable test video ID.
    const [track] = await sql<{ id: string; title: string; slug: string; audio_url: string; youtube_id: string }[]>`
      INSERT INTO tracks (id, title, slug, album_id, track_number, audio_url, youtube_id)
      VALUES (
        gen_random_uuid(),
        'Test Track E2E',
        'test-track-e2e',
        ${album.id},
        1,
        'http://localhost:9000/nawhas-audio/fixtures/track-001.mp3',
        'dQw4w9WgXcQ'
      )
      ON CONFLICT (album_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        audio_url = EXCLUDED.audio_url,
        youtube_id = EXCLUDED.youtube_id
      RETURNING id, title, slug, audio_url, youtube_id
    `;

    if (!track) throw new Error('Failed to insert track');

    // Lyrics — 2 languages (Arabic + English)
    await sql`
      INSERT INTO lyrics (id, track_id, language, text)
      VALUES
        (gen_random_uuid(), ${track.id}, 'ar', 'يا حسين يا حسين' || chr(10) || 'اختبار النص العربي'),
        (gen_random_uuid(), ${track.id}, 'en', 'Ya Hussain Ya Hussain' || chr(10) || 'English lyrics test')
      ON CONFLICT (track_id, language) DO UPDATE SET text = EXCLUDED.text
    `;

    // Second track — audio only, no youtubeId; used for Next/Previous queue tests
    const [track2] = await sql<{ id: string; title: string; slug: string }[]>`
      INSERT INTO tracks (id, title, slug, album_id, track_number, audio_url)
      VALUES (
        gen_random_uuid(),
        'Test Track 2 E2E',
        'test-track-2-e2e',
        ${album.id},
        2,
        'http://localhost:9000/nawhas-audio/fixtures/track-002.mp3'
      )
      ON CONFLICT (album_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        audio_url = EXCLUDED.audio_url
      RETURNING id, title, slug
    `;

    if (!track2) throw new Error('Failed to insert track2');

    return {
      reciter: { id: reciter.id, name: reciter.name, slug: reciter.slug },
      album: { id: album.id, title: album.title, slug: album.slug, year: album.year },
      track: {
        id: track.id,
        title: track.title,
        slug: track.slug,
        audioUrl: track.audio_url,
        youtubeId: track.youtube_id,
      },
      track2: { id: track2.id, title: track2.title, slug: track2.slug },
    };
  } finally {
    await sql.end();
  }
}

async function deleteSeedData(reciterId: string): Promise<void> {
  const sql = postgres(DATABASE_URL);
  try {
    // Cascade handles albums → tracks → lyrics
    await sql`DELETE FROM reciters WHERE id = ${reciterId}`;
  } finally {
    await sql.end();
  }
}

type Fixtures = { seedData: SeedData };

export const test = base.extend<Fixtures>({
  seedData: async ({}, use) => {
    const data = await insertSeedData();
    await use(data);
    await deleteSeedData(data.reciter.id);
  },
});
