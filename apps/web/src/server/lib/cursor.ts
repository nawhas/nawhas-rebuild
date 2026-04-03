/**
 * Cursor-based pagination helpers.
 *
 * Two cursor flavours are supported:
 *
 * 1. Standard cursor — `createdAt|id` encoded as base64.
 *    Ordering: ORDER BY created_at DESC, id ASC
 *    Next-page condition:
 *      (created_at < cursor_created_at) OR (created_at = cursor_created_at AND id > cursor_id)
 *
 * 2. Album cursor — `year|createdAt|id` encoded as base64.
 *    Ordering: ORDER BY year DESC NULLS FIRST, created_at DESC, id ASC
 *    Handles nullable year; see decodeAlbumCursor for null encoding.
 */

export interface DecodedCursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64');
}

export function decodeCursor(cursor: string): DecodedCursor {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  const pipeIndex = decoded.indexOf('|');
  if (pipeIndex === -1) throw new Error('Invalid cursor');
  const isoDate = decoded.substring(0, pipeIndex);
  const id = decoded.substring(pipeIndex + 1);
  return { createdAt: new Date(isoDate), id };
}

export interface DecodedAlbumCursor {
  year: number | null;
  createdAt: Date;
  id: string;
}

/**
 * Encodes a three-field cursor for album listings ordered by
 * (year DESC NULLS FIRST, createdAt DESC, id ASC).
 * Null year is encoded as the literal string "null".
 */
export function encodeAlbumCursor(year: number | null, createdAt: Date, id: string): string {
  const yearPart = year === null ? 'null' : String(year);
  return Buffer.from(`${yearPart}|${createdAt.toISOString()}|${id}`).toString('base64');
}

export function decodeAlbumCursor(cursor: string): DecodedAlbumCursor {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  const firstPipe = decoded.indexOf('|');
  if (firstPipe === -1) throw new Error('Invalid album cursor');
  const secondPipe = decoded.indexOf('|', firstPipe + 1);
  if (secondPipe === -1) throw new Error('Invalid album cursor');
  const yearStr = decoded.substring(0, firstPipe);
  const isoDate = decoded.substring(firstPipe + 1, secondPipe);
  const id = decoded.substring(secondPipe + 1);
  const year = yearStr === 'null' ? null : Number(yearStr);
  return { year, createdAt: new Date(isoDate), id };
}
