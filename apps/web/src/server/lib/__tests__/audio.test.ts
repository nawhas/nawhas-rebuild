// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { probeAudioDuration } from '../audio';

describe('probeAudioDuration', () => {
  it('returns integer seconds for a known mp3', async () => {
    const buf = readFileSync(join(__dirname, 'fixtures', '5s.mp3'));
    const duration = await probeAudioDuration(buf, 'audio/mpeg');
    // Allow 4 or 5 depending on ffmpeg rounding; assert int in tight range.
    expect(duration).toBeGreaterThanOrEqual(4);
    expect(duration).toBeLessThanOrEqual(6);
  });

  it('returns null on unparseable input', async () => {
    const buf = Buffer.from('not audio');
    const duration = await probeAudioDuration(buf, 'audio/mpeg');
    expect(duration).toBeNull();
  });
});
