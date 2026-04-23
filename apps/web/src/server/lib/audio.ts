import { parseBuffer } from 'music-metadata';

/**
 * Probe an audio file buffer for its duration in seconds (integer, floored).
 * Returns null if the file is unparseable — caller decides how to handle.
 */
export async function probeAudioDuration(
  buffer: Buffer,
  mimeType: string,
): Promise<number | null> {
  try {
    const metadata = await parseBuffer(buffer, { mimeType });
    const seconds = metadata.format.duration;
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
      return null;
    }
    return Math.floor(seconds);
  } catch {
    return null;
  }
}
