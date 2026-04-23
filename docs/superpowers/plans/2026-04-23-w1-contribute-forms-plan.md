# W1 Contribute Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal contribute forms with richer, production-grade submission flows — parent pickers instead of UUID paste, upload widgets for artwork and audio, auto-generated slugs, first-class lyrics support, draft autosave, and unsaved-changes protection. Ship the schema and backend that backs all of it.

**Architecture:** Extend existing Drizzle schemas (reciters, albums, submissions) with new optional columns, introduce an `access_requests` table (used later by W3 but migrated now), extend Zod submission schemas and the tRPC `moderation.applyApproved` step to write the new fields, add two presigned-upload endpoints that mirror the existing `/api/avatar/upload` pattern, and rewrite the three React submission forms as composed units that use shared primitives (ParentPicker, ImageUpload, AudioUpload, SlugPreview, LyricsTabs, useDraftAutosave, useUnsavedChangesGuard).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, PostgreSQL, tRPC, Zod, React 19, Tailwind tokens, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `music-metadata` (new, for audio duration), Vitest, Playwright, next-intl.

**Reference docs:**
- Spec: [`docs/superpowers/specs/2026-04-23-contributor-moderator-overhaul-design.md`](../specs/2026-04-23-contributor-moderator-overhaul-design.md)
- Storage helpers: `apps/web/src/lib/storage.ts`
- Existing upload pattern: `apps/web/src/components/profile/avatar-upload.tsx` and the API route it posts to
- Existing moderation router: `apps/web/src/server/routers/moderation.ts:1`
- Existing submission router: `apps/web/src/server/routers/submission.ts:1`

**Dev commands (all through `./dev`):**
- `./dev typecheck` — TypeScript across workspace
- `./dev lint` — ESLint
- `./dev test` — Vitest (integration tests require `./dev -T up -d` first for test DB)
- `./dev -T test` — Vitest against test stack
- `./dev qa` — typecheck + lint + test
- `./dev db:migrate` — apply migrations
- `./dev test:e2e` — Playwright

**Commit style:** Match existing log — `feat(contribute): ...`, `feat(db): ...`, `feat(api): ...`, `test(contribute): ...`. Plan assumes direct commits to `main` (no branch/PR).

---

## File structure

### New files

- `packages/db/src/schema/accessRequests.ts` — new table for W3 (migrated now so both land in one migration)
- `apps/web/app/api/uploads/image/route.ts` — presigned image upload endpoint
- `apps/web/app/api/uploads/audio/route.ts` — presigned audio upload endpoint
- `apps/web/src/server/routers/contribute.ts` — search endpoints for parent pickers
- `apps/web/src/server/routers/__tests__/contribute.test.ts` — router tests
- `apps/web/src/server/lib/slug.ts` — shared slugify + collision-suffix helper
- `apps/web/src/server/lib/__tests__/slug.test.ts` — unit tests for slug helper
- `apps/web/src/components/contribute/parent-picker.tsx` — typeahead combobox for reciter/album
- `apps/web/src/components/contribute/slug-preview.tsx` — read-only URL preview
- `apps/web/src/components/contribute/image-upload.tsx` — image upload widget
- `apps/web/src/components/contribute/audio-upload.tsx` — audio upload widget with duration readback
- `apps/web/src/components/contribute/lyrics-tabs.tsx` — multi-language lyrics editor
- `apps/web/src/components/contribute/use-draft-autosave.ts` — localStorage draft hook
- `apps/web/src/components/contribute/use-unsaved-changes-guard.ts` — beforeunload hook
- `apps/web/src/components/contribute/country-options.ts` — ISO-3166-1 alpha-2 list
- `apps/web/e2e/contribute-forms.spec.ts` — Playwright happy-path coverage

### Modified files

- `packages/db/src/schema/reciters.ts` — add `description`, `country`, `avatarUrl`, `birthYear`, `arabicName`
- `packages/db/src/schema/albums.ts` — add `description`
- `packages/db/src/schema/submissions.ts` — add `moderatorNotes`, extend `status` type to include `'withdrawn'`
- `packages/db/src/schema/index.ts` — re-export `accessRequests`
- `packages/types/src/submissions.ts` — extend `ReciterSubmissionData`, `AlbumSubmissionData`, `TrackSubmissionData`; add `SubmissionStatus` update
- `apps/web/src/server/routers/submission.ts` — extend Zod data schemas
- `apps/web/src/server/routers/moderation.ts` — `applyApproved` writes new fields and lyrics; imports slug helper
- `apps/web/src/server/routers/__tests__/submission.test.ts` — cover new fields
- `apps/web/src/server/routers/__tests__/moderation.test.ts` — cover new apply behavior
- `apps/web/src/server/trpc/router.ts` — register `contribute` subrouter
- `apps/web/src/components/contribute/reciter-form.tsx` — rewrite
- `apps/web/src/components/contribute/album-form.tsx` — rewrite
- `apps/web/src/components/contribute/track-form.tsx` — rewrite
- `apps/web/app/contribute/reciter/new/page.tsx` — (verify no changes needed; form swap should be transparent)
- `apps/web/app/contribute/album/new/page.tsx` — (same)
- `apps/web/app/contribute/track/new/page.tsx` — (same)
- `apps/web/messages/en/contribute.json` — new copy strings (mirror to other locales if present)
- `apps/web/package.json` — add `music-metadata` dependency

### Prerequisite reading for the implementer

Before starting, read these files (in order) to understand the conventions the plan assumes you already know:
1. `apps/web/src/server/routers/__tests__/helpers.ts` — test DB + caller setup, `dbAvailable` gate pattern
2. `apps/web/src/server/routers/__tests__/submission.test.ts:1-80` — test suffix-ID seeding convention
3. `apps/web/src/server/routers/moderation.ts:18-25` — existing `slugify()` helper (you will move and extend it)
4. `apps/web/src/components/profile/avatar-upload.tsx` — reference upload UI pattern
5. `apps/web/src/components/contribute/form-field.tsx` — existing FormField/Input wrapper used by all three forms
6. `apps/web/src/server/routers/submission.ts` (whole file) — existing submission validation + create/update flow

---

## Phase A — Schema + Types (5 tasks)

### Task A1: Extend `reciters` schema with new columns

**Files:**
- Modify: `packages/db/src/schema/reciters.ts`

- [ ] **Step 1: Update schema**

Replace the entire file with:

```typescript
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const reciters = pgTable('reciters', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  /** Arabic-script rendering of the reciter's name. */
  arabicName: text('arabic_name'),
  /** ISO-3166-1 alpha-2 code. Free text accepted server-side. */
  country: text('country'),
  /** 4-digit birth year. App-validated 1800 <= year <= current. */
  birthYear: integer('birth_year'),
  /** Short bio. App-enforced 500 char cap. */
  description: text('description'),
  /** Avatar image URL — typically an S3 presigned-upload result. */
  avatarUrl: text('avatar_url'),
  typesenseSyncedAt: timestamp('typesense_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Typecheck**

Run: `./dev typecheck`
Expected: PASS (schema-only change; no other callers broken because all new cols are nullable)

- [ ] **Step 3: Commit (defer generation — do it once at Task A5 for one clean migration)**

```bash
git add packages/db/src/schema/reciters.ts
git commit -m "feat(db): extend reciters with arabicName/country/birthYear/description/avatarUrl"
```

---

### Task A2: Extend `albums` schema with description

**Files:**
- Modify: `packages/db/src/schema/albums.ts`

- [ ] **Step 1: Add column**

Edit `packages/db/src/schema/albums.ts`. After the existing `artworkUrl` line, add:

```typescript
    /** Album notes. App-enforced 1000 char cap. */
    description: text('description'),
```

Full relevant block should read:

```typescript
    year: integer('year'),
    artworkUrl: text('artwork_url'),
    description: text('description'),
    vibrantColor: text('vibrant_color'),
```

- [ ] **Step 2: Typecheck**

Run: `./dev typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/albums.ts
git commit -m "feat(db): add albums.description"
```

---

### Task A3: Extend `submissions` schema with moderatorNotes + withdrawn status

**Files:**
- Modify: `packages/db/src/schema/submissions.ts`

- [ ] **Step 1: Edit schema**

Inside the `pgTable` columns block, add `moderatorNotes` immediately after `notes`:

```typescript
    /** Optional submitter-facing notes. */
    notes: text('notes'),
    /** Internal notes visible only to moderators on /mod/submissions/[id]. */
    moderatorNotes: text('moderator_notes'),
```

Extend the `status` column's `$type<>` literal union to include `'withdrawn'`:

```typescript
    status: text('status')
      .notNull()
      .default('pending')
      .$type<'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'withdrawn'>(),
```

Also fix the pre-existing JSDoc on the original `notes` column — current comment says "Optional moderator-facing notes" which is wrong (`notes` is submitter-facing). Update as shown above.

- [ ] **Step 2: Typecheck**

Run: `./dev typecheck`
Expected: PASS. If any code does exhaustive switch on `status`, it may flag missing `'withdrawn'` branch — handle by adding a fall-through (no-op) case. Grep for `submission.status ===` to find consumers.

- [ ] **Step 3: Grep for exhaustive status switches and add withdrawn branches**

Run: `grep -rn "submission.status ===" apps/web/src apps/web/app 2>/dev/null`
For each `switch` or exhaustive conditional, add a no-op branch for `'withdrawn'`:
- Badge component: render as grey "Withdrawn" badge (add translation key in a later task).
- Queue filter: already filters to `pending + changes_requested`; withdrawn naturally excluded — verify, no change needed.

If the `SubmissionStatusBadge` in `apps/web/src/components/mod/badges.tsx` needs a new case, add it:

```tsx
withdrawn: { className: 'bg-muted text-muted-foreground', label: t('statusWithdrawn') },
```

- [ ] **Step 4: Typecheck again + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/submissions.ts apps/web/src/components/mod/badges.tsx
git commit -m "feat(db): add submissions.moderatorNotes and withdrawn status"
```

---

### Task A4: Create `access_requests` table

**Files:**
- Create: `packages/db/src/schema/accessRequests.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create new schema file**

Contents of `packages/db/src/schema/accessRequests.ts`:

```typescript
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Application to become a contributor. A user submits one pending request;
 * a moderator approves (promotes role) or rejects (with comment).
 * Consumed by the W3 workstream; migrated now so both W1 and W3 share one
 * schema migration event.
 */
export const accessRequests = pgTable(
  'access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Optional free-text reason supplied by the applicant. */
    reason: text('reason'),
    status: text('status')
      .notNull()
      .default('pending')
      .$type<'pending' | 'approved' | 'rejected'>(),
    /** Moderator who decided. Null while pending. */
    reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    /** Moderator comment explaining decision. Null while pending. */
    reviewComment: text('review_comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('access_requests_user_id_idx').on(t.userId),
    index('access_requests_status_idx').on(t.status),
    // Only one pending request per user. Drizzle partial indexes require the
    // `where` expression in SQL form — expressed here via a unique index.
    // If partial indexes prove awkward in Drizzle's DSL for this version,
    // fall back to enforcing the invariant at the tRPC layer and use a regular index.
    uniqueIndex('access_requests_one_pending_per_user').on(t.userId).where(sql`status = 'pending'`),
  ],
);
```

If the `.where(sql\`...\`)` form produces a type error (Drizzle version dependent), replace the third tuple entry with:

```typescript
    index('access_requests_user_status_idx').on(t.userId, t.status),
```

and enforce one-pending-per-user at the tRPC layer in W3.

You will need to add `import { sql } from 'drizzle-orm';` at the top in the first form.

- [ ] **Step 2: Re-export from index**

Edit `packages/db/src/schema/index.ts`. Add:

```typescript
export * from './accessRequests.js';
```

(Place it near the other schema re-exports, alphabetically ordered if the file is ordered that way.)

- [ ] **Step 3: Typecheck**

Run: `./dev typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/accessRequests.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add access_requests table"
```

---

### Task A5: Generate migration + apply it

**Files:**
- Create: `packages/db/src/migrations/0010_<generated-name>.sql`

- [ ] **Step 1: Build db package so drizzle-kit can read compiled schema**

Run: `./dev exec -T web pnpm --filter @nawhas/db build`
(Alternatively: `pnpm --filter @nawhas/db build` on host if the repo's pnpm is wired that way.)
Expected: `packages/db/dist/` regenerated.

- [ ] **Step 2: Generate migration**

Run: `./dev exec -T web pnpm --filter @nawhas/db exec drizzle-kit generate`
Expected: New file appears at `packages/db/src/migrations/0010_<slugified>.sql` containing:
- `ALTER TABLE "reciters" ADD COLUMN ...` for five new columns
- `ALTER TABLE "albums" ADD COLUMN "description" text;`
- `ALTER TABLE "submissions" ADD COLUMN "moderator_notes" text;`
- `CREATE TABLE "access_requests" (...)` with indexes

Inspect the generated SQL. If any unexpected statements appear (e.g., altering unrelated tables), the `dist/` build is stale — rebuild and regenerate.

- [ ] **Step 3: Apply migration to dev and test DBs**

Run: `./dev db:migrate` (dev)
Run: `./dev -T db:migrate` (test)
Expected: Both return cleanly.

- [ ] **Step 4: Verify schema in test DB**

Run: `./dev -T exec db psql -U test -d nawhas_test -c '\d reciters'`
Expected: new columns `description`, `country`, `avatar_url`, `birth_year`, `arabic_name` visible.
Run: `./dev -T exec db psql -U test -d nawhas_test -c '\d access_requests'`
Expected: table exists with expected columns.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/migrations/
git commit -m "feat(db): migration 0010 — contribute form schema expansion"
```

---

### Task A6: Extend `@nawhas/types` submission data shapes

**Files:**
- Modify: `packages/types/src/submissions.ts`

- [ ] **Step 1: Read current types**

Open `packages/types/src/submissions.ts`. You'll see interfaces like `ReciterSubmissionData`, `AlbumSubmissionData`, `TrackSubmissionData`, plus `SubmissionDTO` and `SubmissionStatus`.

- [ ] **Step 2: Extend each data interface**

Replace the three data interfaces with:

```typescript
export interface ReciterSubmissionData {
  name: string;
  arabicName?: string;
  country?: string;
  birthYear?: number;
  description?: string;
  avatarUrl?: string;
  /** Only present on legacy rows. New submissions omit (server auto-generates). */
  slug?: string;
}

export interface AlbumSubmissionData {
  title: string;
  reciterId: string;
  year?: number;
  description?: string;
  artworkUrl?: string;
  slug?: string;
}

export interface TrackSubmissionData {
  title: string;
  albumId: string;
  trackNumber?: number;
  audioUrl?: string;
  youtubeId?: string;
  duration?: number;
  slug?: string;
  /**
   * Map of language code to lyric text. Language codes follow ISO 639-1
   * ('ar', 'ur', 'en') plus the convention 'transliteration'.
   * Empty or missing entries produce no row in the lyrics table;
   * entries present with empty strings delete existing rows on apply.
   */
  lyrics?: Partial<Record<'ar' | 'ur' | 'en' | 'transliteration', string>>;
}
```

- [ ] **Step 3: Extend SubmissionStatus**

Find the `SubmissionStatus` union type and add `'withdrawn'`:

```typescript
export type SubmissionStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'withdrawn';
```

- [ ] **Step 4: Typecheck**

Run: `./dev typecheck`
Expected: PASS. Consumers of `ReciterSubmissionData`, etc. will continue to compile because all new fields are optional and the data is parsed from jsonb.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/submissions.ts
git commit -m "feat(types): extend submission data shapes with new optional fields"
```

---

## Phase B — Server validation + apply logic + uploads (10 tasks)

### Task B1: Extract slugify + collision-suffix helper

**Files:**
- Create: `apps/web/src/server/lib/slug.ts`
- Create: `apps/web/src/server/lib/__tests__/slug.test.ts`
- Modify: `apps/web/src/server/routers/moderation.ts`

- [ ] **Step 1: Write failing unit tests**

Create `apps/web/src/server/lib/__tests__/slug.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { slugify, findFreeSlug } from '../slug';

describe('slugify', () => {
  it('lowercases', () => expect(slugify('Hello')).toBe('hello'));
  it('replaces spaces and underscores with dashes', () => {
    expect(slugify('hello world_test')).toBe('hello-world-test');
  });
  it('strips punctuation', () => {
    expect(slugify("Ali's Ode!?")).toBe('alis-ode');
  });
  it('trims leading and trailing dashes', () => {
    expect(slugify('  -hello-  ')).toBe('hello');
  });
});

describe('findFreeSlug', () => {
  it('returns candidate when free', () => {
    expect(findFreeSlug('ali', [])).toBe('ali');
    expect(findFreeSlug('ali', ['other', 'names'])).toBe('ali');
  });
  it('picks lowest free suffix when candidate is taken', () => {
    expect(findFreeSlug('ali', ['ali'])).toBe('ali-2');
    expect(findFreeSlug('ali', ['ali', 'ali-2'])).toBe('ali-3');
    expect(findFreeSlug('ali', ['ali', 'ali-2', 'ali-3'])).toBe('ali-4');
  });
  it('handles non-contiguous existing suffixes', () => {
    expect(findFreeSlug('ali', ['ali', 'ali-5'])).toBe('ali-2');
  });
  it('ignores unrelated slugs sharing a prefix', () => {
    expect(findFreeSlug('ali', ['ali-akbar', 'ali-raza'])).toBe('ali');
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `./dev test apps/web/src/server/lib/__tests__/slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper**

Create `apps/web/src/server/lib/slug.ts`:

```typescript
/**
 * Canonical slugify used by contribute/moderation. Lowercase, dashes for
 * whitespace/underscores, strip everything else non-word, trim boundary dashes.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns `candidate` if no string in `existing` matches it exactly,
 * otherwise returns `candidate-N` with the lowest integer N >= 2 such that
 * `candidate-N` is not in `existing`.
 * Only slugs of the exact form `candidate` or `candidate-<digits>` count as taken.
 */
export function findFreeSlug(candidate: string, existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has(candidate)) return candidate;
  for (let i = 2; ; i++) {
    const attempt = `${candidate}-${i}`;
    if (!taken.has(attempt)) return attempt;
  }
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `./dev test apps/web/src/server/lib/__tests__/slug.test.ts`
Expected: PASS (all 9 cases).

- [ ] **Step 5: Replace duplicate slugify in moderation.ts**

In `apps/web/src/server/routers/moderation.ts`, delete the local `slugify` function at lines ~18–25, and add at the top of imports:

```typescript
import { slugify, findFreeSlug } from '../lib/slug';
```

(Leave existing `applyApproved` references to `slugify()` alone — it picks up the imported one.)

- [ ] **Step 6: Typecheck + test moderation router unchanged**

Run: `./dev typecheck && ./dev test apps/web/src/server/routers/__tests__/moderation.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/server/lib/ apps/web/src/server/routers/moderation.ts
git commit -m "refactor(server): extract slugify + add findFreeSlug collision helper"
```

---

### Task B2: Extend Zod data schemas in submission router

**Files:**
- Modify: `apps/web/src/server/routers/submission.ts`
- Modify: `apps/web/src/server/routers/__tests__/submission.test.ts`

- [ ] **Step 1: Write failing test for new reciter fields**

In `apps/web/src/server/routers/__tests__/submission.test.ts`, add inside the existing `describe.skipIf(!dbAvailable)('Submission Router', () => {` block:

```typescript
it('accepts a reciter create with rich fields', async () => {
  const caller = makeSubmissionCaller(db, contributorId);
  const res = await caller.submission.create({
    type: 'reciter',
    action: 'create',
    data: {
      name: 'Rich Reciter',
      arabicName: 'ريتش',
      country: 'IQ',
      birthYear: 1970,
      description: 'A short bio.',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
  });
  seededSubmissionIds.push(res.id);
  expect(res.data).toMatchObject({
    name: 'Rich Reciter',
    arabicName: 'ريتش',
    country: 'IQ',
    birthYear: 1970,
    description: 'A short bio.',
    avatarUrl: 'https://example.com/avatar.jpg',
  });
});

it('rejects a reciter birthYear before 1800', async () => {
  const caller = makeSubmissionCaller(db, contributorId);
  await expect(
    caller.submission.create({
      type: 'reciter',
      action: 'create',
      data: { name: 'Too Old', birthYear: 1500 },
    }),
  ).rejects.toThrow(/birthYear/);
});

it('rejects a reciter description over 500 chars', async () => {
  const caller = makeSubmissionCaller(db, contributorId);
  await expect(
    caller.submission.create({
      type: 'reciter',
      action: 'create',
      data: { name: 'Too Long', description: 'x'.repeat(501) },
    }),
  ).rejects.toThrow(/description/);
});

it('accepts an album create without slug (server autogenerates on apply)', async () => {
  const caller = makeSubmissionCaller(db, contributorId);
  const res = await caller.submission.create({
    type: 'album',
    action: 'create',
    data: {
      title: 'Album With No Slug',
      reciterId: seededReciterIds[0]!,
      description: 'Album notes.',
    },
  });
  seededSubmissionIds.push(res.id);
  expect((res.data as { slug?: string }).slug).toBeUndefined();
  expect((res.data as { description?: string }).description).toBe('Album notes.');
});

it('accepts a track create with lyrics map', async () => {
  // Seed an album for this test (not in beforeAll to keep test isolation clear).
  const [album] = await db
    .insert(albums)
    .values({
      title: `Lyrics Test Album ${SUFFIX}`,
      slug: `lyrics-test-album-${SUFFIX}`,
      reciterId: seededReciterIds[0]!,
    })
    .returning({ id: albums.id });
  const caller = makeSubmissionCaller(db, contributorId);
  const res = await caller.submission.create({
    type: 'track',
    action: 'create',
    data: {
      title: 'Track With Lyrics',
      albumId: album!.id,
      lyrics: { ar: 'اللغة العربية', en: 'English text' },
    },
  });
  seededSubmissionIds.push(res.id);
  expect((res.data as { lyrics?: Record<string, string> }).lyrics).toEqual({
    ar: 'اللغة العربية',
    en: 'English text',
  });
});
```

Also import `albums` at the top of the test file: `import { albums, ... } from '@nawhas/db';`.

- [ ] **Step 2: Run tests, verify failure**

Run: `./dev -T test apps/web/src/server/routers/__tests__/submission.test.ts`
Expected: FAIL on new cases — unknown fields / validator missing.

- [ ] **Step 3: Extend Zod schemas**

In `apps/web/src/server/routers/submission.ts`, find `reciterDataSchema` and replace with:

```typescript
export const reciterDataSchema = z.object({
  name: z.string().min(1).max(200),
  arabicName: z.string().max(200).optional(),
  country: z.string().length(2).optional(),
  birthYear: z
    .number()
    .int()
    .min(1800, { message: 'birthYear must be 1800 or later' })
    .max(new Date().getFullYear(), { message: 'birthYear cannot be in the future' })
    .optional(),
  description: z.string().max(500, { message: 'description must be 500 chars or fewer' }).optional(),
  avatarUrl: z.url().optional(),
  slug: z.string().min(1).max(200).optional(),
});
```

Find `albumDataSchema` and add `description`:

```typescript
export const albumDataSchema = z.object({
  title: z.string().min(1).max(200),
  reciterId: z.uuid(),
  year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  description: z.string().max(1000, { message: 'description must be 1000 chars or fewer' }).optional(),
  artworkUrl: z.url().optional(),
  slug: z.string().min(1).max(200).optional(),
});
```

Find `trackDataSchema` and add `lyrics`:

```typescript
const LANGUAGE_CODES = ['ar', 'ur', 'en', 'transliteration'] as const;

export const trackDataSchema = z.object({
  title: z.string().min(1).max(200),
  albumId: z.uuid(),
  trackNumber: z.number().int().positive().optional(),
  audioUrl: z.url().optional(),
  youtubeId: z.string().max(11).optional(),
  duration: z.number().int().positive().optional(),
  slug: z.string().min(1).max(200).optional(),
  lyrics: z
    .object(
      Object.fromEntries(LANGUAGE_CODES.map((c) => [c, z.string().max(20000).optional()])) as Record<
        (typeof LANGUAGE_CODES)[number],
        z.ZodOptional<z.ZodString>
      >,
    )
    .partial()
    .optional(),
});
```

- [ ] **Step 4: Run tests, verify pass**

Run: `./dev -T test apps/web/src/server/routers/__tests__/submission.test.ts`
Expected: PASS (all new + existing cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/routers/submission.ts apps/web/src/server/routers/__tests__/submission.test.ts
git commit -m "feat(contribute): extend submission Zod schemas with new optional fields"
```

---

### Task B3: Extend `applyApproved` for new reciter fields

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Write failing test**

In `apps/web/src/server/routers/__tests__/moderation.test.ts`, inside the main `describe.skipIf` block, add:

```typescript
it('apply writes rich reciter fields to canonical table', async () => {
  const contribCaller = makeSubmissionCaller(db, contributorId);
  const sub = await contribCaller.submission.create({
    type: 'reciter',
    action: 'create',
    data: {
      name: `Rich Reciter ${SUFFIX}-a`,
      arabicName: 'بسم الله',
      country: 'PK',
      birthYear: 1950,
      description: 'Bio.',
      avatarUrl: 'https://example.com/a.jpg',
    },
  });
  seededSubmissionIds.push(sub.id);

  const modCaller = makeModerationCaller(db, moderatorId);
  await modCaller.moderation.review({ submissionId: sub.id, action: 'approved' });
  const applied = await modCaller.moderation.applyApproved({ submissionId: sub.id });

  const [row] = await db
    .select()
    .from(reciters)
    .where(eq(reciters.id, applied.entityId));
  expect(row).toMatchObject({
    name: `Rich Reciter ${SUFFIX}-a`,
    arabicName: 'بسم الله',
    country: 'PK',
    birthYear: 1950,
    description: 'Bio.',
    avatarUrl: 'https://example.com/a.jpg',
  });
  seededReciterIds.push(applied.entityId);
});
```

Confirm the test file imports `eq` from drizzle-orm at the top.

- [ ] **Step 2: Run test, verify failure**

Run: `./dev -T test apps/web/src/server/routers/__tests__/moderation.test.ts`
Expected: FAIL — new columns are null on the applied row.

- [ ] **Step 3: Extend applyApproved reciter block**

In `apps/web/src/server/routers/moderation.ts`, find the reciter `applyApproved` block (around lines 208–229). Update the `insert` and `update` value objects:

```typescript
if (submission.type === 'reciter') {
  const data = reciterDataSchema.parse(submission.data);
  const slug = data.slug ?? (await pickReciterSlug(tx, data.name));

  if (submission.action === 'create') {
    const [inserted] = await tx
      .insert(reciters)
      .values({
        name: data.name,
        slug,
        arabicName: data.arabicName ?? null,
        country: data.country ?? null,
        birthYear: data.birthYear ?? null,
        description: data.description ?? null,
        avatarUrl: data.avatarUrl ?? null,
      })
      .returning({ id: reciters.id });
    if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    eid = inserted.id;
  } else {
    if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
    const [updated] = await tx
      .update(reciters)
      .set({
        name: data.name,
        // slug frozen on edits — no update
        arabicName: data.arabicName ?? null,
        country: data.country ?? null,
        birthYear: data.birthYear ?? null,
        description: data.description ?? null,
        avatarUrl: data.avatarUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(reciters.id, submission.targetId))
      .returning({ id: reciters.id });
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reciter not found — it may have been deleted.' });
    eid = submission.targetId;
  }
}
```

Add a new helper near the top of the file (after imports, before the router export):

```typescript
async function pickReciterSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  name: string,
): Promise<string> {
  const candidate = slugify(name);
  const existing = await tx
    .select({ slug: reciters.slug })
    .from(reciters)
    .where(or(eq(reciters.slug, candidate), ilike(reciters.slug, `${candidate}-%`)));
  return findFreeSlug(candidate, existing.map((r) => r.slug));
}
```

Add `ilike` and `or` to drizzle imports if not already present.

- [ ] **Step 4: Run test, verify pass**

Run: `./dev -T test apps/web/src/server/routers/__tests__/moderation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/routers/moderation.ts apps/web/src/server/routers/__tests__/moderation.test.ts
git commit -m "feat(mod): apply writes rich reciter fields + collision-safe slug"
```

---

### Task B4: Extend `applyApproved` for album description and collision-safe slugs

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Write failing test for album description + auto-slug collision**

Append to the moderation test file:

```typescript
it('apply writes album description and picks free slug on collision', async () => {
  const reciterId = seededReciterIds[0]!;

  // Pre-seed a canonical album with slug 'album-collision' under the reciter.
  const [pre] = await db.insert(albums).values({
    title: 'Collision Pre',
    slug: 'album-collision',
    reciterId,
  }).returning({ id: albums.id });
  seededAlbumIds.push(pre!.id);

  // Submit a new album with same title → should auto-suffix.
  const contribCaller = makeSubmissionCaller(db, contributorId);
  const sub = await contribCaller.submission.create({
    type: 'album',
    action: 'create',
    data: {
      title: 'Album Collision',
      reciterId,
      description: 'Second album with same title.',
    },
  });
  seededSubmissionIds.push(sub.id);

  const modCaller = makeModerationCaller(db, moderatorId);
  await modCaller.moderation.review({ submissionId: sub.id, action: 'approved' });
  const applied = await modCaller.moderation.applyApproved({ submissionId: sub.id });

  const [row] = await db.select().from(albums).where(eq(albums.id, applied.entityId));
  expect(row?.slug).toBe('album-collision-2');
  expect(row?.description).toBe('Second album with same title.');
  seededAlbumIds.push(applied.entityId);
});
```

Add `seededAlbumIds: string[] = []` at the top alongside existing seeded arrays, and extend the `afterAll` cleanup to delete them.

- [ ] **Step 2: Run test, verify failure**

Run: `./dev -T test apps/web/src/server/routers/__tests__/moderation.test.ts`
Expected: FAIL — slug collision error thrown, or description not persisted.

- [ ] **Step 3: Extend applyApproved album block**

Replace the album branch of `applyApproved` with:

```typescript
} else if (submission.type === 'album') {
  const data = albumDataSchema.parse(submission.data);
  const slug = data.slug ?? (await pickAlbumSlug(tx, data.reciterId, data.title));

  if (submission.action === 'create') {
    const [inserted] = await tx
      .insert(albums)
      .values({
        title: data.title,
        slug,
        reciterId: data.reciterId,
        year: data.year ?? null,
        description: data.description ?? null,
        artworkUrl: data.artworkUrl ?? null,
      })
      .returning({ id: albums.id });
    if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    eid = inserted.id;
  } else {
    if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
    const [updated] = await tx
      .update(albums)
      .set({
        title: data.title,
        // slug frozen on edits
        reciterId: data.reciterId,
        year: data.year ?? null,
        description: data.description ?? null,
        artworkUrl: data.artworkUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(albums.id, submission.targetId))
      .returning({ id: albums.id });
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Album not found — it may have been deleted.' });
    eid = submission.targetId;
  }
}
```

Add helper:

```typescript
async function pickAlbumSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  reciterId: string,
  title: string,
): Promise<string> {
  const candidate = slugify(title);
  const existing = await tx
    .select({ slug: albums.slug })
    .from(albums)
    .where(
      and(
        eq(albums.reciterId, reciterId),
        or(eq(albums.slug, candidate), ilike(albums.slug, `${candidate}-%`)),
      ),
    );
  return findFreeSlug(candidate, existing.map((a) => a.slug));
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `./dev -T test apps/web/src/server/routers/__tests__/moderation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/routers/moderation.ts apps/web/src/server/routers/__tests__/moderation.test.ts
git commit -m "feat(mod): apply writes album description + auto-suffix colliding slugs"
```

---

### Task B5: Extend `applyApproved` for track with lyrics upsert

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Write failing test**

Append to moderation test:

```typescript
it('apply upserts track lyrics rows per language', async () => {
  const albumId = seededAlbumIds[0]!;
  const contribCaller = makeSubmissionCaller(db, contributorId);
  const sub = await contribCaller.submission.create({
    type: 'track',
    action: 'create',
    data: {
      title: `Lyrics Track ${SUFFIX}`,
      albumId,
      lyrics: { ar: 'نص عربي', en: 'English text' },
    },
  });
  seededSubmissionIds.push(sub.id);

  const modCaller = makeModerationCaller(db, moderatorId);
  await modCaller.moderation.review({ submissionId: sub.id, action: 'approved' });
  const applied = await modCaller.moderation.applyApproved({ submissionId: sub.id });
  seededTrackIds.push(applied.entityId);

  const rows = await db.select().from(lyrics).where(eq(lyrics.trackId, applied.entityId));
  expect(rows).toHaveLength(2);
  expect(rows.find((r) => r.language === 'ar')?.text).toBe('نص عربي');
  expect(rows.find((r) => r.language === 'en')?.text).toBe('English text');
});

it('apply deletes lyrics rows for languages cleared on edit', async () => {
  // Precondition: previous test seeded a track with ar + en. Now submit an edit
  // that sets en to '' (delete) and adds ur (insert).
  const trackId = seededTrackIds[0]!;
  const contribCaller = makeSubmissionCaller(db, contributorId);
  const sub = await contribCaller.submission.create({
    type: 'track',
    action: 'edit',
    targetId: trackId,
    data: {
      title: `Lyrics Track ${SUFFIX}`,
      albumId: seededAlbumIds[0]!,
      lyrics: { ar: 'نص عربي محدث', en: '', ur: 'اردو متن' },
    },
  });
  seededSubmissionIds.push(sub.id);

  const modCaller = makeModerationCaller(db, moderatorId);
  await modCaller.moderation.review({ submissionId: sub.id, action: 'approved' });
  await modCaller.moderation.applyApproved({ submissionId: sub.id });

  const rows = await db.select().from(lyrics).where(eq(lyrics.trackId, trackId));
  expect(rows.map((r) => r.language).sort()).toEqual(['ar', 'ur']);
  expect(rows.find((r) => r.language === 'ar')?.text).toBe('نص عربي محدث');
});
```

Add `seededTrackIds: string[] = []` alongside other seeded arrays; extend `afterAll` cleanup. Import `lyrics` from `@nawhas/db`.

- [ ] **Step 2: Run tests, verify failure**

Run: `./dev -T test apps/web/src/server/routers/__tests__/moderation.test.ts`
Expected: FAIL on both new tests — lyrics rows not written.

- [ ] **Step 3: Extend applyApproved track block**

Replace the track branch of `applyApproved`:

```typescript
} else {
  // track
  const data = trackDataSchema.parse(submission.data);
  const slug = data.slug ?? (await pickTrackSlug(tx, data.albumId, data.title));

  let trackId: string;
  if (submission.action === 'create') {
    const [inserted] = await tx
      .insert(tracks)
      .values({
        title: data.title,
        slug,
        albumId: data.albumId,
        trackNumber: data.trackNumber ?? null,
        audioUrl: data.audioUrl ?? null,
        youtubeId: data.youtubeId ?? null,
        duration: data.duration ?? null,
      })
      .returning({ id: tracks.id });
    if (!inserted) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    trackId = inserted.id;
  } else {
    if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
    const [updated] = await tx
      .update(tracks)
      .set({
        title: data.title,
        // slug frozen on edits
        albumId: data.albumId,
        trackNumber: data.trackNumber ?? null,
        audioUrl: data.audioUrl ?? null,
        youtubeId: data.youtubeId ?? null,
        duration: data.duration ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tracks.id, submission.targetId))
      .returning({ id: tracks.id });
    if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Track not found — it may have been deleted.' });
    trackId = submission.targetId;
  }

  // Lyrics upsert: for each language key in data.lyrics, insert-or-update.
  // Empty string means delete the row. Missing keys are left untouched.
  if (data.lyrics) {
    for (const [language, text] of Object.entries(data.lyrics)) {
      if (text === undefined) continue;
      if (text === '') {
        await tx.delete(lyrics).where(and(eq(lyrics.trackId, trackId), eq(lyrics.language, language)));
      } else {
        await tx
          .insert(lyrics)
          .values({ trackId, language, text })
          .onConflictDoUpdate({
            target: [lyrics.trackId, lyrics.language],
            set: { text, updatedAt: new Date() },
          });
      }
    }
  }

  eid = trackId;
}
```

Add helper:

```typescript
async function pickTrackSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  albumId: string,
  title: string,
): Promise<string> {
  const candidate = slugify(title);
  const existing = await tx
    .select({ slug: tracks.slug })
    .from(tracks)
    .where(
      and(
        eq(tracks.albumId, albumId),
        or(eq(tracks.slug, candidate), ilike(tracks.slug, `${candidate}-%`)),
      ),
    );
  return findFreeSlug(candidate, existing.map((t) => t.slug));
}
```

Make sure `lyrics` is imported from `@nawhas/db` at the top of `moderation.ts`.

- [ ] **Step 4: Run tests, verify pass**

Run: `./dev -T test apps/web/src/server/routers/__tests__/moderation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/routers/moderation.ts apps/web/src/server/routers/__tests__/moderation.test.ts
git commit -m "feat(mod): apply track writes lyrics rows + auto-slug"
```

---

### Task B6: Create `contribute` router with parent search endpoints

**Files:**
- Create: `apps/web/src/server/routers/contribute.ts`
- Create: `apps/web/src/server/routers/__tests__/contribute.test.ts`
- Modify: `apps/web/src/server/trpc/router.ts`
- Modify: `apps/web/src/server/routers/__tests__/helpers.ts` — add `makeContributeCaller`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/server/routers/__tests__/contribute.test.ts`:

```typescript
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { albums, reciters, users } from '@nawhas/db';
import { createTestDb, isDbAvailable, makeContributeCaller, type TestDb } from './helpers';

const dbAvailable = await isDbAvailable();

let db: TestDb;
let close: () => Promise<void>;

const SUFFIX = Date.now();
const userId = `contrib-search-${SUFFIX}`;
const reciterIds: string[] = [];
const albumIds: string[] = [];

describe.skipIf(!dbAvailable)('Contribute Router', () => {
  beforeAll(async () => {
    ({ db, close } = createTestDb());

    await db.insert(users).values({
      id: userId,
      name: 'Search User',
      email: `search-${SUFFIX}@example.com`,
      emailVerified: true,
      role: 'contributor',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const recRows = await db.insert(reciters).values([
      { name: 'Ali Search Alpha', slug: `ali-search-alpha-${SUFFIX}` },
      { name: 'Ali Search Beta', slug: `ali-search-beta-${SUFFIX}` },
      { name: 'Unrelated Reciter', slug: `unrelated-${SUFFIX}` },
    ]).returning({ id: reciters.id });
    reciterIds.push(...recRows.map((r) => r.id));

    const albumRows = await db.insert(albums).values([
      { title: 'Album One', slug: `album-one-${SUFFIX}`, reciterId: reciterIds[0]! },
      { title: 'Album Two', slug: `album-two-${SUFFIX}`, reciterId: reciterIds[0]! },
      { title: 'Other Reciter Album', slug: `other-album-${SUFFIX}`, reciterId: reciterIds[2]! },
    ]).returning({ id: albums.id });
    albumIds.push(...albumRows.map((a) => a.id));
  });

  afterAll(async () => {
    if (!close) return;
    if (albumIds.length) await db.delete(albums).where(inArray(albums.id, albumIds));
    if (reciterIds.length) await db.delete(reciters).where(inArray(reciters.id, reciterIds));
    await db.delete(users).where(inArray(users.id, [userId]));
    await close();
  });

  describe('searchReciters', () => {
    it('returns matches by prefix', async () => {
      const caller = makeContributeCaller(db, userId);
      const results = await caller.contribute.searchReciters({ query: 'Ali Search' });
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((r) => r.name.includes('Ali Search'))).toBe(true);
    });

    it('returns empty on non-match', async () => {
      const caller = makeContributeCaller(db, userId);
      const results = await caller.contribute.searchReciters({ query: 'zzzz-nomatch' });
      expect(results).toEqual([]);
    });

    it('rejects empty query', async () => {
      const caller = makeContributeCaller(db, userId);
      await expect(caller.contribute.searchReciters({ query: '' })).rejects.toThrow();
    });
  });

  describe('searchAlbums', () => {
    it('returns matches grouped by reciter', async () => {
      const caller = makeContributeCaller(db, userId);
      const results = await caller.contribute.searchAlbums({ query: 'Album' });
      expect(results.length).toBeGreaterThanOrEqual(3);
      const firstAlbum = results.find((a) => a.title === 'Album One');
      expect(firstAlbum?.reciterName).toBe('Ali Search Alpha');
    });
  });

  it('rejects calls from non-contributor users', async () => {
    // Change role to 'user' via the helper and verify forbidden.
    // (makeContributeCaller signature will support a role override.)
    const caller = makeContributeCaller(db, userId, 'user');
    await expect(caller.contribute.searchReciters({ query: 'Ali' })).rejects.toThrow(/FORBIDDEN/);
  });
});
```

- [ ] **Step 2: Extend helpers with `makeContributeCaller`**

In `apps/web/src/server/routers/__tests__/helpers.ts`, add after `makeModerationCaller`:

```typescript
import { contributeRouter } from '../contribute';

export function makeContributeCaller(
  db: TestDb,
  userId: string,
  role: 'user' | 'contributor' | 'moderator' = 'contributor',
) {
  return createCallerFactory(contributeRouter)(makeAuthCtx(db, userId, role));
}
```

- [ ] **Step 3: Run test, verify failure**

Run: `./dev -T test apps/web/src/server/routers/__tests__/contribute.test.ts`
Expected: FAIL — module `../contribute` not found.

- [ ] **Step 4: Implement router**

Create `apps/web/src/server/routers/contribute.ts`:

```typescript
import { z } from 'zod';
import { and, asc, eq, ilike } from 'drizzle-orm';
import { albums, reciters } from '@nawhas/db';
import { router, contributorProcedure } from '../trpc/trpc';

const SEARCH_LIMIT = 20;

export const contributeRouter = router({
  /**
   * Typeahead for the album form's reciter picker.
   * Returns up to 20 reciters whose name matches the query (case-insensitive substring).
   */
  searchReciters: contributorProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: reciters.id,
          name: reciters.name,
          slug: reciters.slug,
          avatarUrl: reciters.avatarUrl,
        })
        .from(reciters)
        .where(ilike(reciters.name, `%${input.query}%`))
        .orderBy(asc(reciters.name))
        .limit(SEARCH_LIMIT);
      return rows;
    }),

  /**
   * Typeahead for the track form's album picker.
   * Returns up to 20 albums whose title matches the query, joined with reciter name
   * so the client can render grouped-by-reciter options.
   */
  searchAlbums: contributorProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: albums.id,
          title: albums.title,
          slug: albums.slug,
          reciterId: albums.reciterId,
          reciterName: reciters.name,
        })
        .from(albums)
        .innerJoin(reciters, eq(reciters.id, albums.reciterId))
        .where(ilike(albums.title, `%${input.query}%`))
        .orderBy(asc(reciters.name), asc(albums.title))
        .limit(SEARCH_LIMIT);
      return rows;
    }),
});
```

- [ ] **Step 5: Register in main router**

Edit `apps/web/src/server/trpc/router.ts`. Add import and entry:

```typescript
import { contributeRouter } from '../routers/contribute';

export const appRouter = router({
  // ... existing entries
  contribute: contributeRouter,
});
```

- [ ] **Step 6: Run tests, verify pass**

Run: `./dev -T test apps/web/src/server/routers/__tests__/contribute.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck full workspace**

Run: `./dev typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/server/routers/contribute.ts \
        apps/web/src/server/routers/__tests__/contribute.test.ts \
        apps/web/src/server/routers/__tests__/helpers.ts \
        apps/web/src/server/trpc/router.ts
git commit -m "feat(contribute): add contribute router with reciter and album search"
```

---

### Task B7: Add `music-metadata` dependency + duration utility

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/server/lib/audio.ts`
- Create: `apps/web/src/server/lib/__tests__/audio.test.ts`

- [ ] **Step 1: Add dependency**

Run: `./dev exec web pnpm --filter web add music-metadata`
Expected: `apps/web/package.json` updates; lockfile updates.

- [ ] **Step 2: Write failing test**

Create `apps/web/src/server/lib/__tests__/audio.test.ts`:

```typescript
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { probeAudioDuration } from '../audio';

describe('probeAudioDuration', () => {
  it('returns integer seconds for a known mp3', async () => {
    // Fixture: a 5-second sine-wave mp3 committed to the repo.
    const buf = readFileSync(join(__dirname, 'fixtures', '5s.mp3'));
    const duration = await probeAudioDuration(buf, 'audio/mpeg');
    expect(duration).toBe(5);
  });

  it('returns null on unparseable input', async () => {
    const buf = Buffer.from('not audio');
    const duration = await probeAudioDuration(buf, 'audio/mpeg');
    expect(duration).toBeNull();
  });
});
```

Create the fixture directory and a 5-second mp3:

```bash
mkdir -p apps/web/src/server/lib/__tests__/fixtures
# Generate with ffmpeg (dev dep, not runtime):
./dev exec web ffmpeg -f lavfi -i "sine=frequency=440:duration=5" -q:a 9 apps/web/src/server/lib/__tests__/fixtures/5s.mp3 -y
```

If ffmpeg is unavailable in the web image, generate on the host and copy in, or download a known-good CC0 sample. The fixture must be checked into git.

- [ ] **Step 3: Run test, verify failure**

Run: `./dev -T test apps/web/src/server/lib/__tests__/audio.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement helper**

Create `apps/web/src/server/lib/audio.ts`:

```typescript
import { parseBuffer } from 'music-metadata';

/**
 * Probe an audio file buffer for its duration in seconds (integer, floored).
 * Returns null if the file is unparseable — caller decides how to handle
 * (typically: reject the upload and ask the contributor to try again).
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
```

- [ ] **Step 5: Run test, verify pass**

Run: `./dev -T test apps/web/src/server/lib/__tests__/audio.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/server/lib/audio.ts \
        apps/web/src/server/lib/__tests__/
git commit -m "feat(server): add music-metadata + probeAudioDuration helper"
```

---

### Task B8: Create `/api/uploads/image` route

**Files:**
- Create: `apps/web/app/api/uploads/image/route.ts`
- Create: `apps/web/app/api/uploads/image/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/app/api/uploads/image/__tests__/route.test.ts`:

```typescript
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage', () => ({
  s3: { send: vi.fn().mockResolvedValue({}) },
  BUCKET_IMAGES: 'test-images',
  S3_IMAGES_PUBLIC_BASE_URL: 'http://localhost:9000/test-images',
}));

import { auth } from '@/lib/auth';
import { POST } from '../route';

function makeRequest(body: FormData): Request {
  return new Request('http://localhost/api/uploads/image', { method: 'POST', body });
}

function makeFormWithPng(sizeBytes = 1024): FormData {
  const fd = new FormData();
  const file = new File([new Uint8Array(sizeBytes)], 'test.png', { type: 'image/png' });
  fd.append('file', file);
  return fd;
}

describe('POST /api/uploads/image', () => {
  it('rejects unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const res = await POST(makeRequest(makeFormWithPng()));
    expect(res.status).toBe(401);
  });

  it('rejects non-contributor role', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      session: { id: 's', userId: 'u' },
      user: { id: 'u', role: 'user', email: 'a@b.c', name: 'A', emailVerified: true },
    } as never);
    const res = await POST(makeRequest(makeFormWithPng()));
    expect(res.status).toBe(403);
  });

  it('rejects non-image mime', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      session: { id: 's', userId: 'u' },
      user: { id: 'u', role: 'contributor', email: 'a@b.c', name: 'A', emailVerified: true },
    } as never);
    const fd = new FormData();
    fd.append('file', new File(['x'], 'x.txt', { type: 'text/plain' }));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it('rejects oversized file', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      session: { id: 's', userId: 'u' },
      user: { id: 'u', role: 'contributor', email: 'a@b.c', name: 'A', emailVerified: true },
    } as never);
    const res = await POST(makeRequest(makeFormWithPng(6 * 1024 * 1024)));
    expect(res.status).toBe(413);
  });

  it('returns url on success', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      session: { id: 's', userId: 'u' },
      user: { id: 'u', role: 'contributor', email: 'a@b.c', name: 'A', emailVerified: true },
    } as never);
    const res = await POST(makeRequest(makeFormWithPng()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^http:\/\/localhost:9000\/test-images\//);
    expect(body.key).toMatch(/^images\/u\//);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `./dev test apps/web/app/api/uploads/image/__tests__/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement route**

Create `apps/web/app/api/uploads/image/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { s3, BUCKET_IMAGES, S3_IMAGES_PUBLIC_BASE_URL } from '@/lib/storage';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: Request): Promise<Response> {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'contributor' && role !== 'moderator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'unsupported media type' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file too large (max 5 MB)' }, { status: 413 });
  }

  const ext = file.type.split('/')[1] ?? 'bin';
  const key = `images/${session.user.id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_IMAGES,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  return NextResponse.json({
    url: `${S3_IMAGES_PUBLIC_BASE_URL}/${key}`,
    key,
  });
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `./dev test apps/web/app/api/uploads/image/__tests__/route.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/uploads/image/
git commit -m "feat(api): add /api/uploads/image endpoint"
```

---

### Task B9: Create `/api/uploads/audio` route

**Files:**
- Create: `apps/web/app/api/uploads/audio/route.ts`
- Create: `apps/web/app/api/uploads/audio/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/app/api/uploads/audio/__tests__/route.test.ts`:

```typescript
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('@/lib/storage', () => ({
  s3: { send: vi.fn().mockResolvedValue({}) },
  BUCKET_AUDIO: 'test-audio',
  S3_PUBLIC_BASE_URL: 'http://localhost:9000/test-audio',
}));

import { auth } from '@/lib/auth';
import { POST } from '../route';

const authedSession = {
  session: { id: 's', userId: 'u' },
  user: { id: 'u', role: 'contributor', email: 'a@b.c', name: 'A', emailVerified: true },
} as never;

function makeRequest(body: FormData): Request {
  return new Request('http://localhost/api/uploads/audio', { method: 'POST', body });
}

function makeFormWithMp3(): FormData {
  const fd = new FormData();
  const buf = readFileSync(
    join(process.cwd(), 'src/server/lib/__tests__/fixtures/5s.mp3'),
  );
  const file = new File([buf], 'test.mp3', { type: 'audio/mpeg' });
  fd.append('file', file);
  return fd;
}

describe('POST /api/uploads/audio', () => {
  it('rejects unauthenticated', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const res = await POST(makeRequest(makeFormWithMp3()));
    expect(res.status).toBe(401);
  });

  it('rejects non-audio mime', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(authedSession);
    const fd = new FormData();
    fd.append('file', new File(['x'], 'x.txt', { type: 'text/plain' }));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(415);
  });

  it('returns url + duration on success', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(authedSession);
    const res = await POST(makeRequest(makeFormWithMp3()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^http:\/\/localhost:9000\/test-audio\//);
    expect(body.duration).toBe(5);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `./dev test apps/web/app/api/uploads/audio/__tests__/route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement route**

Create `apps/web/app/api/uploads/audio/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { s3, BUCKET_AUDIO, S3_PUBLIC_BASE_URL } from '@/lib/storage';
import { probeAudioDuration } from '@/server/lib/audio';

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME = new Set(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg']);

export async function POST(req: Request): Promise<Response> {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== 'contributor' && role !== 'moderator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing file' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'unsupported media type' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file too large (max 50 MB)' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const duration = await probeAudioDuration(buffer, file.type);

  const ext = file.type.split('/')[1] ?? 'bin';
  const key = `audio/${session.user.id}/${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_AUDIO,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  return NextResponse.json({
    url: `${S3_PUBLIC_BASE_URL}/${key}`,
    key,
    duration,
  });
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `./dev test apps/web/app/api/uploads/audio/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/uploads/audio/
git commit -m "feat(api): add /api/uploads/audio endpoint with duration probe"
```

---

## Phase C — UI primitives (7 tasks)

All components below are React 19 client components. They follow the existing `apps/web/src/components/contribute/form-field.tsx` pattern for styling and live in the same directory. When in doubt on styling tokens, mirror `reciter-form.tsx` before the rewrite, or reference `docs/design/tokens.md`.

### Task C1: `ImageUpload` component

**Files:**
- Create: `apps/web/src/components/contribute/image-upload.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';

interface ImageUploadProps {
  /** Current image URL (for pre-fill on edit). */
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  /** Accessible label for the upload button. */
  label: string;
}

export function ImageUpload({ value, onChange, disabled, label }: ImageUploadProps): React.JSX.Element {
  const t = useTranslations('contribute.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/image', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t('genericFailure'));
      }
      const body = (await res.json()) as { url: string };
      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericFailure'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {value ? (
          <Image src={value} alt="" width={96} height={96} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {t('noImage')}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t('uploading') : value ? t('replace') : label}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => onChange(null)}
          >
            {t('remove')}
          </Button>
        )}
        {error && <p role="alert" className="text-xs text-error-600 dark:text-error-400">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/image-upload.tsx
git commit -m "feat(contribute): add ImageUpload component"
```

---

### Task C2: `AudioUpload` component

**Files:**
- Create: `apps/web/src/components/contribute/audio-upload.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';

interface AudioUploadProps {
  value: string | null;
  /** Returns both the URL and probed duration (seconds, may be null). */
  onChange: (result: { url: string | null; duration: number | null }) => void;
  disabled?: boolean;
  label: string;
}

export function AudioUpload({ value, onChange, disabled, label }: AudioUploadProps): React.JSX.Element {
  const t = useTranslations('contribute.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/audio', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t('genericFailure'));
      }
      const body = (await res.json()) as { url: string; duration: number | null };
      onChange({ url: body.url, duration: body.duration });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericFailure'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <audio controls src={value} className="w-full">
          <track kind="captions" />
        </audio>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t('uploading') : value ? t('replaceAudio') : label}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => onChange({ url: null, duration: null })}
          >
            {t('remove')}
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-error-600 dark:text-error-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/audio-upload.tsx
git commit -m "feat(contribute): add AudioUpload component"
```

---

### Task C3: `ParentPicker` component

**Files:**
- Create: `apps/web/src/components/contribute/parent-picker.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTRPC } from '@/lib/trpc/client';

export interface ParentOption {
  id: string;
  /** Primary label (reciter name or album title). */
  label: string;
  /** Optional secondary label, e.g. reciter name for album options. */
  sublabel?: string;
  /** Optional group key (e.g. reciter name) for visual grouping. */
  groupKey?: string;
}

interface ParentPickerProps {
  id: string;
  value: ParentOption | null;
  onChange: (opt: ParentOption | null) => void;
  kind: 'reciter' | 'album';
  disabled?: boolean;
  error?: string;
}

export function ParentPicker({
  id,
  value,
  onChange,
  kind,
  disabled,
  error,
}: ParentPickerProps): React.JSX.Element {
  const t = useTranslations('contribute.parentPicker');
  const trpc = useTRPC();
  const [query, setQuery] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ParentOption[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!open || query.trim().length === 0) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        if (kind === 'reciter') {
          const rows = await trpc.contribute.searchReciters.query({ query });
          setResults(rows.map((r) => ({ id: r.id, label: r.name })));
        } else {
          const rows = await trpc.contribute.searchAlbums.query({ query });
          setResults(rows.map((r) => ({
            id: r.id,
            label: r.title,
            sublabel: r.reciterName,
            groupKey: r.reciterName,
          })));
        }
        setActiveIdx(0);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, kind, open, trpc]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function pick(opt: ParentOption): void {
    onChange(opt);
    setQuery(opt.label);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = results[activeIdx];
      if (opt) pick(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open && results[activeIdx] ? `${id}-opt-${activeIdx}` : undefined}
        autoComplete="off"
        value={query}
        placeholder={t(kind === 'reciter' ? 'placeholderReciter' : 'placeholderAlbum')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value && e.target.value !== value.label) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      />
      {open && results.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg"
        >
          {renderGrouped(results, activeIdx, pick, id)}
        </ul>
      )}
      {open && query && results.length === 0 && (
        <p className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
          {t('noMatches')}
        </p>
      )}
    </div>
  );
}

function renderGrouped(
  results: ParentOption[],
  activeIdx: number,
  onPick: (opt: ParentOption) => void,
  idPrefix: string,
): React.JSX.Element[] {
  // If none have groupKey, render flat. Otherwise group.
  const hasGroups = results.some((r) => r.groupKey);
  if (!hasGroups) {
    return results.map((r, i) => (
      <li
        key={r.id}
        id={`${idPrefix}-opt-${i}`}
        role="option"
        aria-selected={i === activeIdx}
        className={`cursor-pointer px-3 py-2 text-sm ${i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
        onClick={() => onPick(r)}
        onMouseEnter={() => {/* activeIdx set by arrow keys only */}}
      >
        {r.label}
      </li>
    ));
  }
  const groups = new Map<string, { opts: ParentOption[]; startIdx: number }>();
  results.forEach((r, i) => {
    const k = r.groupKey ?? '';
    if (!groups.has(k)) groups.set(k, { opts: [], startIdx: i });
    groups.get(k)!.opts.push(r);
  });
  const rendered: React.JSX.Element[] = [];
  let flatIdx = 0;
  for (const [groupKey, { opts }] of groups.entries()) {
    rendered.push(
      <li
        key={`group-${groupKey}`}
        role="presentation"
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {groupKey}
      </li>,
    );
    for (const opt of opts) {
      const i = flatIdx;
      rendered.push(
        <li
          key={opt.id}
          id={`${idPrefix}-opt-${i}`}
          role="option"
          aria-selected={i === activeIdx}
          className={`cursor-pointer px-3 py-2 pl-6 text-sm ${i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
          onClick={() => onPick(opt)}
        >
          {opt.label}
        </li>,
      );
      flatIdx++;
    }
  }
  return rendered;
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/parent-picker.tsx
git commit -m "feat(contribute): add ParentPicker typeahead combobox"
```

---

### Task C4: `SlugPreview` component

**Files:**
- Create: `apps/web/src/components/contribute/slug-preview.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { slugify } from '@/server/lib/slug';

interface SlugPreviewProps {
  /** Raw name/title input. */
  source: string;
  /** URL template with {slug} placeholder, e.g. "/reciters/{slug}". */
  template: string;
}

/**
 * Read-only preview of the URL that will be generated from the current name/title.
 * Updates live as the user types. Does NOT show collision suffixes — those are
 * only known at apply time. Copy makes this explicit.
 */
export function SlugPreview({ source, template }: SlugPreviewProps): React.JSX.Element | null {
  const t = useTranslations('contribute.slug');
  const slug = slugify(source);
  if (!slug) return null;
  const url = template.replace('{slug}', slug);
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {t('preview', { url })}
      <span className="ml-1 opacity-75">{t('collisionNote')}</span>
    </p>
  );
}
```

- [ ] **Step 2: Verify client-side import of server helper works**

`slugify` is pure and has no server-only imports. If `@/server/lib/slug` is treed as server-only by Next, move `slugify` (not `findFreeSlug`) into a shared location like `apps/web/src/lib/slug-client.ts` and have the server helper re-export it. For now, attempt the direct import.

Run: `./dev typecheck && ./dev lint`
Expected: PASS. If Next.js complains about server-only import in a client component, create `apps/web/src/lib/slug-client.ts` containing only `slugify` and update both the client import (here) and the server import (`apps/web/src/server/lib/slug.ts` `export { slugify } from '@/lib/slug-client';`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/slug-preview.tsx apps/web/src/lib/slug-client.ts 2>/dev/null || git add apps/web/src/components/contribute/slug-preview.tsx
git commit -m "feat(contribute): add SlugPreview read-only URL indicator"
```

---

### Task C5: `LyricsTabs` component

**Files:**
- Create: `apps/web/src/components/contribute/lyrics-tabs.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const LANGUAGES = ['en', 'ar', 'ur', 'transliteration'] as const;
type Language = (typeof LANGUAGES)[number];

export type LyricsMap = Partial<Record<Language, string>>;

interface LyricsTabsProps {
  value: LyricsMap;
  onChange: (next: LyricsMap) => void;
  disabled?: boolean;
}

const RTL = new Set<Language>(['ar', 'ur']);

export function LyricsTabs({ value, onChange, disabled }: LyricsTabsProps): React.JSX.Element {
  const t = useTranslations('contribute.lyrics');
  const [active, setActive] = useState<Language>('en');

  function updateLang(lang: Language, text: string): void {
    onChange({ ...value, [lang]: text });
  }

  return (
    <div className="rounded-md border border-border">
      <div role="tablist" aria-label={t('tablistLabel')} className="flex border-b border-border">
        {LANGUAGES.map((lang) => {
          const hasContent = (value[lang] ?? '').trim().length > 0;
          return (
            <button
              key={lang}
              type="button"
              role="tab"
              aria-selected={active === lang}
              aria-controls={`lyrics-panel-${lang}`}
              id={`lyrics-tab-${lang}`}
              onClick={() => setActive(lang)}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                active === lang
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`lang_${lang}`)}
              {hasContent && <span aria-hidden="true" className="ml-1 text-primary">•</span>}
            </button>
          );
        })}
      </div>
      {LANGUAGES.map((lang) => (
        <div
          key={lang}
          role="tabpanel"
          id={`lyrics-panel-${lang}`}
          aria-labelledby={`lyrics-tab-${lang}`}
          hidden={active !== lang}
          className="p-3"
        >
          <textarea
            value={value[lang] ?? ''}
            onChange={(e) => updateLang(lang, e.target.value)}
            disabled={disabled}
            dir={RTL.has(lang) ? 'rtl' : 'ltr'}
            rows={12}
            placeholder={t(`placeholder_${lang}`)}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            maxLength={20000}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t('charCount', { count: (value[lang] ?? '').length, max: 20000 })}
          </p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/lyrics-tabs.tsx
git commit -m "feat(contribute): add LyricsTabs multi-language editor"
```

---

### Task C6: `useDraftAutosave` hook

**Files:**
- Create: `apps/web/src/components/contribute/use-draft-autosave.ts`

- [ ] **Step 1: Implement**

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DraftEnvelope<T> {
  savedAt: number;
  value: T;
}

export interface DraftAutosaveAPI<T> {
  /** Existing draft loaded on mount, or null. */
  draft: T | null;
  /** How old the loaded draft is in ms, or null. */
  ageMs: number | null;
  /** Explicitly clear the stored draft (call on successful submit). */
  clear: () => void;
  /** Call to replace the stored value (typically from current form state). */
  save: (value: T) => void;
}

/**
 * Client-side draft persistence keyed by a stable identifier.
 * Serialises to localStorage on save; loads on mount; expires after 7 days.
 *
 * Intended usage: pass the current form values on every change through `save`;
 * on successful submit call `clear`; on mount, if `draft` is non-null, prompt
 * the user to restore.
 */
export function useDraftAutosave<T>(key: string): DraftAutosaveAPI<T> {
  const [draft, setDraft] = useState<T | null>(null);
  const [ageMs, setAgeMs] = useState<number | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const env = JSON.parse(raw) as DraftEnvelope<T>;
      const age = Date.now() - env.savedAt;
      if (age > TTL_MS) {
        localStorage.removeItem(key);
        return;
      }
      setDraft(env.value);
      setAgeMs(age);
    } catch {
      localStorage.removeItem(key);
    }
  }, [key]);

  function save(value: T): void {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        const env: DraftEnvelope<T> = { savedAt: Date.now(), value };
        localStorage.setItem(key, JSON.stringify(env));
      } catch {
        // quota exceeded — silently drop; the user will be reminded via beforeunload
      }
    }, 500);
  }

  function clear(): void {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    localStorage.removeItem(key);
    setDraft(null);
    setAgeMs(null);
  }

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  return { draft, ageMs, clear, save };
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/use-draft-autosave.ts
git commit -m "feat(contribute): add useDraftAutosave hook (localStorage, 7d TTL)"
```

---

### Task C7: `useUnsavedChangesGuard` hook + `countryOptions`

**Files:**
- Create: `apps/web/src/components/contribute/use-unsaved-changes-guard.ts`
- Create: `apps/web/src/components/contribute/country-options.ts`

- [ ] **Step 1: Implement guard**

```typescript
'use client';

import { useEffect } from 'react';

export function useUnsavedChangesGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: BeforeUnloadEvent): void {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
```

- [ ] **Step 2: Country options**

```typescript
// ISO-3166-1 alpha-2 subset covering the primary reciter origin countries.
// Extend as needed — the schema accepts any 2-letter code.
export const COUNTRY_OPTIONS: readonly { code: string; labelKey: string }[] = [
  { code: 'IQ', labelKey: 'country_IQ' },
  { code: 'IR', labelKey: 'country_IR' },
  { code: 'LB', labelKey: 'country_LB' },
  { code: 'PK', labelKey: 'country_PK' },
  { code: 'IN', labelKey: 'country_IN' },
  { code: 'BH', labelKey: 'country_BH' },
  { code: 'SY', labelKey: 'country_SY' },
  { code: 'AZ', labelKey: 'country_AZ' },
  { code: 'AF', labelKey: 'country_AF' },
  { code: 'SA', labelKey: 'country_SA' },
  { code: 'KW', labelKey: 'country_KW' },
  { code: 'GB', labelKey: 'country_GB' },
  { code: 'US', labelKey: 'country_US' },
  { code: 'CA', labelKey: 'country_CA' },
  { code: 'AU', labelKey: 'country_AU' },
] as const;
```

- [ ] **Step 3: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/contribute/use-unsaved-changes-guard.ts \
        apps/web/src/components/contribute/country-options.ts
git commit -m "feat(contribute): add unsaved-changes guard + country option list"
```

---

## Phase D — Form rewrites (3 tasks)

### Task D1: Rewrite `ReciterForm`

**Files:**
- Modify: `apps/web/src/components/contribute/reciter-form.tsx`

- [ ] **Step 1: Replace file contents**

Full replacement for `reciter-form.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createReciterSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import { ImageUpload } from '@/components/contribute/image-upload';
import { SlugPreview } from '@/components/contribute/slug-preview';
import { COUNTRY_OPTIONS } from '@/components/contribute/country-options';
import { useDraftAutosave } from '@/components/contribute/use-draft-autosave';
import { useUnsavedChangesGuard } from '@/components/contribute/use-unsaved-changes-guard';

type FormValues = {
  name: string;
  arabicName: string;
  country: string;
  birthYear: string;
  description: string;
  avatarUrl: string | null;
};

type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  name: '',
  arabicName: '',
  country: '',
  birthYear: '',
  description: '',
  avatarUrl: null,
};

interface ReciterFormProps {
  targetId?: string;
  initialValues?: Partial<FormValues>;
  action: 'create' | 'edit';
  onSuccess?: () => void;
}

export function ReciterForm({
  targetId,
  initialValues,
  action,
  onSuccess,
}: ReciterFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const router = useRouter();

  const startValues: FormValues = { ...EMPTY, ...initialValues };
  const [values, setValues] = useState<FormValues>(startValues);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftKey = `contribute:reciter:${action}:${targetId ?? 'new'}`;
  const draft = useDraftAutosave<FormValues>(draftKey);
  const [draftRestored, setDraftRestored] = useState(false);

  // Persist on every change (debounced inside the hook).
  if (values !== startValues) draft.save(values);

  const isDirty = JSON.stringify(values) !== JSON.stringify(startValues);
  useUnsavedChangesGuard(isDirty);

  const schema = z.object({
    name: z.string().min(1, t('form.nameRequired')),
    arabicName: z.string().max(200).optional().or(z.literal('')),
    country: z.string().length(2).optional().or(z.literal('')),
    birthYear: z
      .string()
      .optional()
      .refine(
        (v) => !v || (/^\d{4}$/.test(v) && parseInt(v) >= 1800 && parseInt(v) <= new Date().getFullYear()),
        t('form.birthYearInvalid'),
      ),
    description: z.string().max(500, t('form.descriptionTooLong')).optional().or(z.literal('')),
    avatarUrl: z.url().nullable().optional(),
  });

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): { ok: true; data: Record<string, unknown> } | { ok: false } {
    const parse = schema.safeParse(values);
    if (!parse.success) {
      const fieldErrors: Errors = {};
      for (const issue of parse.error.issues) {
        const key = issue.path[0] as keyof Errors;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return { ok: false };
    }
    setErrors({});
    return {
      ok: true,
      data: {
        name: values.name,
        ...(values.arabicName ? { arabicName: values.arabicName } : {}),
        ...(values.country ? { country: values.country } : {}),
        ...(values.birthYear ? { birthYear: parseInt(values.birthYear) } : {}),
        ...(values.description ? { description: values.description } : {}),
        ...(values.avatarUrl ? { avatarUrl: values.avatarUrl } : {}),
      },
    };
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const v = validate();
    if (!v.ok) return;
    setServerError(null);
    startTransition(async () => {
      try {
        await createReciterSubmission(action, v.data as never, targetId);
        draft.clear();
        if (onSuccess) onSuccess();
        else router.push('/profile/contributions');
      } catch (err) {
        setServerError(err instanceof Error ? err.message : t('form.genericFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {draft.draft && !draftRestored && (
        <div role="status" className="rounded-md border border-info-200 bg-info-50 px-4 py-3 dark:border-info-800 dark:bg-info-950">
          <p className="text-sm text-info-900 dark:text-info-100">
            {t('draft.restorePrompt', { days: Math.floor((draft.ageMs ?? 0) / 86_400_000) })}
          </p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={() => {
              setValues(draft.draft!);
              setDraftRestored(true);
            }}>{t('draft.restore')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => {
              draft.clear();
              setDraftRestored(true);
            }}>{t('draft.discard')}</Button>
          </div>
        </div>
      )}

      <FormField id="name" label={t('reciter.nameLabel')} required error={errors.name}>
        <Input
          id="name"
          type="text"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          disabled={isPending}
          placeholder={t('reciter.namePlaceholder')}
          error={errors.name}
        />
        {action === 'create' && <SlugPreview source={values.name} template="/reciters/{slug}" />}
      </FormField>

      <FormField id="arabicName" label={t('reciter.arabicNameLabel')} error={errors.arabicName} hint={t('reciter.arabicNameHint')}>
        <Input
          id="arabicName"
          type="text"
          dir="rtl"
          value={values.arabicName}
          onChange={(e) => set('arabicName', e.target.value)}
          disabled={isPending}
          placeholder={t('reciter.arabicNamePlaceholder')}
          error={errors.arabicName}
        />
      </FormField>

      <FormField id="country" label={t('reciter.countryLabel')} error={errors.country} hint={t('reciter.countryHint')}>
        <select
          id="country"
          value={values.country}
          onChange={(e) => set('country', e.target.value)}
          disabled={isPending}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{t('reciter.countryNone')}</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{t(`reciter.${c.labelKey}`)}</option>
          ))}
        </select>
      </FormField>

      <FormField id="birthYear" label={t('reciter.birthYearLabel')} error={errors.birthYear}>
        <Input
          id="birthYear"
          type="number"
          value={values.birthYear}
          onChange={(e) => set('birthYear', e.target.value)}
          disabled={isPending}
          placeholder={t('reciter.birthYearPlaceholder')}
          min={1800}
          max={new Date().getFullYear()}
          error={errors.birthYear}
        />
      </FormField>

      <FormField id="description" label={t('reciter.descriptionLabel')} error={errors.description} hint={t('reciter.descriptionHint')}>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          disabled={isPending}
          maxLength={500}
          rows={4}
          placeholder={t('reciter.descriptionPlaceholder')}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t('form.charCount', { count: values.description.length, max: 500 })}
        </p>
      </FormField>

      <FormField id="avatarUrl" label={t('reciter.avatarLabel')} hint={t('reciter.avatarHint')}>
        <ImageUpload
          value={values.avatarUrl}
          onChange={(url) => set('avatarUrl', url)}
          disabled={isPending}
          label={t('reciter.avatarUpload')}
        />
      </FormField>

      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/reciter-form.tsx
git commit -m "feat(contribute): rewrite ReciterForm with rich fields + upload + draft"
```

---

### Task D2: Rewrite `AlbumForm`

**Files:**
- Modify: `apps/web/src/components/contribute/album-form.tsx`

- [ ] **Step 1: Replace file**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createAlbumSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import { ImageUpload } from '@/components/contribute/image-upload';
import { ParentPicker, type ParentOption } from '@/components/contribute/parent-picker';
import { SlugPreview } from '@/components/contribute/slug-preview';
import { useDraftAutosave } from '@/components/contribute/use-draft-autosave';
import { useUnsavedChangesGuard } from '@/components/contribute/use-unsaved-changes-guard';

type FormValues = {
  title: string;
  reciter: ParentOption | null;
  year: string;
  description: string;
  artworkUrl: string | null;
};

type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  title: '',
  reciter: null,
  year: '',
  description: '',
  artworkUrl: null,
};

interface AlbumFormProps {
  targetId?: string;
  initialValues?: Partial<FormValues>;
  action: 'create' | 'edit';
  /** Pre-fill reciter when navigating from a reciter page. */
  defaultReciter?: ParentOption;
  onSuccess?: () => void;
}

export function AlbumForm({
  targetId,
  initialValues,
  action,
  defaultReciter,
  onSuccess,
}: AlbumFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const router = useRouter();

  const startValues: FormValues = {
    ...EMPTY,
    ...(defaultReciter ? { reciter: defaultReciter } : {}),
    ...initialValues,
  };

  const [values, setValues] = useState<FormValues>(startValues);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftKey = `contribute:album:${action}:${targetId ?? 'new'}`;
  const draft = useDraftAutosave<FormValues>(draftKey);
  const [draftRestored, setDraftRestored] = useState(false);
  if (values !== startValues) draft.save(values);

  const isDirty = JSON.stringify(values) !== JSON.stringify(startValues);
  useUnsavedChangesGuard(isDirty);

  const schema = z.object({
    title: z.string().min(1, t('form.titleRequired')),
    reciter: z.object({ id: z.uuid(), label: z.string() }).nullable().refine((v) => v !== null, t('album.reciterRequired')),
    year: z
      .string()
      .optional()
      .refine(
        (v) => !v || (/^\d{4}$/.test(v) && parseInt(v) >= 1900 && parseInt(v) <= new Date().getFullYear()),
        t('form.yearInvalid'),
      ),
    description: z.string().max(1000, t('form.descriptionTooLong')).optional().or(z.literal('')),
    artworkUrl: z.url().nullable().optional(),
  });

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const parse = schema.safeParse(values);
    if (!parse.success) {
      const fieldErrors: Errors = {};
      for (const issue of parse.error.issues) {
        fieldErrors[issue.path[0] as keyof Errors] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setServerError(null);
    const data = {
      title: values.title,
      reciterId: values.reciter!.id,
      ...(values.year ? { year: parseInt(values.year) } : {}),
      ...(values.description ? { description: values.description } : {}),
      ...(values.artworkUrl ? { artworkUrl: values.artworkUrl } : {}),
    };
    startTransition(async () => {
      try {
        await createAlbumSubmission(action, data as never, targetId);
        draft.clear();
        if (onSuccess) onSuccess();
        else router.push('/profile/contributions');
      } catch (err) {
        setServerError(err instanceof Error ? err.message : t('form.genericFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {draft.draft && !draftRestored && (
        <div role="status" className="rounded-md border border-info-200 bg-info-50 px-4 py-3 dark:border-info-800 dark:bg-info-950">
          <p className="text-sm text-info-900 dark:text-info-100">
            {t('draft.restorePrompt', { days: Math.floor((draft.ageMs ?? 0) / 86_400_000) })}
          </p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={() => { setValues(draft.draft!); setDraftRestored(true); }}>{t('draft.restore')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { draft.clear(); setDraftRestored(true); }}>{t('draft.discard')}</Button>
          </div>
        </div>
      )}

      <FormField id="reciter" label={t('album.reciterLabel')} required error={errors.reciter} hint={t('album.reciterHint')}>
        <ParentPicker
          id="reciter"
          kind="reciter"
          value={values.reciter}
          onChange={(opt) => set('reciter', opt)}
          disabled={isPending}
          error={errors.reciter}
        />
      </FormField>

      <FormField id="title" label={t('album.titleLabel')} required error={errors.title}>
        <Input
          id="title"
          type="text"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          disabled={isPending}
          placeholder={t('album.titlePlaceholder')}
          error={errors.title}
        />
        {action === 'create' && values.reciter && <SlugPreview source={values.title} template={`/reciters/${values.reciter.label}/albums/{slug}`} />}
      </FormField>

      <FormField id="year" label={t('album.yearLabel')} error={errors.year}>
        <Input
          id="year"
          type="number"
          value={values.year}
          onChange={(e) => set('year', e.target.value)}
          disabled={isPending}
          placeholder={t('album.yearPlaceholder')}
          min={1900}
          max={new Date().getFullYear()}
          error={errors.year}
        />
      </FormField>

      <FormField id="description" label={t('album.descriptionLabel')} error={errors.description} hint={t('album.descriptionHint')}>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          disabled={isPending}
          maxLength={1000}
          rows={4}
          placeholder={t('album.descriptionPlaceholder')}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t('form.charCount', { count: values.description.length, max: 1000 })}
        </p>
      </FormField>

      <FormField id="artworkUrl" label={t('album.artworkLabel')} hint={t('album.artworkHint')}>
        <ImageUpload
          value={values.artworkUrl}
          onChange={(url) => set('artworkUrl', url)}
          disabled={isPending}
          label={t('album.artworkUpload')}
        />
      </FormField>

      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/album-form.tsx
git commit -m "feat(contribute): rewrite AlbumForm with reciter picker + upload + description"
```

---

### Task D3: Rewrite `TrackForm`

**Files:**
- Modify: `apps/web/src/components/contribute/track-form.tsx`

- [ ] **Step 1: Replace file**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createTrackSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import { AudioUpload } from '@/components/contribute/audio-upload';
import { ParentPicker, type ParentOption } from '@/components/contribute/parent-picker';
import { SlugPreview } from '@/components/contribute/slug-preview';
import { LyricsTabs, type LyricsMap } from '@/components/contribute/lyrics-tabs';
import { useDraftAutosave } from '@/components/contribute/use-draft-autosave';
import { useUnsavedChangesGuard } from '@/components/contribute/use-unsaved-changes-guard';

type FormValues = {
  title: string;
  album: ParentOption | null;
  trackNumber: string;
  audioUrl: string | null;
  youtubeId: string;
  duration: string;
  lyrics: LyricsMap;
};

type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  title: '',
  album: null,
  trackNumber: '',
  audioUrl: null,
  youtubeId: '',
  duration: '',
  lyrics: {},
};

interface TrackFormProps {
  targetId?: string;
  initialValues?: Partial<FormValues>;
  action: 'create' | 'edit';
  defaultAlbum?: ParentOption;
  onSuccess?: () => void;
}

export function TrackForm({
  targetId,
  initialValues,
  action,
  defaultAlbum,
  onSuccess,
}: TrackFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const router = useRouter();

  const startValues: FormValues = {
    ...EMPTY,
    ...(defaultAlbum ? { album: defaultAlbum } : {}),
    ...initialValues,
  };

  const [values, setValues] = useState<FormValues>(startValues);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftKey = `contribute:track:${action}:${targetId ?? 'new'}`;
  const draft = useDraftAutosave<FormValues>(draftKey);
  const [draftRestored, setDraftRestored] = useState(false);
  if (values !== startValues) draft.save(values);

  const isDirty = JSON.stringify(values) !== JSON.stringify(startValues);
  useUnsavedChangesGuard(isDirty);

  const schema = z.object({
    title: z.string().min(1, t('form.titleRequired')),
    album: z.object({ id: z.uuid(), label: z.string() }).nullable().refine((v) => v !== null, t('track.albumRequired')),
    trackNumber: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), t('form.trackNumberInvalid')),
    audioUrl: z.url().nullable().optional(),
    youtubeId: z.string().max(11).optional().or(z.literal('')),
    duration: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), t('form.durationInvalidSeconds')),
    lyrics: z.record(z.string(), z.string()).optional(),
  });

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const parse = schema.safeParse(values);
    if (!parse.success) {
      const fieldErrors: Errors = {};
      for (const issue of parse.error.issues) {
        fieldErrors[issue.path[0] as keyof Errors] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setServerError(null);
    const cleanLyrics: LyricsMap = {};
    for (const [k, v] of Object.entries(values.lyrics)) {
      if (typeof v === 'string' && v.trim().length > 0) cleanLyrics[k as keyof LyricsMap] = v;
    }
    const data = {
      title: values.title,
      albumId: values.album!.id,
      ...(values.trackNumber ? { trackNumber: parseInt(values.trackNumber) } : {}),
      ...(values.audioUrl ? { audioUrl: values.audioUrl } : {}),
      ...(values.youtubeId ? { youtubeId: values.youtubeId } : {}),
      ...(values.duration ? { duration: parseInt(values.duration) } : {}),
      ...(Object.keys(cleanLyrics).length > 0 ? { lyrics: cleanLyrics } : {}),
    };
    startTransition(async () => {
      try {
        await createTrackSubmission(action, data as never, targetId);
        draft.clear();
        if (onSuccess) onSuccess();
        else router.push('/profile/contributions');
      } catch (err) {
        setServerError(err instanceof Error ? err.message : t('form.genericFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {draft.draft && !draftRestored && (
        <div role="status" className="rounded-md border border-info-200 bg-info-50 px-4 py-3 dark:border-info-800 dark:bg-info-950">
          <p className="text-sm text-info-900 dark:text-info-100">
            {t('draft.restorePrompt', { days: Math.floor((draft.ageMs ?? 0) / 86_400_000) })}
          </p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={() => { setValues(draft.draft!); setDraftRestored(true); }}>{t('draft.restore')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { draft.clear(); setDraftRestored(true); }}>{t('draft.discard')}</Button>
          </div>
        </div>
      )}

      <FormField id="album" label={t('track.albumLabel')} required error={errors.album} hint={t('track.albumHint')}>
        <ParentPicker
          id="album"
          kind="album"
          value={values.album}
          onChange={(opt) => set('album', opt)}
          disabled={isPending}
          error={errors.album}
        />
      </FormField>

      <FormField id="title" label={t('track.titleLabel')} required error={errors.title}>
        <Input
          id="title"
          type="text"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          disabled={isPending}
          placeholder={t('track.titlePlaceholder')}
          error={errors.title}
        />
        {action === 'create' && values.album && <SlugPreview source={values.title} template={`/tracks/{slug}`} />}
      </FormField>

      <FormField id="trackNumber" label={t('track.trackNumberLabel')} error={errors.trackNumber}>
        <Input
          id="trackNumber"
          type="number"
          value={values.trackNumber}
          onChange={(e) => set('trackNumber', e.target.value)}
          disabled={isPending}
          placeholder={t('track.trackNumberPlaceholder')}
          min={1}
          error={errors.trackNumber}
        />
      </FormField>

      <FormField id="audioUrl" label={t('track.audioLabel')} hint={t('track.audioHint')}>
        <AudioUpload
          value={values.audioUrl}
          onChange={({ url, duration }) => {
            set('audioUrl', url);
            if (duration !== null && !values.duration) set('duration', String(duration));
          }}
          disabled={isPending}
          label={t('track.audioUpload')}
        />
      </FormField>

      <FormField id="youtubeId" label={t('track.youtubeIdLabel')} error={errors.youtubeId} hint={t('track.youtubeIdHint')}>
        <Input
          id="youtubeId"
          type="text"
          value={values.youtubeId}
          onChange={(e) => set('youtubeId', e.target.value)}
          disabled={isPending}
          placeholder={t('track.youtubeIdPlaceholder')}
          maxLength={11}
          error={errors.youtubeId}
        />
      </FormField>

      <FormField id="duration" label={t('track.durationLabel')} error={errors.duration} hint={t('track.durationHint')}>
        <Input
          id="duration"
          type="number"
          value={values.duration}
          onChange={(e) => set('duration', e.target.value)}
          disabled={isPending}
          placeholder={t('track.durationPlaceholder')}
          min={1}
          error={errors.duration}
        />
      </FormField>

      <FormField id="lyrics" label={t('track.lyricsLabel')} hint={t('track.lyricsHint')}>
        <LyricsTabs
          value={values.lyrics}
          onChange={(next) => set('lyrics', next)}
          disabled={isPending}
        />
      </FormField>

      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/contribute/track-form.tsx
git commit -m "feat(contribute): rewrite TrackForm with album picker + audio upload + lyrics"
```

---

## Phase E — Integration (3 tasks)

### Task E1: Update i18n messages

**Files:**
- Modify: `apps/web/messages/en/contribute.json`
- Mirror to other locale files that exist (run `ls apps/web/messages/` to enumerate)

- [ ] **Step 1: Update English messages**

Open `apps/web/messages/en/contribute.json`. Add (or replace, preserving existing keys as noted):

```json
{
  "form": {
    "submit": "Submit",
    "submitting": "Submitting...",
    "genericFailure": "Something went wrong. Please try again.",
    "titleRequired": "Title is required.",
    "nameRequired": "Name is required.",
    "yearInvalid": "Year must be between 1900 and the current year.",
    "birthYearInvalid": "Birth year must be between 1800 and the current year.",
    "trackNumberInvalid": "Track number must be a positive integer.",
    "durationInvalidSeconds": "Duration must be a positive number of seconds.",
    "descriptionTooLong": "Please shorten the description.",
    "charCount": "{count} / {max} characters"
  },
  "draft": {
    "restorePrompt": "You have an unsaved draft from {days} day(s) ago.",
    "restore": "Restore draft",
    "discard": "Discard"
  },
  "slug": {
    "preview": "URL will be: {url}",
    "collisionNote": "(may add a number suffix if this URL is already taken)"
  },
  "parentPicker": {
    "placeholderReciter": "Search for a reciter by name…",
    "placeholderAlbum": "Search for an album by title…",
    "noMatches": "No matches."
  },
  "upload": {
    "uploading": "Uploading…",
    "replace": "Replace image",
    "replaceAudio": "Replace audio",
    "remove": "Remove",
    "noImage": "No image",
    "genericFailure": "Upload failed. Please try again."
  },
  "reciter": {
    "nameLabel": "Name",
    "namePlaceholder": "Ali Akbar",
    "arabicNameLabel": "Name in Arabic",
    "arabicNameHint": "Optional. Shown next to the English name on the reciter profile.",
    "arabicNamePlaceholder": "علي أكبر",
    "countryLabel": "Country",
    "countryHint": "Optional. Primary country the reciter is associated with.",
    "countryNone": "— none —",
    "country_IQ": "Iraq",
    "country_IR": "Iran",
    "country_LB": "Lebanon",
    "country_PK": "Pakistan",
    "country_IN": "India",
    "country_BH": "Bahrain",
    "country_SY": "Syria",
    "country_AZ": "Azerbaijan",
    "country_AF": "Afghanistan",
    "country_SA": "Saudi Arabia",
    "country_KW": "Kuwait",
    "country_GB": "United Kingdom",
    "country_US": "United States",
    "country_CA": "Canada",
    "country_AU": "Australia",
    "birthYearLabel": "Birth year",
    "birthYearPlaceholder": "e.g. 1970",
    "descriptionLabel": "Description",
    "descriptionHint": "Optional. Up to 500 characters. Shown on the reciter's profile.",
    "descriptionPlaceholder": "A short biographical note.",
    "avatarLabel": "Avatar image",
    "avatarHint": "Optional. Square image recommended.",
    "avatarUpload": "Upload image"
  },
  "album": {
    "reciterLabel": "Reciter",
    "reciterHint": "Pick the reciter this album belongs to.",
    "reciterRequired": "Please pick a reciter.",
    "titleLabel": "Title",
    "titlePlaceholder": "Album title",
    "yearLabel": "Release year",
    "yearPlaceholder": "e.g. 2020",
    "descriptionLabel": "Description",
    "descriptionHint": "Optional. Up to 1000 characters.",
    "descriptionPlaceholder": "What's this album about?",
    "artworkLabel": "Cover artwork",
    "artworkHint": "Optional. Square image recommended (at least 500×500).",
    "artworkUpload": "Upload artwork"
  },
  "track": {
    "albumLabel": "Album",
    "albumHint": "Pick the album this track belongs to.",
    "albumRequired": "Please pick an album.",
    "titleLabel": "Title",
    "titlePlaceholder": "Track title",
    "trackNumberLabel": "Track number",
    "trackNumberPlaceholder": "e.g. 3",
    "audioLabel": "Audio file",
    "audioHint": "Optional. Duration is detected automatically.",
    "audioUpload": "Upload audio",
    "youtubeIdLabel": "YouTube ID",
    "youtubeIdHint": "Optional. The 11-character ID from the YouTube URL.",
    "youtubeIdPlaceholder": "e.g. dQw4w9WgXcQ",
    "durationLabel": "Duration (seconds)",
    "durationHint": "Auto-filled from the uploaded audio. Override if needed.",
    "durationPlaceholder": "e.g. 210",
    "lyricsLabel": "Lyrics",
    "lyricsHint": "Add lyrics in one or more languages. Dots on tabs indicate languages you've filled in."
  },
  "lyrics": {
    "tablistLabel": "Lyrics languages",
    "lang_en": "English",
    "lang_ar": "العربية",
    "lang_ur": "اردو",
    "lang_transliteration": "Transliteration",
    "placeholder_en": "Paste the English lyrics here…",
    "placeholder_ar": "…أدخل النص العربي هنا",
    "placeholder_ur": "…اردو لکھیں",
    "placeholder_transliteration": "Paste the romanised (Latin-script) rendering here…",
    "charCount": "{count} / {max} characters"
  }
}
```

- [ ] **Step 2: Mirror to other locales if present**

Run: `ls apps/web/messages/`
For each non-English locale listed, copy the file structure across with the same keys but leave the values as English placeholders — the i18n team (or future work) will translate. Mark the file's top-level key `__needs_translation: true` if the convention supports it; otherwise leave a TODO in a commit message.

- [ ] **Step 3: Typecheck + lint**

Run: `./dev typecheck && ./dev lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/messages/
git commit -m "feat(i18n): add contribute form copy for rewritten W1 forms"
```

---

### Task E2: Verify form swap via local dev

**Files:** no file changes; runtime verification only.

- [ ] **Step 1: Start the dev stack**

Run: `./dev up -d`
Expected: containers start; web reachable at the configured port (check `./dev ps`).

- [ ] **Step 2: Seed a moderator user via existing tooling**

If not already seeded, follow the procedure in `packages/db/src/seed.ts` or promote a user via a one-off SQL: `UPDATE users SET role = 'moderator' WHERE email = '<your email>';`. Same for a test contributor.

- [ ] **Step 3: Manual test — reciter submission**

Log in as contributor. Navigate to `/contribute/reciter/new`. Verify:
- Name field renders
- Arabic name field RTL
- Country dropdown populated
- Birth year numeric
- Description textarea with char counter
- Avatar upload: click → pick image → preview renders
- Slug preview shows under name as you type
- No slug input field visible

Submit. Verify redirect to `/profile/contributions` and the submission visible as `pending`.

- [ ] **Step 4: Manual test — album submission**

Navigate to `/contribute/album/new`. Verify:
- Reciter picker loads, typing queries real reciters
- Selecting a reciter locks in label
- Title, year, description, artwork upload work
- Slug preview appears under title

Submit. Verify it lands.

- [ ] **Step 5: Manual test — track submission**

Navigate to `/contribute/track/new`. Verify:
- Album picker queries show grouped-by-reciter listing
- Audio upload probes duration and pre-fills the duration field
- Lyrics tabs render; typing in Arabic tab flows RTL; dot appears on tab when content present
- Submit succeeds

- [ ] **Step 6: Manual test — moderator apply**

Log in as moderator. Go to `/mod/queue`. Open each pending submission.
- Reciter: confirm field diff/preview shows all new fields (even those unchanged — show as "—").
- Album: confirm description shown.
- Track: confirm lyrics shown as collapsible section per language.
- Approve each, then click Apply. Confirm:
  - Reciter canonical row has new fields populated (check via `./dev exec db psql -U postgres -d nawhas -c 'SELECT * FROM reciters LIMIT 3'`).
  - Album canonical row has description.
  - Track canonical row + `SELECT * FROM lyrics WHERE track_id = ...` shows rows per language.

(The moderator detail page's field-diff component may need a small update to include the new fields — if you see missing fields in step 6, add them to `apps/web/app/mod/submissions/[id]/page.tsx` in the `SubmissionFields` helper. This is a small extension of the existing pattern.)

- [ ] **Step 7: If field diff missed new fields, extend it**

In `apps/web/app/mod/submissions/[id]/page.tsx`, extend the three helper branches in `SubmissionFields` (`reciter`, `album`, `track`) to render the new fields using the existing `FieldDiff` / `DataPreview` components. Each new field is one-line addition following the existing pattern. Also extend `fetchCurrentValues` to select the new columns.

Typecheck + lint + commit:

```bash
./dev typecheck && ./dev lint
git add apps/web/app/mod/submissions/[id]/page.tsx
git commit -m "feat(mod): extend submission diff to cover new reciter/album fields"
```

---

### Task E3: Playwright E2E — happy paths

**Files:**
- Create: `apps/web/e2e/contribute-forms.spec.ts`

- [ ] **Step 1: Write E2E test**

Create `apps/web/e2e/contribute-forms.spec.ts`. Follow the pattern from existing e2e specs (look at any file in `apps/web/e2e/` with a `.spec.ts` extension for auth helpers and conventions — e.g. the M6 e2e tests under a moderation-related name). If there are no existing tests or the e2e directory is missing, create it alongside.

Baseline structure (adjust to match existing e2e helpers):

```typescript
import { expect, test } from '@playwright/test';

// Assumes test fixtures include a 'contributor@test.local' user with role=contributor
// seeded via packages/db/src/seed.ts. If not, add the seed entry as part of this task.

test.describe('Contribute forms — W1', () => {
  test('reciter create happy path', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'contributor@test.local');
    await page.fill('[name=password]', 'test-password');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/\//);

    await page.goto('/contribute/reciter/new');
    await expect(page.getByLabel(/^Name$/)).toBeVisible();
    await expect(page.getByLabel(/Slug/)).toHaveCount(0); // slug field removed

    await page.getByLabel(/^Name$/).fill('Playwright Reciter');
    await expect(page.getByText(/URL will be: \/reciters\/playwright-reciter/)).toBeVisible();
    await page.getByLabel(/Description/).fill('Short bio for E2E.');

    await page.getByRole('button', { name: /Submit/ }).click();
    await expect(page).toHaveURL(/\/profile\/contributions/);
    await expect(page.getByText(/Playwright Reciter/)).toBeVisible();
  });

  test('album create with reciter picker', async ({ page }) => {
    // Log in (reuse helper or repeat as above)
    // Seed a reciter 'E2E Reciter' via fixtures or create one via a prior step.

    await page.goto('/contribute/album/new');
    await page.getByRole('combobox').fill('E2E');
    await page.getByRole('option', { name: /E2E Reciter/ }).click();

    await page.getByLabel(/^Title$/).fill('Playwright Album');
    await page.getByLabel(/Description/).fill('Album notes.');

    await page.getByRole('button', { name: /Submit/ }).click();
    await expect(page).toHaveURL(/\/profile\/contributions/);
    await expect(page.getByText(/Playwright Album/)).toBeVisible();
  });

  test('track create with lyrics tabs', async ({ page }) => {
    // Log in as above.
    // Seed an album via fixture.

    await page.goto('/contribute/track/new');
    await page.getByRole('combobox').fill('E2E Album');
    await page.getByRole('option', { name: /E2E Album/ }).click();

    await page.getByLabel(/^Title$/).fill('Playwright Track');

    // Switch to Arabic tab and fill lyrics
    await page.getByRole('tab', { name: /العربية/ }).click();
    await page.getByRole('tabpanel').getByRole('textbox').fill('نص عربي');
    // Switch back to English tab, verify presence dot
    await page.getByRole('tab', { name: /English/ }).click();

    await page.getByRole('button', { name: /Submit/ }).click();
    await expect(page).toHaveURL(/\/profile\/contributions/);
    await expect(page.getByText(/Playwright Track/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Seed fixtures if missing**

If the E2E assumes fixtures (e.g. `E2E Reciter`, `E2E Album`), add them to `packages/db/src/seed.ts` under a test-only block guarded by `if (process.env.NODE_ENV === 'test')` or the existing convention in that file.

- [ ] **Step 3: Run E2E**

Run: `./dev test:e2e apps/web/e2e/contribute-forms.spec.ts`
Expected: PASS on all three tests.

If tests fail due to selector mismatches, adjust selectors to match actual rendered markup — avoid loosening assertions.

- [ ] **Step 4: Run full QA**

Run: `./dev qa`
Expected: typecheck + lint + unit tests all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/contribute-forms.spec.ts packages/db/src/seed.ts
git commit -m "test(contribute): E2E coverage for rewritten W1 forms"
```

---

## Done criteria

All of the following must hold before W1 is considered complete:

1. All tasks above checked off.
2. `./dev qa` passes clean.
3. `./dev test:e2e apps/web/e2e/contribute-forms.spec.ts` passes clean.
4. Manual smoke (Task E2) passed end-to-end on a local dev stack.
5. Migration 0010 applied successfully to both dev and test databases.
6. No orphan drafts, no TypeScript `any` regressions, no ESLint disables introduced.

## Follow-ups (out of W1 scope — handled in W2/W3 or later)

- Moderator diff page for new fields was touched minimally in Task E2 step 7 but deserves a proper revisit in W2 along with internal notes and thread rendering.
- `access_requests` table is migrated but unused — W3 wires the endpoints and UI.
- The `withdrawn` status is migrated but not yet surfaced in UI — W3.
- `moderatorNotes` column is migrated but not yet editable — W2.
