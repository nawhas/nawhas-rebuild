/**
 * E2E Test Seed Fixture
 *
 * Inserts a minimal, deterministic set of test data before each test and
 * cleans it up afterwards so tests are fully independent.
 *
 * Usage: import { test, expect } from '@/fixtures/seed' in any spec file.
 *
 * Data inserted per test run:
 *   - 1 reciter  (slug: test-reciter-e2e-{workerIndex})
 *   - 1 album    (slug: test-album-e2e-{workerIndex}, year: 2024)
 *   - 1 track    (slug: test-track-e2e-{workerIndex}, track number: 1, with audioUrl + youtubeId)
 *   - 1 track    (slug: test-track-2-e2e-{workerIndex}, track number: 2, audio only — for queue tests)
 *   - 2 lyric rows on track 1: Arabic ('ar') + English ('en')
 *
 * Slugs are scoped per Playwright worker to prevent data conflicts when
 * workers run in parallel (workers: 4 in CI).
 *
 * Audio requests are intercepted via page.route() and fulfilled with a
 * minimal silent MP3 buffer so tests never wait on real MinIO I/O.
 */

import { test as base, expect } from '@playwright/test';
import postgres from 'postgres';

const DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/nawhas';

/**
 * Build a silent MPEG1 Layer3 MP3 of the requested duration.
 *
 * Each frame is 417 bytes (128 kbps, 44100 Hz, stereo, no padding).
 * The 4-byte header is valid; the remaining 413 bytes are zeroed-out side
 * information and main data, which decoders interpret as silence.
 *
 * Using multiple seconds of silence prevents a race condition where Howler's
 * `onend` fires (~26 ms for a single-frame placeholder) and clears
 * `currentTrack` from the player store before Playwright assertions can
 * observe the visible PlayerBar.  The auto-advance queue test still works
 * because its 15 s timeout easily outlasts the ~3 s silence.
 */
function buildSilentMp3(durationSec: number): Buffer {
  const header = Buffer.from([0xff, 0xfb, 0x90, 0x00]); // MPEG1 Layer3, 128 kbps, 44100 Hz, stereo
  const frameSize = 417; // int(144 × 128000 / 44100) = 417, no padding
  const framesPerSec = 44100 / 1152; // ≈38.28 frames per second
  const numFrames = Math.ceil(durationSec * framesPerSec);
  const frames: Buffer[] = [];
  for (let i = 0; i < numFrames; i++) {
    const frame = Buffer.alloc(frameSize, 0);
    header.copy(frame, 0);
    frames.push(frame);
  }
  return Buffer.concat(frames);
}

/** ~3-second silent MP3 — long enough for all player assertions, short enough for auto-advance test (15 s limit). */
const PLACEHOLDER_MP3 = buildSilentMp3(3);

/**
 * MinIO public base URL — differs between local dev (localhost) and Docker CI
 * (minio service name) because the browser inside the Playwright container
 * cannot reach the host-mapped port via localhost.
 */
const MINIO_BASE_URL =
  process.env['DOCKER'] === 'true'
    ? 'http://minio:9000/nawhas-audio'
    : 'http://localhost:9000/nawhas-audio';

export { expect };

export interface SeedData {
  reciter: { id: string; name: string; slug: string };
  album: { id: string; title: string; slug: string; year: number };
  track: { id: string; title: string; slug: string; audioUrl: string; youtubeId: string };
  track2: { id: string; title: string; slug: string };
}

async function insertSeedData(workerIndex: number): Promise<SeedData> {
  const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 5 });
  const w = workerIndex;

  try {
    // Reciter — idempotent via ON CONFLICT; slug scoped to worker
    const [reciter] = await sql<{ id: string; name: string; slug: string }[]>`
      INSERT INTO reciters (id, name, slug)
      VALUES (gen_random_uuid(), 'Test Reciter E2E', ${'test-reciter-e2e-' + w})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, slug
    `;

    if (!reciter) throw new Error('Failed to insert reciter');

    // Album — unique per (reciter_id, slug)
    const [album] = await sql<{ id: string; title: string; slug: string; year: number }[]>`
      INSERT INTO albums (id, title, slug, reciter_id, year)
      VALUES (gen_random_uuid(), 'Test Album E2E', ${'test-album-e2e-' + w}, ${reciter.id}, 2024)
      ON CONFLICT (reciter_id, slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id, title, slug, year
    `;

    if (!album) throw new Error('Failed to insert album');

    // Track — unique per (album_id, slug)
    const [track] = await sql<{ id: string; title: string; slug: string; audio_url: string; youtube_id: string }[]>`
      INSERT INTO tracks (id, title, slug, album_id, track_number, audio_url, youtube_id)
      VALUES (
        gen_random_uuid(),
        'Test Track E2E',
        ${'test-track-e2e-' + w},
        ${album.id},
        1,
        ${MINIO_BASE_URL + '/fixtures/track-001.mp3'},
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
        ${'test-track-2-e2e-' + w},
        ${album.id},
        2,
        ${MINIO_BASE_URL + '/fixtures/track-002.mp3'}
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
  const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 5 });
  try {
    // Cascade handles albums → tracks → lyrics
    await sql`DELETE FROM reciters WHERE id = ${reciterId}`;
  } finally {
    await sql.end();
  }
}

type Fixtures = { seedData: SeedData };

export const test = base.extend<Fixtures>({
  // Override the built-in page fixture to intercept audio requests.
  // This prevents tests from waiting on real MinIO I/O and ensures
  // consistent behaviour regardless of network conditions.
  page: async ({ page }, use) => {
    await page.route('**/*.mp3', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: PLACEHOLDER_MP3,
      }),
    );
    await use(page);
  },

  seedData: async ({}, use, testInfo) => {
    const data = await insertSeedData(testInfo.workerIndex);
    await use(data);
    await deleteSeedData(data.reciter.id);
  },
});
