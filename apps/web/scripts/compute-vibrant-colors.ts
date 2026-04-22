/**
 * Phase 2.3 Task 10 — one-shot script that extracts a dominant-muted color
 * from every album's artwork using `node-vibrant` and persists the hex back
 * to `albums.vibrant_color`.
 *
 * Idempotent: only processes albums whose `vibrant_color` is currently NULL.
 * Albums without an `artwork_url` are skipped.
 *
 * Usage (from repo root):
 *   pnpm --filter @nawhas/web exec tsx scripts/compute-vibrant-colors.ts
 *
 * Requires DATABASE_URL in the environment (e.g. via the web container's
 * `docker compose exec web …` shell, which has it pre-set).
 *
 * Colour preference order (legacy parity): DarkMuted → DarkVibrant → Muted.
 * On extraction failure, we persist FALLBACK so the album isn't retried on
 * the next run — the render layer treats any non-null colour as valid.
 */
import { db, albums } from '@nawhas/db';
import { eq, isNull } from 'drizzle-orm';
import { Vibrant } from 'node-vibrant/node';

const FALLBACK = '#18181b'; // zinc-900

async function main(): Promise<void> {
  const targets = await db.select().from(albums).where(isNull(albums.vibrantColor));
  console.log(`Found ${targets.length} albums missing vibrant_color.`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const album of targets) {
    if (!album.artworkUrl) {
      console.log(`  skip ${album.id} (${album.slug}) — no artwork URL`);
      skipped++;
      continue;
    }
    try {
      const palette = await Vibrant.from(album.artworkUrl).getPalette();
      const hex =
        palette.DarkMuted?.hex ??
        palette.DarkVibrant?.hex ??
        palette.Muted?.hex ??
        FALLBACK;
      await db
        .update(albums)
        .set({ vibrantColor: hex })
        .where(eq(albums.id, album.id));
      console.log(`  ${album.id} (${album.slug}): ${hex}`);
      processed++;
    } catch (err) {
      console.error(`  ${album.id} (${album.slug}): failed —`, err);
      // Persist FALLBACK so we don't retry this album every run.
      await db
        .update(albums)
        .set({ vibrantColor: FALLBACK })
        .where(eq(albums.id, album.id));
      failed++;
    }
  }

  console.log(
    `Done. processed=${processed} skipped=${skipped} failed=${failed} (total=${targets.length})`,
  );
  process.exit(0);
}

void main();
