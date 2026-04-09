/**
 * Ensures app routes do not reintroduce ISR on DB-backed pages (static prerender
 * during `next build` breaks Docker/CI when no database is reachable).
 *
 * @vitest-environment node
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '../../app');

async function walkTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walkTsFiles(full)));
    } else if (e.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) {
      out.push(full);
    }
  }
  return out;
}

describe('Next app route segment guard (no DB prerender in Docker build)', () => {
  it('forbids export const revalidate under app/', async () => {
    const files = await walkTsFiles(APP_DIR);
    const offenders: string[] = [];
    for (const f of files) {
      const src = await readFile(f, 'utf8');
      if (src.includes('export const revalidate')) {
        offenders.push(path.relative(APP_DIR, f));
      }
    }
    expect(offenders, `Remove ISR from app routes: ${offenders.join(', ')}`).toEqual([]);
  });

  it("requires force-dynamic on any page.tsx that imports @nawhas/db", async () => {
    const files = await walkTsFiles(APP_DIR);
    const pageFiles = files.filter((f) => path.basename(f) === 'page.tsx');
    const offenders: string[] = [];
    for (const f of pageFiles) {
      const src = await readFile(f, 'utf8');
      if (!src.includes('@nawhas/db')) continue;
      if (!src.includes('force-dynamic')) {
        offenders.push(path.relative(APP_DIR, f));
      }
    }
    expect(
      offenders,
      `Add export const dynamic = 'force-dynamic' to: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
