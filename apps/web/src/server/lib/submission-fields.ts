import { db, reciters, albums, tracks, lyrics } from '@nawhas/db';
import { eq } from 'drizzle-orm';
import type { SubmissionDTO } from '@nawhas/types';

// ---------------------------------------------------------------------------
// Shared server-side helper — fetch the current entity values for an edit
// submission so the UI can diff proposed vs. current.
// ---------------------------------------------------------------------------

export type LyricsMap = Partial<Record<string, string>>;

export interface CurrentValues {
  // Reciter fields
  name?: string | null;
  slug?: string | null;
  arabicName?: string | null;
  country?: string | null;
  birthYear?: number | null;
  description?: string | null;
  avatarUrl?: string | null;
  // Album fields
  title?: string | null;
  reciterId?: string | null;
  year?: number | null;
  artworkUrl?: string | null;
  // Track fields
  albumId?: string | null;
  trackNumber?: number | null;
  audioUrl?: string | null;
  youtubeId?: string | null;
  duration?: number | null;
  lyrics?: LyricsMap;
}

export async function fetchCurrentValues(submission: SubmissionDTO): Promise<CurrentValues | null> {
  if (submission.action !== 'edit' || !submission.targetId) return null;

  if (submission.type === 'reciter') {
    const [row] = await db.select().from(reciters).where(eq(reciters.id, submission.targetId)).limit(1);
    if (!row) return null;
    return {
      name: row.name,
      slug: row.slug,
      arabicName: row.arabicName,
      country: row.country,
      birthYear: row.birthYear,
      description: row.description,
      avatarUrl: row.avatarUrl,
    };
  }

  if (submission.type === 'album') {
    const [row] = await db.select().from(albums).where(eq(albums.id, submission.targetId)).limit(1);
    if (!row) return null;
    return {
      title: row.title,
      slug: row.slug,
      reciterId: row.reciterId,
      year: row.year,
      artworkUrl: row.artworkUrl,
      description: row.description,
    };
  }

  if (submission.type === 'track') {
    const [row] = await db.select().from(tracks).where(eq(tracks.id, submission.targetId)).limit(1);
    if (!row) return null;
    const lyricRows = await db.select().from(lyrics).where(eq(lyrics.trackId, submission.targetId));
    const lyricsMap: LyricsMap = {};
    for (const lyric of lyricRows) {
      lyricsMap[lyric.language] = lyric.text;
    }
    return {
      title: row.title,
      slug: row.slug,
      albumId: row.albumId,
      trackNumber: row.trackNumber,
      audioUrl: row.audioUrl,
      youtubeId: row.youtubeId,
      duration: row.duration,
      lyrics: lyricsMap,
    };
  }

  return null;
}
