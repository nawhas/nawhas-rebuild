/**
 * Cursor-based pagination helpers.
 *
 * Cursors encode `createdAt|id` as base64 so that the pagination key is opaque
 * to clients while remaining easy to decode server-side. Ordering is:
 *   ORDER BY created_at DESC, id ASC
 * which means the next page of results satisfies:
 *   (created_at < cursor_created_at) OR (created_at = cursor_created_at AND id > cursor_id)
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
