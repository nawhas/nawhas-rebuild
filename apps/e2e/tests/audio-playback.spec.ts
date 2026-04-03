/**
 * E2E Tests — Audio Playback & Queue
 *
 * Covers all acceptance criteria for NAW-100.
 *
 * STATUS: Tests are scaffolded as todo pending the following implementation tickets:
 *   - NAW-94: Howler.js audio engine integration
 *   - NAW-95: Persistent player bar UI (desktop)
 *   - NAW-97: Play buttons on track/album cards and pages
 *   - NAW-98: Queue management UI
 *   - NAW-99: YouTube embed on track detail page
 *
 * Once those tickets are merged, replace each test.todo() with a full
 * implementation using the same semantic-selector patterns as the rest of
 * the E2E suite (getByRole, getByLabel — no data-testid).
 *
 * Seed note: the seed fixture now includes audioUrl and youtubeId on the
 * test track (track-001.mp3 on MinIO + youtubeId 'dQw4w9WgXcQ').
 * For Next/Previous tests a second seed track will be needed — add it to
 * the seed fixture at that time.
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/seed';

// ---------------------------------------------------------------------------
// Player bar — appearance & persistence
// ---------------------------------------------------------------------------

test.describe('Audio playback — player bar', () => {
  /**
   * NAW-95 + NAW-97 required.
   * Steps: navigate to album detail → click Play on the seeded track → assert
   * a persistent player bar region is visible.
   * Expected selector: page.getByRole('region', { name: /now playing/i })
   */
  test.todo('playing a track from the album detail page causes the player bar to appear');

  /**
   * NAW-95 + NAW-97 required.
   * Steps: play a track on album detail → navigate to /reciters → assert
   * the player bar is still visible after navigation.
   */
  test.todo('player bar persists after navigating to another page');
});

// ---------------------------------------------------------------------------
// Player bar — transport controls
// ---------------------------------------------------------------------------

test.describe('Audio playback — transport controls', () => {
  /**
   * NAW-94 + NAW-95 required.
   * Steps: play a track → click the Play/Pause button → assert isPlaying
   * state toggles (aria-label changes between "Pause" and "Play").
   */
  test.todo('Play/Pause button toggles playback state');

  /**
   * NAW-95 required. Needs a second track in the queue.
   * Steps: play album (2+ tracks) → click Next → assert player shows next
   * track title.
   */
  test.todo('Next button advances to the next track in the queue');

  /**
   * NAW-95 required. Needs a second track in the queue.
   * Steps: play album (2+ tracks) → advance to track 2 → click Previous →
   * assert player shows track 1.
   */
  test.todo('Previous button goes to the previous track in the queue');

  /**
   * NAW-95 required.
   * Steps: play a track → interact with the seek slider → assert the
   * seek bar position (aria-valuenow) reflects the new value.
   * Expected selector: page.getByRole('slider', { name: /seek/i })
   */
  test.todo('seek bar reflects updated position after interaction');
});

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------

test.describe('Audio playback — queue', () => {
  /**
   * NAW-97 + NAW-98 required.
   * Steps: navigate to album detail → click "Play All" → assert player bar
   * appears and queue panel shows all album tracks.
   * Expected selector: page.getByRole('button', { name: /play all/i })
   */
  test.todo('"Play All" on the album page populates the queue and begins playback');

  /**
   * NAW-97 + NAW-98 required.
   * Steps: navigate to album detail → click "Add to queue" on the seeded
   * track → open queue panel → assert the track appears in the list.
   * Expected selector: page.getByRole('button', { name: /add to queue/i })
   */
  test.todo('adding a track via "Add to queue" makes it appear in the queue panel');
});

// ---------------------------------------------------------------------------
// YouTube embed
// ---------------------------------------------------------------------------

test.describe('Audio playback — YouTube embed', () => {
  /**
   * NAW-99 required.
   * Steps: navigate to track detail for a track with youtubeId → assert a
   * "Video" (or "YouTube") tab is visible alongside the audio tab.
   * Expected selector: page.getByRole('tab', { name: /video/i })
   */
  test.todo('track with a youtubeId shows a YouTube embed tab on the track detail page');

  /**
   * NAW-94 + NAW-99 required.
   * Steps: play the track (audio starts) → click the YouTube tab → assert
   * audio is paused (Play button label changes to "Play" / aria-pressed=false).
   */
  test.todo('switching to the YouTube tab pauses audio playback');
});
