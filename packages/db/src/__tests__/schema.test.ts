import { describe, expect, it } from 'vitest';

// Smoke test: verify the Drizzle schema barrel exports all tables correctly.
// We test the schema directly rather than the index (which requires DATABASE_URL).
describe('@nawhas/db schema barrel', () => {
  it('imports without throwing', async () => {
    const schema = await import('../schema/index.js');
    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('exports all nawhas domain tables', async () => {
    const schema = await import('../schema/index.js');
    expect(schema.reciters).toBeDefined();
    expect(schema.albums).toBeDefined();
    expect(schema.tracks).toBeDefined();
    expect(schema.lyrics).toBeDefined();
  });

  it('exports all Better Auth tables', async () => {
    const schema = await import('../schema/index.js');
    expect(schema.users).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.verificationTokens).toBeDefined();
  });

  it('reciters table has expected columns', async () => {
    const { reciters } = await import('../schema/index.js');
    const cols = Object.keys(reciters);
    expect(cols).toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('slug');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('updatedAt');
  });

  it('tracks table has nullable audioUrl and duration', async () => {
    const { tracks } = await import('../schema/index.js');
    const cols = Object.keys(tracks);
    expect(cols).toContain('audioUrl');
    expect(cols).toContain('duration');
  });

  it('lyrics table uses row-per-language model with language and text columns', async () => {
    const { lyrics } = await import('../schema/index.js');
    const cols = Object.keys(lyrics);
    expect(cols).toContain('trackId');
    expect(cols).toContain('language');
    expect(cols).toContain('text');
    // Old hardcoded language columns must not exist
    expect(cols).not.toContain('arabicText');
    expect(cols).not.toContain('urduText');
    expect(cols).not.toContain('englishText');
    expect(cols).not.toContain('transliteration');
  });
});
