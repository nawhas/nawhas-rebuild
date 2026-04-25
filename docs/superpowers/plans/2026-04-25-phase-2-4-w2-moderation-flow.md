# Phase 2.4 W2 — Moderation Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the W2 design from
[`docs/superpowers/specs/2026-04-25-phase-2-4-w2-moderation-flow-design.md`](../specs/2026-04-25-phase-2-4-w2-moderation-flow-design.md):
merge approve+apply, add moderator notes, render the review thread on
both moderator and contributor sides, give `/mod/audit` four filters and
expandable meta, three-card `/mod` dashboard, and a public day-grouped
`/changes` feed.

**Architecture:** All work in the existing tRPC + Next App Router stack.
No new schema columns (W1 already shipped them); one new index on
`audit_log`. The `applyApproved` body is extracted to a private helper
and called from inside the existing `review` transaction when
`action='approved'`. New components colocated under
`apps/web/src/components/mod/` (or `/changes/` for the public feed).

**Tech Stack:** Next 16 App Router · tRPC v11 · Drizzle ORM · Postgres
17 · Vitest (real-DB integration) · Playwright (E2E) · next-intl ·
Tailwind 4 with the project's POC token cascade.

**Conventions to follow** (from project memory + recent phases):

- All commands run via `./dev qa | test | typecheck | lint | test:e2e | migrate`.
- Direct commits to `main` (no feature branch unless asked).
- TDD: failing test first, run to confirm red, implement, run to confirm
  green, commit. Each task is independently committable.
- File comments are minimal; method JSDoc is welcome for new public
  procedures (matches the style in `moderation.ts`).

---

## File map

**Created:**

- `packages/db/src/migrations/00XX_audit_log_action_idx.sql` (drizzle-generated)
- `apps/web/scripts/reset-approved-submissions.ts`
- `apps/web/src/components/mod/moderator-notes.tsx`
- `apps/web/src/components/mod/review-thread.tsx`
- `apps/web/src/components/mod/audit-filters.tsx`
- `apps/web/src/components/mod/audit-row.tsx`
- `apps/web/src/components/mod/dashboard-stats.tsx`
- `apps/web/src/components/changes/change-row.tsx`
- `apps/web/src/components/changes/changes-day-section.tsx`
- `apps/web/app/(protected)/profile/contributions/[id]/page.tsx`
- `apps/web/app/changes/page.tsx`
- `apps/web/src/components/mod/__tests__/moderator-notes.test.tsx`
- `apps/web/src/components/mod/__tests__/review-thread.test.tsx`
- `apps/web/src/components/mod/__tests__/audit-filters.test.tsx`
- `apps/web/src/components/mod/__tests__/dashboard-stats.test.tsx`
- `apps/web/tests/e2e/moderation-w2.spec.ts` (or `apps/e2e/tests/moderation-w2.spec.ts` — match the project's existing E2E location)

**Modified:**

- `apps/web/src/server/routers/moderation.ts`
- `apps/web/src/server/routers/submission.ts`
- `apps/web/src/server/routers/home.ts`
- `apps/web/src/server/routers/__tests__/moderation.test.ts`
- `apps/web/src/server/routers/__tests__/submission.test.ts`
- `apps/web/src/server/routers/__tests__/home.test.ts` (or create if absent)
- `apps/web/src/server/actions/moderation.ts` (delete `applySubmission`)
- `apps/web/app/mod/page.tsx`
- `apps/web/app/mod/audit/page.tsx`
- `apps/web/app/mod/submissions/[id]/page.tsx`
- `apps/web/app/(protected)/profile/contributions/page.tsx` (link rows to new detail route)
- `apps/web/src/components/layout/header.tsx` (or wherever the public nav lives)
- `apps/web/messages/en.json`
- Database schema (add `lastDigestSentAt` is OUT OF SCOPE; only the index migration here)

**Deleted:**

- `apps/web/src/components/mod/apply-button.tsx`
- `apps/web/src/components/mod/__tests__/apply-button.test.tsx` (if exists)

---

### Task 1: Add `audit_log_action_created_at_idx` index

**Files:**
- Create: `packages/db/src/migrations/00XX_audit_log_action_idx.sql` (auto-generated)
- Modify: `packages/db/src/schema/auditLog.ts`

- [ ] **Step 1: Read the current `auditLog` schema** to confirm the existing index list.

  Run: `cat packages/db/src/schema/auditLog.ts`

  Expect to see three existing indexes: `audit_log_actor_user_id_idx`, `audit_log_target_id_idx`, `audit_log_created_at_idx`.

- [ ] **Step 2: Add a new composite index** to the schema.

  In `packages/db/src/schema/auditLog.ts`, in the indexes array, add:

  ```ts
  index('audit_log_action_created_at_idx').on(t.action, t.createdAt.desc()),
  ```

  The index supports `WHERE action = $1 ORDER BY createdAt DESC`, which is the access pattern for both the audit-log filtered query and the public `/changes` feed.

- [ ] **Step 3: Generate the drizzle migration**

  Run: `./dev migrate:generate`

  Expected: a new file `packages/db/src/migrations/00XX_<random_name>.sql` is created with `CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log" ("action", "created_at" DESC);`. Open the file to verify; rename it to `00XX_audit_log_action_idx.sql` if drizzle picked an unhelpful suffix (and update the snapshot accordingly).

- [ ] **Step 4: Run the migration**

  Run: `./dev migrate`

  Expected: migration applies, no errors.

- [ ] **Step 5: Confirm the schema test still passes**

  Run: `./dev test packages/db`

  Expected: pass.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/db/src/schema/auditLog.ts packages/db/src/migrations/
  git commit -m "feat(db): add audit_log_action_created_at_idx for /changes feed and filtered audit queries"
  ```

---

### Task 2: One-shot `reset-approved-submissions.ts` script

**Files:**
- Create: `apps/web/scripts/reset-approved-submissions.ts`

- [ ] **Step 1: Create the scripts directory if it doesn't exist**

  Run: `mkdir -p apps/web/scripts`

- [ ] **Step 2: Write the script**

  Create `apps/web/scripts/reset-approved-submissions.ts`:

  ```ts
  /**
   * One-shot: flip any submissions stuck in 'approved' (i.e. approved
   * but never applied under the legacy two-step flow) back to 'pending'
   * so they go through the new merged approve+apply path.
   *
   * Idempotent: re-running on a clean DB is a no-op.
   *
   * Run: pnpm --filter @nawhas/web tsx scripts/reset-approved-submissions.ts
   */
  import { db, submissions } from '@nawhas/db';
  import { eq } from 'drizzle-orm';

  async function main(): Promise<void> {
    const result = await db
      .update(submissions)
      .set({ status: 'pending', updatedAt: new Date() })
      .where(eq(submissions.status, 'approved'))
      .returning({ id: submissions.id });
    console.log(`Reset ${result.length} approved submissions to pending.`);
  }

  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
  ```

- [ ] **Step 3: Run it against staging DB**

  Run: `./dev exec web pnpm tsx scripts/reset-approved-submissions.ts`

  (Or whichever invocation matches the project's `./dev` conventions — confirm with `./dev help` if unsure.)

  Expected: prints "Reset N approved submissions to pending." (N can be 0).

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/scripts/reset-approved-submissions.ts
  git commit -m "chore(mod): add one-shot script to reset approved-but-unapplied submissions to pending"
  ```

---

### Task 3: Extract `applyToCanonical` helper + merge into `review(approve)`

This is the heart of W2. Two changes wrapped together because the
extraction has no value without the merge: extract the canonical-write
body of `applyApproved` into a private helper, then call it from inside
`review` when `action='approved'`.

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Read the existing `moderation.test.ts`** to understand the fixtures + helpers in place.

  Run: `cat apps/web/src/server/routers/__tests__/moderation.test.ts | head -80`

- [ ] **Step 2: Write a failing integration test** for the merged path.

  In `moderation.test.ts`, add inside the `describe('moderation.review')` (or create one if absent):

  ```ts
  it('approve writes canonical entity, audit, and applied status in one transaction', async () => {
    const { user: contributor } = await makeUser({ role: 'contributor' });
    const { user: mod } = await makeUser({ role: 'moderator' });

    // Submit a reciter-create
    const submission = await contributorCaller(contributor).submission.create({
      type: 'reciter',
      action: 'create',
      data: { name: 'Test Reciter Approve' },
    });

    // Moderator approves (single call → expects applied)
    await moderatorCaller(mod).moderation.review({
      submissionId: submission.id,
      action: 'approved',
    });

    // Submission row is now 'applied'
    const [row] = await db.select().from(submissions).where(eq(submissions.id, submission.id));
    expect(row?.status).toBe('applied');

    // A reciter row exists with the slug picked from the name
    const [reciter] = await db.select().from(reciters).where(eq(reciters.slug, 'test-reciter-approve'));
    expect(reciter).toBeDefined();

    // Exactly one audit_log row of action='submission.applied' references this submission
    const auditRows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, 'submission.applied'), sql`(meta->>'submissionId') = ${submission.id}`));
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.targetType).toBe('reciter');
    expect(auditRows[0]?.targetId).toBe(reciter!.id);
  });
  ```

  Adjust import lines at the top: `import { sql } from 'drizzle-orm'` if not present, and ensure `auditLog`, `reciters`, `submissions`, `eq`, `and` are imported.

- [ ] **Step 3: Run it to confirm it fails**

  Run: `./dev test --filter=moderation.review`

  Expected: FAIL — submission ends in `approved`, not `applied`. There is no canonical reciter row.

- [ ] **Step 4: Extract `applyToCanonical` helper at the top of `moderation.ts`**

  Above `export const moderationRouter = router({ ... })`, add:

  ```ts
  /**
   * Apply a submission's data to the canonical tables inside an existing
   * transaction. Returns the canonical entity id. Throws TRPCError on
   * FK / not-found failures so the surrounding transaction rolls back.
   *
   * Used both by `review(approve)` (primary path) and `applyApproved`
   * (ops escape hatch).
   */
  async function applyToCanonical(
    tx: DbTx,
    submission: typeof submissions.$inferSelect,
  ): Promise<{ entityId: string; entityType: 'reciter' | 'album' | 'track' }> {
    if (submission.type === 'reciter') {
      const data = reciterDataSchema.parse(submission.data);
      if (submission.action === 'create') {
        const slug = data.slug ?? (await pickReciterSlug(tx, data.name));
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
        return { entityId: inserted.id, entityType: 'reciter' };
      }
      if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
      const [updated] = await tx
        .update(reciters)
        .set({
          name: data.name,
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
      return { entityId: submission.targetId, entityType: 'reciter' };
    }

    if (submission.type === 'album') {
      const data = albumDataSchema.parse(submission.data);
      if (submission.action === 'create') {
        const slug = data.slug ?? (await pickAlbumSlug(tx, data.reciterId, data.title));
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
        return { entityId: inserted.id, entityType: 'album' };
      }
      if (!submission.targetId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'targetId missing.' });
      const [updated] = await tx
        .update(albums)
        .set({
          title: data.title,
          reciterId: data.reciterId,
          year: data.year ?? null,
          description: data.description ?? null,
          artworkUrl: data.artworkUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(albums.id, submission.targetId))
        .returning({ id: albums.id });
      if (!updated) throw new TRPCError({ code: 'NOT_FOUND', message: 'Album not found — it may have been deleted.' });
      return { entityId: submission.targetId, entityType: 'album' };
    }

    // track
    const data = trackDataSchema.parse(submission.data);
    let trackId: string;
    if (submission.action === 'create') {
      const slug = data.slug ?? (await pickTrackSlug(tx, data.albumId, data.title));
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
    return { entityId: trackId, entityType: 'track' };
  }
  ```

  Note: the helper does NOT write the audit row or update submission status — those stay in the calling procedure so the merged and escape-hatch paths can write the audit shape they each want.

- [ ] **Step 5: Update `applyApproved` to use the helper**

  Replace the giant inline body inside `applyApproved`'s transaction with:

  ```ts
  const entityId = await ctx.db.transaction(async (tx) => {
    const { entityId, entityType } = await applyToCanonical(tx, submission);

    await tx.insert(auditLog).values({
      actorUserId: ctx.user.id,
      action: 'submission.applied',
      targetType: entityType,
      targetId: entityId,
      meta: { submissionId: input.submissionId, submissionAction: submission.action },
    });

    await tx
      .update(submissions)
      .set({ status: 'applied', updatedAt: new Date() })
      .where(eq(submissions.id, input.submissionId));

    return entityId;
  });
  ```

  Behaviour identical to today; just routed through the helper.

- [ ] **Step 6: Update JSDoc on `applyApproved`**

  Replace the comment block above `applyApproved` with:

  ```ts
  /**
   * Apply an approved submission to the canonical tables.
   *
   * **Ops escape hatch only.** As of W2, `review(action='approved')`
   * does the canonical write inline in the same transaction; this
   * procedure remains for the rare case where a submission is in
   * `status='approved'` (legacy data, or a manual recovery scenario)
   * and needs to be applied separately. No primary UI surfaces this.
   *
   * Run via:
   *   pnpm --filter @nawhas/web tsx scripts/apply-submission.ts <id>
   * (the script wraps a tRPC caller; the script itself is added if and
   * when the escape hatch is needed in practice).
   */
  ```

- [ ] **Step 7: Modify `review(approve)` to fold canonical write inline**

  Replace the whole `review` mutation body with:

  ```ts
  review: moderatorProcedure
    .input(
      z.object({
        submissionId: z.uuid(),
        action: z.enum(['approved', 'rejected', 'changes_requested']),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<SubmissionDTO> => {
      const [submission] = await ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);

      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }

      if (submission.status !== 'pending' && submission.status !== 'changes_requested') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending or changes_requested submissions can be reviewed.',
        });
      }

      // Status motion:
      //  approved              -> applied   (canonical write happens inside the tx)
      //  rejected              -> rejected
      //  changes_requested     -> changes_requested
      const newStatus = input.action === 'approved' ? 'applied' : input.action;

      const updated = await ctx.db.transaction(async (tx) => {
        await tx.insert(submissionReviews).values({
          submissionId: input.submissionId,
          reviewerUserId: ctx.user.id,
          action: input.action,
          comment: input.comment ?? null,
        });

        let auditTargetType: string = 'submission';
        let auditTargetId: string = input.submissionId;
        let auditAction: string;
        let auditMeta: Record<string, unknown>;

        if (input.action === 'approved') {
          const { entityId, entityType } = await applyToCanonical(tx, submission);
          auditTargetType = entityType;
          auditTargetId = entityId;
          auditAction = 'submission.applied';
          auditMeta = {
            submissionId: input.submissionId,
            submissionAction: submission.action,
            ...(input.comment ? { comment: input.comment } : {}),
          };
        } else {
          auditAction = `submission.${input.action}`;
          auditMeta = { comment: input.comment ?? null, submissionType: submission.type };
        }

        const [upd] = await tx
          .update(submissions)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(submissions.id, input.submissionId))
          .returning();

        if (!upd) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update submission.' });
        }

        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: auditAction,
          targetType: auditTargetType,
          targetId: auditTargetId,
          meta: auditMeta,
        });

        return upd;
      });

      // Email — fire-and-forget, outside transaction.
      const [submitter] = await ctx.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, submission.submittedByUserId))
        .limit(1);

      if (submitter) {
        if (input.action === 'approved') {
          sendSubmissionApproved({
            to: submitter.email,
            submissionId: input.submissionId,
            type: submission.type,
          });
        } else {
          sendSubmissionFeedback({
            to: submitter.email,
            submissionId: input.submissionId,
            action: input.action,
            comment: input.comment ?? null,
          });
        }
      }

      return updated as SubmissionDTO;
    }),
  ```

- [ ] **Step 8: Run the failing test from Step 2 again**

  Run: `./dev test --filter=moderation.review`

  Expected: PASS — submission status is `applied`, reciter row exists, exactly one `submission.applied` audit row.

- [ ] **Step 9: Add the FK-rollback test**

  In the same describe, add:

  ```ts
  it('approve rolls back when a parent FK is missing', async () => {
    const { user: contributor } = await makeUser({ role: 'contributor' });
    const { user: mod } = await makeUser({ role: 'moderator' });

    // Submit an album-create against a non-existent reciter
    const fakeReciterId = '00000000-0000-0000-0000-000000000000';
    const submission = await contributorCaller(contributor).submission.create({
      type: 'album',
      action: 'create',
      data: { title: 'Album X', reciterId: fakeReciterId },
    });

    await expect(
      moderatorCaller(mod).moderation.review({
        submissionId: submission.id,
        action: 'approved',
      }),
    ).rejects.toThrow();

    // Submission stays pending
    const [row] = await db.select().from(submissions).where(eq(submissions.id, submission.id));
    expect(row?.status).toBe('pending');

    // No album row for this submission
    const albumRows = await db.select().from(albums).where(eq(albums.title, 'Album X'));
    expect(albumRows).toHaveLength(0);

    // No audit row
    const auditRows = await db
      .select()
      .from(auditLog)
      .where(sql`(meta->>'submissionId') = ${submission.id}`);
    expect(auditRows).toHaveLength(0);
  });
  ```

- [ ] **Step 10: Run it**

  Run: `./dev test --filter=moderation.review`

  Expected: PASS — Postgres FK violation rolls back the whole transaction.

- [ ] **Step 11: Add the lyrics-upsert-in-merged-tx test**

  ```ts
  it('approve on a track edit upserts lyrics in the same transaction', async () => {
    const { user: contributor } = await makeUser({ role: 'contributor' });
    const { user: mod } = await makeUser({ role: 'moderator' });

    // Pre-seed a reciter, album, track via direct DB inserts.
    const [r] = await db.insert(reciters).values({ name: 'R', slug: 'r' }).returning();
    const [a] = await db.insert(albums).values({ title: 'A', slug: 'a', reciterId: r!.id }).returning();
    const [t] = await db.insert(tracks).values({ title: 'T', slug: 't', albumId: a!.id }).returning();

    // Submit a track edit with lyrics
    const submission = await contributorCaller(contributor).submission.create({
      type: 'track',
      action: 'edit',
      targetId: t!.id,
      data: { title: 'T', albumId: a!.id, lyrics: { en: 'hello world' } },
    });

    await moderatorCaller(mod).moderation.review({
      submissionId: submission.id,
      action: 'approved',
    });

    const lyricRows = await db.select().from(lyrics).where(eq(lyrics.trackId, t!.id));
    expect(lyricRows).toHaveLength(1);
    expect(lyricRows[0]?.text).toBe('hello world');
  });
  ```

- [ ] **Step 12: Run it**

  Run: `./dev test --filter=moderation.review`

  Expected: PASS.

- [ ] **Step 13: Run the full moderation test suite to confirm reject/changes_requested paths still work**

  Run: `./dev test moderation`

  Expected: all green.

- [ ] **Step 14: Run typecheck + lint**

  Run: `./dev typecheck && ./dev lint`

  Expected: green.

- [ ] **Step 15: Commit**

  ```bash
  git add apps/web/src/server/routers/moderation.ts apps/web/src/server/routers/__tests__/moderation.test.ts
  git commit -m "feat(mod): merge approve+apply into a single transaction

  review(action='approved') now writes review row + canonical entity +
  audit (action='submission.applied') + status='applied' atomically.
  applyApproved retained as ops escape hatch; canonical-write logic
  extracted to applyToCanonical helper shared by both paths."
  ```

---

### Task 4: Remove ApplyButton from UI + delete unused server action

**Files:**
- Modify: `apps/web/app/mod/submissions/[id]/page.tsx`
- Modify: `apps/web/src/server/actions/moderation.ts`
- Delete: `apps/web/src/components/mod/apply-button.tsx`
- Delete: `apps/web/src/components/mod/__tests__/apply-button.test.tsx` (if exists)

- [ ] **Step 1: Remove the `<ApplyButton>` from the submission detail page**

  In `apps/web/app/mod/submissions/[id]/page.tsx`:

  - Remove the import line: `import { ApplyButton } from '@/components/mod/apply-button';`
  - Remove the `const canApply = submission.status === 'approved';` line.
  - Remove the JSX: `{canApply && <ApplyButton submissionId={submission.id} />}`.

- [ ] **Step 2: Remove the `applySubmission` server action**

  In `apps/web/src/server/actions/moderation.ts`, delete the entire `applySubmission` exported function (~lines 40–48 — the function that wraps `caller.moderation.applyApproved`).

- [ ] **Step 3: Delete the ApplyButton component file**

  Run:
  ```bash
  rm apps/web/src/components/mod/apply-button.tsx
  test -f apps/web/src/components/mod/__tests__/apply-button.test.tsx && rm apps/web/src/components/mod/__tests__/apply-button.test.tsx || true
  ```

- [ ] **Step 4: Confirm no stale imports**

  Run: `grep -rn "ApplyButton\|applySubmission" apps/web/`

  Expected: zero matches in non-deleted files.

- [ ] **Step 5: Run typecheck + lint + unit tests**

  Run: `./dev qa`

  Expected: green.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/app/mod/submissions/[id]/page.tsx apps/web/src/server/actions/moderation.ts apps/web/src/components/mod/
  git commit -m "refactor(mod): remove ApplyButton from UI and applySubmission action

  After approve+apply merge, the secondary Apply step is no longer a
  user-facing action. Escape hatch is the moderation.applyApproved
  procedure, callable from a server-side script."
  ```

---

### Task 5: `moderation.setModeratorNotes` procedure

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Write the failing test**

  In `moderation.test.ts`, in a new `describe('moderation.setModeratorNotes')`:

  ```ts
  it('writes notes and audits notes_updated', async () => {
    const { user: mod } = await makeUser({ role: 'moderator' });
    const { user: contributor } = await makeUser({ role: 'contributor' });
    const submission = await contributorCaller(contributor).submission.create({
      type: 'reciter',
      action: 'create',
      data: { name: 'Notes Test' },
    });

    await moderatorCaller(mod).moderation.setModeratorNotes({
      submissionId: submission.id,
      notes: 'Looks good but check the avatar.',
    });

    const [row] = await db.select().from(submissions).where(eq(submissions.id, submission.id));
    expect(row?.moderatorNotes).toBe('Looks good but check the avatar.');

    const auditRows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, 'submission.notes_updated'), eq(auditLog.targetId, submission.id)));
    expect(auditRows).toHaveLength(1);
    expect((auditRows[0]?.meta as { length: number }).length).toBe('Looks good but check the avatar.'.length);
  });

  it('rejects non-moderators', async () => {
    const { user: contributor } = await makeUser({ role: 'contributor' });
    await expect(
      contributorCaller(contributor).moderation.setModeratorNotes({
        submissionId: '00000000-0000-0000-0000-000000000000',
        notes: 'x',
      }),
    ).rejects.toThrow();
  });
  ```

- [ ] **Step 2: Run it (red)**

  Run: `./dev test --filter=setModeratorNotes`
  Expected: FAIL — procedure not defined.

- [ ] **Step 3: Implement the procedure**

  In `moderation.ts`, add inside the router (after `applyApproved`):

  ```ts
  /**
   * Update internal moderator notes on a submission.
   * Writes an audit log entry per save (length only — note text is not
   * mirrored into the audit `meta` to keep audit jsonb bounded).
   */
  setModeratorNotes: moderatorProcedure
    .input(
      z.object({
        submissionId: z.uuid(),
        notes: z.string().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const [submission] = await ctx.db
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);
      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }

      await ctx.db.transaction(async (tx) => {
        await tx
          .update(submissions)
          .set({ moderatorNotes: input.notes, updatedAt: new Date() })
          .where(eq(submissions.id, input.submissionId));
        await tx.insert(auditLog).values({
          actorUserId: ctx.user.id,
          action: 'submission.notes_updated',
          targetType: 'submission',
          targetId: input.submissionId,
          meta: { length: input.notes.length },
        });
      });

      return { success: true };
    }),
  ```

- [ ] **Step 4: Run it (green)**

  Run: `./dev test --filter=setModeratorNotes`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/server/routers/moderation.ts apps/web/src/server/routers/__tests__/moderation.test.ts
  git commit -m "feat(mod): add moderation.setModeratorNotes procedure"
  ```

---

### Task 6: `moderation.getReviewThread` procedure

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`
- Modify: `packages/types/src/...` (add `ReviewThreadDTO` if a shared types package exists; otherwise inline the return type)

- [ ] **Step 1: Define the DTO** in the appropriate place.

  If `packages/types/src/submissions.ts` (or similar) exists, add:

  ```ts
  export interface ReviewThreadEntryDTO {
    id: string;
    action: 'approved' | 'rejected' | 'changes_requested';
    comment: string | null;
    reviewerName: string;          // empty string in the redacted variant
    reviewerRole: 'moderator' | null;
    createdAt: Date;
  }

  export interface ReviewThreadDTO {
    submitter: { id: string; name: string };
    submittedAt: Date;
    reviews: ReviewThreadEntryDTO[];
    appliedAt: Date | null;
  }
  ```

  If no shared types package, inline the return type in the router file.

- [ ] **Step 2: Write the failing test**

  ```ts
  describe('moderation.getReviewThread', () => {
    it('returns submitter, reviews chronologically, and applied bookend', async () => {
      const { user: contributor } = await makeUser({ role: 'contributor' });
      const { user: mod1 } = await makeUser({ role: 'moderator' });
      const { user: mod2 } = await makeUser({ role: 'moderator' });

      const submission = await contributorCaller(contributor).submission.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'Thread Reciter' },
      });

      await moderatorCaller(mod1).moderation.review({
        submissionId: submission.id,
        action: 'changes_requested',
        comment: 'Add a description.',
      });
      // contributor would resubmit here in the real flow; we just call review again
      // with action=approved as the second step of the thread.
      await moderatorCaller(mod2).moderation.review({
        submissionId: submission.id,
        action: 'approved',
      });

      const thread = await moderatorCaller(mod1).moderation.getReviewThread({
        submissionId: submission.id,
      });

      expect(thread.submitter.id).toBe(contributor.id);
      expect(thread.reviews).toHaveLength(2);
      expect(thread.reviews[0]?.action).toBe('changes_requested');
      expect(thread.reviews[0]?.reviewerName).toBe(mod1.name);
      expect(thread.reviews[1]?.action).toBe('approved');
      expect(thread.appliedAt).not.toBeNull();
    });
  });
  ```

- [ ] **Step 3: Run it (red)**

  Run: `./dev test --filter=getReviewThread`
  Expected: FAIL — procedure not defined.

- [ ] **Step 4: Implement**

  In `moderation.ts`, add inside the router:

  ```ts
  /**
   * Returns the full review thread for a submission: submitter info,
   * each submission_reviews row in chronological order with reviewer
   * name + role, and the applied-at bookend (if any).
   */
  getReviewThread: moderatorProcedure
    .input(z.object({ submissionId: z.uuid() }))
    .query(async ({ ctx, input }): Promise<ReviewThreadDTO> => {
      const [submission] = await ctx.db
        .select({
          id: submissions.id,
          createdAt: submissions.createdAt,
          submittedByUserId: submissions.submittedByUserId,
        })
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);
      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }

      const [submitter] = await ctx.db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, submission.submittedByUserId))
        .limit(1);
      if (!submitter) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Submitter missing.' });
      }

      const reviewRows = await ctx.db
        .select({
          id: submissionReviews.id,
          action: submissionReviews.action,
          comment: submissionReviews.comment,
          createdAt: submissionReviews.createdAt,
          reviewerName: users.name,
          reviewerRole: users.role,
        })
        .from(submissionReviews)
        .innerJoin(users, eq(submissionReviews.reviewerUserId, users.id))
        .where(eq(submissionReviews.submissionId, input.submissionId))
        .orderBy(asc(submissionReviews.createdAt));

      const [appliedRow] = await ctx.db
        .select({ createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, 'submission.applied'),
            sql`(${auditLog.meta}->>'submissionId') = ${input.submissionId}`,
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(1);

      return {
        submitter: { id: submitter.id, name: submitter.name },
        submittedAt: submission.createdAt,
        reviews: reviewRows.map((r) => ({
          id: r.id,
          action: r.action,
          comment: r.comment,
          reviewerName: r.reviewerName,
          reviewerRole: r.reviewerRole === 'moderator' ? 'moderator' : null,
          createdAt: r.createdAt,
        })),
        appliedAt: appliedRow?.createdAt ?? null,
      };
    }),
  ```

  Add `import { sql } from 'drizzle-orm'` if not present.

- [ ] **Step 5: Run it (green)**

  Run: `./dev test --filter=getReviewThread`
  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/src/server/routers/moderation.ts apps/web/src/server/routers/__tests__/moderation.test.ts packages/types/
  git commit -m "feat(mod): add moderation.getReviewThread procedure"
  ```

---

### Task 7: `submission.getMyReviewThread` procedure (contributor variant)

**Files:**
- Modify: `apps/web/src/server/routers/submission.ts`
- Modify: `apps/web/src/server/routers/__tests__/submission.test.ts`

- [ ] **Step 1: Failing test**

  In `submission.test.ts`:

  ```ts
  describe('submission.getMyReviewThread', () => {
    it('returns thread with reviewer names stripped to empty', async () => {
      const { user: contributor } = await makeUser({ role: 'contributor' });
      const { user: mod } = await makeUser({ role: 'moderator' });
      const submission = await contributorCaller(contributor).submission.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'Owner Thread' },
      });
      await moderatorCaller(mod).moderation.review({
        submissionId: submission.id,
        action: 'changes_requested',
        comment: 'Please add description',
      });

      const thread = await contributorCaller(contributor).submission.getMyReviewThread({
        submissionId: submission.id,
      });
      expect(thread.reviews).toHaveLength(1);
      expect(thread.reviews[0]?.reviewerName).toBe('');
      expect(thread.reviews[0]?.reviewerRole).toBeNull();
      expect(thread.reviews[0]?.comment).toBe('Please add description');
    });

    it('rejects non-owner', async () => {
      const { user: a } = await makeUser({ role: 'contributor' });
      const { user: b } = await makeUser({ role: 'contributor' });
      const submission = await contributorCaller(a).submission.create({
        type: 'reciter',
        action: 'create',
        data: { name: 'Foreign' },
      });
      await expect(
        contributorCaller(b).submission.getMyReviewThread({ submissionId: submission.id }),
      ).rejects.toThrow();
    });
  });
  ```

- [ ] **Step 2: Run (red)**

  Run: `./dev test --filter=getMyReviewThread`
  Expected: FAIL.

- [ ] **Step 3: Implement**

  In `submission.ts`, add to the router:

  ```ts
  /**
   * Owner-only review thread for a contributor's own submission.
   * Same shape as moderation.getReviewThread but reviewer names are
   * stripped (set to empty string) and reviewer role redacted to null.
   */
  getMyReviewThread: protectedProcedure
    .input(z.object({ submissionId: z.uuid() }))
    .query(async ({ ctx, input }): Promise<ReviewThreadDTO> => {
      const [submission] = await ctx.db
        .select({
          id: submissions.id,
          createdAt: submissions.createdAt,
          submittedByUserId: submissions.submittedByUserId,
        })
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);
      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found.' });
      }
      if (submission.submittedByUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const reviewRows = await ctx.db
        .select({
          id: submissionReviews.id,
          action: submissionReviews.action,
          comment: submissionReviews.comment,
          createdAt: submissionReviews.createdAt,
        })
        .from(submissionReviews)
        .where(eq(submissionReviews.submissionId, input.submissionId))
        .orderBy(asc(submissionReviews.createdAt));

      const [appliedRow] = await ctx.db
        .select({ createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, 'submission.applied'),
            sql`(${auditLog.meta}->>'submissionId') = ${input.submissionId}`,
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(1);

      return {
        submitter: { id: ctx.user.id, name: ctx.user.name ?? '' },
        submittedAt: submission.createdAt,
        reviews: reviewRows.map((r) => ({
          id: r.id,
          action: r.action,
          comment: r.comment,
          reviewerName: '',
          reviewerRole: null,
          createdAt: r.createdAt,
        })),
        appliedAt: appliedRow?.createdAt ?? null,
      };
    }),
  ```

  Add the necessary imports: `submissionReviews`, `auditLog`, `sql`, `desc`, `asc`, `and`.

- [ ] **Step 4: Run (green)**

  Run: `./dev test --filter=getMyReviewThread`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/server/routers/submission.ts apps/web/src/server/routers/__tests__/submission.test.ts
  git commit -m "feat(submission): add owner-scoped getMyReviewThread procedure"
  ```

---

### Task 8: `moderation.searchUsers` procedure

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Failing test**

  ```ts
  describe('moderation.searchUsers', () => {
    it('returns matches by name or email prefix', async () => {
      const { user: mod } = await makeUser({ role: 'moderator' });
      await makeUser({ role: 'contributor', name: 'Alice Johnson', email: 'alice@example.com' });
      await makeUser({ role: 'user', name: 'Bob Stevens', email: 'bobs@example.com' });

      const r1 = await moderatorCaller(mod).moderation.searchUsers({ query: 'alic' });
      expect(r1.length).toBeGreaterThanOrEqual(1);
      expect(r1.map((u) => u.email)).toContain('alice@example.com');

      const r2 = await moderatorCaller(mod).moderation.searchUsers({ query: 'bobs@' });
      expect(r2.map((u) => u.email)).toContain('bobs@example.com');
    });
  });
  ```

- [ ] **Step 2: Run (red)** — `./dev test --filter=searchUsers` → FAIL.

- [ ] **Step 3: Implement**

  ```ts
  /**
   * Typeahead search for the audit-log actor filter. Matches name or
   * email by ilike (case-insensitive substring). Returns up to `limit`
   * results.
   */
  searchUsers: moderatorProcedure
    .input(
      z.object({
        query: z.string().min(1).max(64),
        limit: z.number().int().min(1).max(20).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const pattern = `%${input.query}%`;
      const rows = await ctx.db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(or(ilike(users.name, pattern), ilike(users.email, pattern)))
        .orderBy(asc(users.name))
        .limit(input.limit);
      return rows;
    }),
  ```

- [ ] **Step 4: Run (green).**

- [ ] **Step 5: Commit.**

  ```bash
  git commit -am "feat(mod): add moderation.searchUsers for audit-log actor filter"
  ```

---

### Task 9: Extend `moderation.auditLog` with filters

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Failing tests** (one per filter + one combined)

  ```ts
  describe('moderation.auditLog filters', () => {
    it('filters by actor', async () => {
      const { user: modA } = await makeUser({ role: 'moderator' });
      const { user: modB } = await makeUser({ role: 'moderator' });
      await db.insert(auditLog).values([
        { actorUserId: modA.id, action: 'role.changed', targetType: 'user', targetId: 'u1', meta: {} },
        { actorUserId: modB.id, action: 'role.changed', targetType: 'user', targetId: 'u2', meta: {} },
      ]);
      const res = await moderatorCaller(modA).moderation.auditLog({ actor: modA.id });
      expect(res.items.every((r) => r.actorUserId === modA.id)).toBe(true);
    });

    it('filters by action', async () => {
      const { user: mod } = await makeUser({ role: 'moderator' });
      await db.insert(auditLog).values([
        { actorUserId: mod.id, action: 'submission.applied', targetType: 'reciter', targetId: 'x', meta: {} },
        { actorUserId: mod.id, action: 'role.changed', targetType: 'user', targetId: 'y', meta: {} },
      ]);
      const res = await moderatorCaller(mod).moderation.auditLog({ action: 'submission.applied' });
      expect(res.items.every((r) => r.action === 'submission.applied')).toBe(true);
    });

    it('filters by targetType', async () => {
      const { user: mod } = await makeUser({ role: 'moderator' });
      await db.insert(auditLog).values([
        { actorUserId: mod.id, action: 'submission.applied', targetType: 'album', targetId: 'a1', meta: {} },
        { actorUserId: mod.id, action: 'submission.applied', targetType: 'reciter', targetId: 'r1', meta: {} },
      ]);
      const res = await moderatorCaller(mod).moderation.auditLog({ targetType: 'album' });
      expect(res.items.every((r) => r.targetType === 'album')).toBe(true);
    });

    it('filters by date range (inclusive both ends)', async () => {
      const { user: mod } = await makeUser({ role: 'moderator' });
      // Need to insert with explicit createdAt — schema default is now()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      await db.insert(auditLog).values([
        { actorUserId: mod.id, action: 'role.changed', targetType: 'user', targetId: 'u1', meta: {}, createdAt: yesterday },
        { actorUserId: mod.id, action: 'role.changed', targetType: 'user', targetId: 'u2', meta: {}, createdAt: today },
      ]);
      const todayStr = today.toISOString().slice(0, 10);
      const res = await moderatorCaller(mod).moderation.auditLog({ from: todayStr, to: todayStr });
      // Only the row created today, not yesterday
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(res.items.every((r) => new Date(r.createdAt).toISOString().slice(0, 10) === todayStr)).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run (red)** — `./dev test --filter="auditLog filters"` → FAIL.

- [ ] **Step 3: Implement** — replace the existing `auditLog` query input and body:

  ```ts
  auditLog: moderatorProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
        cursor: z.string().optional(),
        actor: z.string().min(1).max(128).optional(),
        action: z.string().min(1).max(64).optional(),
        targetType: z.enum(['submission', 'reciter', 'album', 'track', 'user']).optional(),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<AuditLogDTO>> => {
      const limit = input.limit;

      const conditions = [];
      if (input.actor) conditions.push(eq(auditLog.actorUserId, input.actor));
      if (input.action) conditions.push(eq(auditLog.action, input.action));
      if (input.targetType) conditions.push(eq(auditLog.targetType, input.targetType));
      if (input.from) {
        // Inclusive — start of UTC day
        conditions.push(sql`${auditLog.createdAt} >= ${input.from}::date`);
      }
      if (input.to) {
        // Inclusive — end of UTC day (start of next day, exclusive comparison)
        conditions.push(sql`${auditLog.createdAt} < (${input.to}::date + interval '1 day')`);
      }

      if (input.cursor) {
        const { createdAt, id } = decodeCursor(input.cursor);
        conditions.push(
          or(
            lt(auditLog.createdAt, createdAt),
            and(eq(auditLog.createdAt, createdAt), gt(auditLog.id, id)),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await ctx.db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.createdAt), asc(auditLog.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

      return { items: items as AuditLogDTO[], nextCursor };
    }),
  ```

- [ ] **Step 4: Run (green).**

- [ ] **Step 5: Commit.**

  ```bash
  git commit -am "feat(mod): add actor/action/targetType/date-range filters to auditLog"
  ```

---

### Task 10: `moderation.dashboardStats` procedure

**Files:**
- Modify: `apps/web/src/server/routers/moderation.ts`
- Modify: `apps/web/src/server/routers/__tests__/moderation.test.ts`

- [ ] **Step 1: Failing test**

  ```ts
  describe('moderation.dashboardStats', () => {
    it('returns pending count, last7Days, oldest pending hours', async () => {
      const { user: mod } = await makeUser({ role: 'moderator' });
      const { user: contributor } = await makeUser({ role: 'contributor' });
      // Three submissions: two recent pending, one applied
      await contributorCaller(contributor).submission.create({
        type: 'reciter', action: 'create', data: { name: 'P1' },
      });
      await contributorCaller(contributor).submission.create({
        type: 'reciter', action: 'create', data: { name: 'P2' },
      });
      const s3 = await contributorCaller(contributor).submission.create({
        type: 'reciter', action: 'create', data: { name: 'P3' },
      });
      await moderatorCaller(mod).moderation.review({ submissionId: s3.id, action: 'approved' });

      const stats = await moderatorCaller(mod).moderation.dashboardStats();
      expect(stats.pendingCount).toBeGreaterThanOrEqual(2);
      expect(stats.last7DaysCount).toBeGreaterThanOrEqual(3);
      expect(stats.last7DaysBuckets).toHaveLength(7);
      expect(stats.oldestPendingHours).toBeGreaterThanOrEqual(0);
    });
  });
  ```

- [ ] **Step 2: Run (red)** — FAIL, procedure not defined.

- [ ] **Step 3: Implement**

  ```ts
  /**
   * Three numbers (+ a 7-bucket array) for the /mod overview cards.
   * Single round trip to the database.
   */
  dashboardStats: moderatorProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute<{
      pending_count: number;
      last7_count: number;
      oldest_pending_hours: number | null;
      bucket_0: number;
      bucket_1: number;
      bucket_2: number;
      bucket_3: number;
      bucket_4: number;
      bucket_5: number;
      bucket_6: number;
    }>(sql`
      WITH today_utc AS (SELECT date_trunc('day', now()) AS d)
      SELECT
        COUNT(*) FILTER (WHERE status IN ('pending', 'changes_requested'))::int AS pending_count,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last7_count,
        EXTRACT(EPOCH FROM (now() - MIN(created_at) FILTER (WHERE status = 'pending'))) / 3600 AS oldest_pending_hours,
        COUNT(*) FILTER (WHERE created_at >= (SELECT d FROM today_utc) - interval '0 days' AND created_at < (SELECT d FROM today_utc) + interval '1 day')::int AS bucket_6,
        COUNT(*) FILTER (WHERE created_at >= (SELECT d FROM today_utc) - interval '1 day' AND created_at < (SELECT d FROM today_utc))::int AS bucket_5,
        COUNT(*) FILTER (WHERE created_at >= (SELECT d FROM today_utc) - interval '2 days' AND created_at < (SELECT d FROM today_utc) - interval '1 day')::int AS bucket_4,
        COUNT(*) FILTER (WHERE created_at >= (SELECT d FROM today_utc) - interval '3 days' AND created_at < (SELECT d FROM today_utc) - interval '2 days')::int AS bucket_3,
        COUNT(*) FILTER (WHERE created_at >= (SELECT d FROM today_utc) - interval '4 days' AND created_at < (SELECT d FROM today_utc) - interval '3 days')::int AS bucket_2,
        COUNT(*) FILTER (WHERE created_at >= (SELECT d FROM today_utc) - interval '5 days' AND created_at < (SELECT d FROM today_utc) - interval '4 days')::int AS bucket_1,
        COUNT(*) FILTER (WHERE created_at >= (SELECT d FROM today_utc) - interval '6 days' AND created_at < (SELECT d FROM today_utc) - interval '5 days')::int AS bucket_0
      FROM submissions
    `);
    const row = result.rows?.[0] ?? result[0];
    if (!row) {
      return { pendingCount: 0, last7DaysCount: 0, last7DaysBuckets: [0, 0, 0, 0, 0, 0, 0], oldestPendingHours: null };
    }
    return {
      pendingCount: Number(row.pending_count) || 0,
      last7DaysCount: Number(row.last7_count) || 0,
      last7DaysBuckets: [
        Number(row.bucket_0) || 0,
        Number(row.bucket_1) || 0,
        Number(row.bucket_2) || 0,
        Number(row.bucket_3) || 0,
        Number(row.bucket_4) || 0,
        Number(row.bucket_5) || 0,
        Number(row.bucket_6) || 0,
      ],
      oldestPendingHours: row.oldest_pending_hours === null ? null : Number(row.oldest_pending_hours),
    };
  }),
  ```

  (If `result.rows` shape doesn't match the postgres-js Drizzle driver in use, adjust to whatever the project's pattern is — check `apps/web/src/server/routers/search.ts` or similar for an existing raw-`sql` pattern. Worst case, fall back to seven separate `count(*) … where` queries; less efficient but mechanical.)

- [ ] **Step 4: Run (green).**

- [ ] **Step 5: Commit.**

  ```bash
  git commit -am "feat(mod): add moderation.dashboardStats for overview cards"
  ```

---

### Task 11: `home.recentChanges` procedure (public `/changes` feed)

**Files:**
- Modify: `apps/web/src/server/routers/home.ts`
- Modify: `apps/web/src/server/routers/__tests__/home.test.ts` (or create)

- [ ] **Step 1: Failing test**

  ```ts
  describe('home.recentChanges', () => {
    it('returns submission.applied events newest first with entity titles + slugs', async () => {
      const { user: contributor } = await makeUser({ role: 'contributor' });
      const { user: mod } = await makeUser({ role: 'moderator' });
      const submission = await contributorCaller(contributor).submission.create({
        type: 'reciter', action: 'create', data: { name: 'Public Feed Reciter' },
      });
      await moderatorCaller(mod).moderation.review({ submissionId: submission.id, action: 'approved' });

      const res = await publicCaller().home.recentChanges({ limit: 10 });
      const item = res.items.find((i) => i.entityTitle === 'Public Feed Reciter');
      expect(item).toBeDefined();
      expect(item?.action).toBe('create');
      expect(item?.entityType).toBe('reciter');
      expect(item?.entitySlugPath).toBe('/reciters/public-feed-reciter');
      expect(item?.submitterName).toBe(contributor.name);
    });

    it('does not include moderator-internal actions', async () => {
      const { user: mod } = await makeUser({ role: 'moderator' });
      await db.insert(auditLog).values({
        actorUserId: mod.id,
        action: 'role.changed',
        targetType: 'user',
        targetId: 'someone',
        meta: { oldRole: 'user', newRole: 'contributor' },
      });

      const res = await publicCaller().home.recentChanges({ limit: 50 });
      expect(res.items.every((i) => i.entityType !== 'user')).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run (red).**

- [ ] **Step 3: Implement**

  In `home.ts`, define the DTO and add the procedure:

  ```ts
  export interface RecentChangeDTO {
    id: string;
    action: 'create' | 'edit';
    entityType: 'reciter' | 'album' | 'track';
    entityTitle: string;
    entitySlugPath: string;          // e.g. /reciters/foo, /reciters/foo/albums/bar
    avatarUrl: string | null;
    submitterName: string;
    at: Date;
  }
  ```

  ```ts
  recentChanges: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<PaginatedResult<RecentChangeDTO>> => {
      const limit = input.limit;

      // We need: audit_log row joined to submissions (for type + action), then
      // joined to the canonical entity table for title/slug, then to the
      // submitter user. Simpler than it looks because audit_log.targetId is
      // the canonical entity id and audit_log.meta.submissionId references
      // the submission.
      const baseQuery = ctx.db
        .select({
          id: auditLog.id,
          createdAt: auditLog.createdAt,
          targetType: auditLog.targetType,
          targetId: auditLog.targetId,
          submissionId: sql<string>`${auditLog.meta}->>'submissionId'`,
          submissionAction: sql<'create' | 'edit'>`${auditLog.meta}->>'submissionAction'`,
          submitterName: users.name,
        })
        .from(auditLog)
        .innerJoin(submissions, sql`${submissions.id}::text = ${auditLog.meta}->>'submissionId'`)
        .innerJoin(users, eq(submissions.submittedByUserId, users.id))
        .where(eq(auditLog.action, 'submission.applied'));

      const cursorCondition = input.cursor
        ? (() => {
            const { createdAt, id } = decodeCursor(input.cursor);
            return or(
              lt(auditLog.createdAt, createdAt),
              and(eq(auditLog.createdAt, createdAt), gt(auditLog.id, id)),
            );
          })()
        : undefined;

      const rows = await (cursorCondition
        ? baseQuery.where(and(eq(auditLog.action, 'submission.applied'), cursorCondition))
        : baseQuery
      )
        .orderBy(desc(auditLog.createdAt), asc(auditLog.id))
        .limit(limit + 1);

      // Resolve titles and slugs per entity type.
      const reciterIds = rows.filter((r) => r.targetType === 'reciter').map((r) => r.targetId).filter((x): x is string => !!x);
      const albumIds = rows.filter((r) => r.targetType === 'album').map((r) => r.targetId).filter((x): x is string => !!x);
      const trackIds = rows.filter((r) => r.targetType === 'track').map((r) => r.targetId).filter((x): x is string => !!x);

      const reciterMap = reciterIds.length
        ? new Map(
            (
              await ctx.db
                .select({ id: reciters.id, name: reciters.name, slug: reciters.slug, avatarUrl: reciters.avatarUrl })
                .from(reciters)
                .where(inArray(reciters.id, reciterIds))
            ).map((r) => [r.id, r]),
          )
        : new Map();

      const albumMap = albumIds.length
        ? new Map(
            (
              await ctx.db
                .select({
                  id: albums.id,
                  title: albums.title,
                  slug: albums.slug,
                  artworkUrl: albums.artworkUrl,
                  reciterSlug: reciters.slug,
                })
                .from(albums)
                .innerJoin(reciters, eq(reciters.id, albums.reciterId))
                .where(inArray(albums.id, albumIds))
            ).map((a) => [a.id, a]),
          )
        : new Map();

      const trackMap = trackIds.length
        ? new Map(
            (
              await ctx.db
                .select({
                  id: tracks.id,
                  title: tracks.title,
                  slug: tracks.slug,
                  albumSlug: albums.slug,
                  reciterSlug: reciters.slug,
                  artworkUrl: albums.artworkUrl,
                })
                .from(tracks)
                .innerJoin(albums, eq(albums.id, tracks.albumId))
                .innerJoin(reciters, eq(reciters.id, albums.reciterId))
                .where(inArray(tracks.id, trackIds))
            ).map((t) => [t.id, t]),
          )
        : new Map();

      const items: RecentChangeDTO[] = [];
      for (const r of rows.slice(0, limit)) {
        if (r.targetType === 'reciter') {
          const ent = reciterMap.get(r.targetId!);
          if (!ent) continue;
          items.push({
            id: r.id,
            action: r.submissionAction,
            entityType: 'reciter',
            entityTitle: ent.name,
            entitySlugPath: `/reciters/${ent.slug}`,
            avatarUrl: ent.avatarUrl,
            submitterName: r.submitterName ?? 'A contributor',
            at: r.createdAt,
          });
        } else if (r.targetType === 'album') {
          const ent = albumMap.get(r.targetId!);
          if (!ent) continue;
          items.push({
            id: r.id,
            action: r.submissionAction,
            entityType: 'album',
            entityTitle: ent.title,
            entitySlugPath: `/reciters/${ent.reciterSlug}/albums/${ent.slug}`,
            avatarUrl: ent.artworkUrl,
            submitterName: r.submitterName ?? 'A contributor',
            at: r.createdAt,
          });
        } else if (r.targetType === 'track') {
          const ent = trackMap.get(r.targetId!);
          if (!ent) continue;
          items.push({
            id: r.id,
            action: r.submissionAction,
            entityType: 'track',
            entityTitle: ent.title,
            entitySlugPath: `/reciters/${ent.reciterSlug}/albums/${ent.albumSlug}/tracks/${ent.slug}`,
            avatarUrl: ent.artworkUrl,
            submitterName: r.submitterName ?? 'A contributor',
            at: r.createdAt,
          });
        }
      }

      const hasMore = rows.length > limit;
      const lastRow = rows[Math.min(rows.length, limit) - 1];
      const nextCursor = hasMore && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null;

      return { items, nextCursor };
    }),
  ```

  Add the necessary imports at the top of `home.ts`: `auditLog`, `submissions`, `users`, `lyrics` not needed, plus `sql`, `inArray`, `lt`, `gt`, `and`, `or`, `asc`, `desc` from drizzle-orm, plus `encodeCursor` and `decodeCursor` from `../lib/cursor`, plus `PaginatedResult`.

- [ ] **Step 4: Run (green).**

- [ ] **Step 5: Commit.**

  ```bash
  git commit -am "feat(home): add home.recentChanges procedure for public /changes feed"
  ```

---

### Task 12: `<ModeratorNotes />` component + wire into submission detail

**Files:**
- Create: `apps/web/src/components/mod/moderator-notes.tsx`
- Create: `apps/web/src/components/mod/__tests__/moderator-notes.test.tsx`
- Modify: `apps/web/app/mod/submissions/[id]/page.tsx`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/src/server/actions/moderation.ts` (add `setSubmissionModeratorNotes` server action)

- [ ] **Step 1: Add i18n keys**

  In `apps/web/messages/en.json`, add under `mod.submission`:

  ```json
  "moderatorNotesLabel": "Moderator notes",
  "moderatorNotesHint": "Internal — only visible to moderators.",
  "moderatorNotesPlaceholder": "Add internal notes about this submission…",
  "moderatorNotesSaving": "Saving…",
  "moderatorNotesSaved": "Saved",
  "moderatorNotesError": "Couldn't save notes."
  ```

- [ ] **Step 2: Add server action**

  In `apps/web/src/server/actions/moderation.ts`, add (mirroring existing `setUserRole` shape):

  ```ts
  export async function setSubmissionModeratorNotes(
    submissionId: string,
    notes: string,
  ): Promise<void> {
    const caller = await getModeratorCaller('moderation.setSubmissionModeratorNotes');
    await caller.moderation.setModeratorNotes({ submissionId, notes });
  }
  ```

- [ ] **Step 3: Write the failing component test**

  Create `moderator-notes.test.tsx`. The test mocks the server action, types into the textarea, and asserts the action is called once after debounce.

  ```tsx
  import { render, screen, act } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { ModeratorNotes } from '../moderator-notes';

  vi.mock('@/server/actions/moderation', () => ({
    setSubmissionModeratorNotes: vi.fn().mockResolvedValue(undefined),
  }));
  vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
  }));

  describe('<ModeratorNotes />', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.clearAllMocks();
    });

    it('debounces saves; multiple rapid keystrokes -> one save', async () => {
      const { setSubmissionModeratorNotes } = await import('@/server/actions/moderation');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<ModeratorNotes submissionId="s1" initialNotes="" />);
      const ta = screen.getByRole('textbox');
      await user.type(ta, 'hello');
      await act(async () => {
        vi.advanceTimersByTime(700);
      });
      expect(setSubmissionModeratorNotes).toHaveBeenCalledTimes(1);
      expect(setSubmissionModeratorNotes).toHaveBeenCalledWith('s1', 'hello');
    });
  });
  ```

- [ ] **Step 4: Run (red)** — `./dev test moderator-notes` → FAIL (no component yet).

- [ ] **Step 5: Implement the component**

  Create `apps/web/src/components/mod/moderator-notes.tsx`:

  ```tsx
  'use client';

  import { useEffect, useRef, useState } from 'react';
  import { useTranslations } from 'next-intl';
  import { setSubmissionModeratorNotes } from '@/server/actions/moderation';

  interface Props {
    submissionId: string;
    initialNotes: string;
  }

  type SaveState = 'idle' | 'saving' | 'saved' | 'error';

  const DEBOUNCE_MS = 600;

  export function ModeratorNotes({ submissionId, initialNotes }: Props): React.JSX.Element {
    const t = useTranslations('mod.submission');
    const [value, setValue] = useState(initialNotes);
    const [state, setState] = useState<SaveState>('idle');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef(initialNotes);

    useEffect(() => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    function scheduleSave(next: string): void {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        if (next === lastSavedRef.current) return;
        setState('saving');
        try {
          await setSubmissionModeratorNotes(submissionId, next);
          lastSavedRef.current = next;
          setState('saved');
        } catch {
          setState('error');
        }
      }, DEBOUNCE_MS);
    }

    return (
      <section className="mt-4 mb-6">
        <label htmlFor="mod-notes" className="mb-1 block text-[13px] font-medium text-[var(--text-dim)]">
          {t('moderatorNotesLabel')}
        </label>
        <p className="mb-2 text-xs text-[var(--text-faint)]">{t('moderatorNotesHint')}</p>
        <textarea
          id="mod-notes"
          rows={3}
          value={value}
          maxLength={2000}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            scheduleSave(next);
          }}
          placeholder={t('moderatorNotesPlaceholder')}
          className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
        />
        <p
          role="status"
          aria-live="polite"
          className="mt-1 h-4 text-xs text-[var(--text-faint)]"
        >
          {state === 'saving' && t('moderatorNotesSaving')}
          {state === 'saved' && t('moderatorNotesSaved')}
          {state === 'error' && (
            <span className="text-[var(--color-error-500)]">{t('moderatorNotesError')}</span>
          )}
        </p>
      </section>
    );
  }
  ```

- [ ] **Step 6: Run (green).**

- [ ] **Step 7: Wire into submission detail page**

  In `apps/web/app/mod/submissions/[id]/page.tsx`:

  - Add import: `import { ModeratorNotes } from '@/components/mod/moderator-notes';`
  - In the JSX, after the field-diff section and before `{canReview && <ReviewActions />}`, add:

    ```tsx
    {canReview && (
      <ModeratorNotes submissionId={submission.id} initialNotes={submission.moderatorNotes ?? ''} />
    )}
    ```

  Note: this ensures notes are only editable while the submission is reviewable. Once applied/rejected/withdrawn, the notes column stays in the DB but the textarea isn't surfaced.

- [ ] **Step 8: Run `./dev qa`** — green.

- [ ] **Step 9: Commit.**

  ```bash
  git commit -am "feat(mod): add ModeratorNotes component, wire into submission detail page"
  ```

---

### Task 13: `<ReviewThread />` shared component + wire into mod submission detail

**Files:**
- Create: `apps/web/src/components/mod/review-thread.tsx`
- Create: `apps/web/src/components/mod/__tests__/review-thread.test.tsx`
- Modify: `apps/web/app/mod/submissions/[id]/page.tsx`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: Add i18n keys** under `mod.submission`:

  ```json
  "reviewThreadHeading": "Review history",
  "reviewThreadSubmittedBy": "Submitted by {name} on {date}",
  "reviewThreadAppliedAt": "Applied on {date}",
  "reviewThreadEmpty": "No reviews yet.",
  "reviewThreadActionApproved": "Approved",
  "reviewThreadActionRejected": "Rejected",
  "reviewThreadActionChangesRequested": "Changes requested"
  ```

- [ ] **Step 2: Failing test**

  Create `review-thread.test.tsx`:

  ```tsx
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { ReviewThread } from '../review-thread';

  vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
    useFormatter: () => ({
      relativeTime: (d: Date) => `rel:${d.toISOString()}`,
      dateTime: (d: Date) => `dt:${d.toISOString()}`,
    }),
  }));

  const baseThread = {
    submitter: { id: 'u1', name: 'Alice' },
    submittedAt: new Date('2026-04-20T10:00:00Z'),
    reviews: [
      {
        id: 'r1',
        action: 'changes_requested' as const,
        comment: 'Add a description.',
        reviewerName: 'Bob',
        reviewerRole: 'moderator' as const,
        createdAt: new Date('2026-04-21T10:00:00Z'),
      },
    ],
    appliedAt: null,
  };

  describe('<ReviewThread />', () => {
    it('renders submitter bookend, review row, and the comment', () => {
      render(<ReviewThread thread={baseThread} variant="moderator" />);
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Add a description/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });

    it('redacts reviewer name in contributor variant', () => {
      const redacted = {
        ...baseThread,
        reviews: [{ ...baseThread.reviews[0]!, reviewerName: '', reviewerRole: null }],
      };
      render(<ReviewThread thread={redacted} variant="contributor" />);
      expect(screen.queryByText(/Bob/)).not.toBeInTheDocument();
    });

    it('shows applied bookend when appliedAt is set', () => {
      const applied = { ...baseThread, appliedAt: new Date('2026-04-22T10:00:00Z') };
      render(<ReviewThread thread={applied} variant="moderator" />);
      expect(screen.getByText(/reviewThreadAppliedAt/)).toBeInTheDocument();
    });

    it('shows empty hint when reviews is empty and not applied', () => {
      const empty = { ...baseThread, reviews: [] };
      render(<ReviewThread thread={empty} variant="moderator" />);
      expect(screen.getByText(/reviewThreadEmpty/)).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 3: Run (red).**

- [ ] **Step 4: Implement** `apps/web/src/components/mod/review-thread.tsx`:

  ```tsx
  import { useTranslations, useFormatter } from 'next-intl';
  import type { ReviewThreadDTO } from '@nawhas/types'; // or wherever you placed the DTO

  interface Props {
    thread: ReviewThreadDTO;
    variant: 'moderator' | 'contributor';
  }

  const ACTION_LABEL_KEY: Record<string, string> = {
    approved: 'reviewThreadActionApproved',
    rejected: 'reviewThreadActionRejected',
    changes_requested: 'reviewThreadActionChangesRequested',
  };

  const ACTION_BADGE_CLASS: Record<string, string> = {
    approved: 'bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-[var(--color-success-950)] dark:text-[var(--color-success-300)]',
    rejected: 'bg-[var(--color-error-50)] text-[var(--color-error-700)] dark:bg-[var(--color-error-950)] dark:text-[var(--color-error-300)]',
    changes_requested: 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)] dark:bg-[var(--color-warning-950)] dark:text-[var(--color-warning-300)]',
  };

  export function ReviewThread({ thread, variant }: Props): React.JSX.Element {
    const t = useTranslations('mod.submission');
    const fmt = useFormatter();
    const showReviewer = variant === 'moderator';

    return (
      <section aria-label={t('reviewThreadHeading')} className="mt-8">
        <h2 className="mb-4 font-serif text-[20px] font-medium text-[var(--text)]">
          {t('reviewThreadHeading')}
        </h2>
        <ol className="space-y-4">
          <li className="text-sm text-[var(--text-dim)]">
            {t('reviewThreadSubmittedBy', {
              name: thread.submitter.name,
              date: fmt.dateTime(new Date(thread.submittedAt)),
            })}
          </li>
          {thread.reviews.length === 0 && !thread.appliedAt && (
            <li className="text-sm text-[var(--text-faint)]">{t('reviewThreadEmpty')}</li>
          )}
          {thread.reviews.map((r) => (
            <li key={r.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE_CLASS[r.action]}`}>
                  {t(ACTION_LABEL_KEY[r.action]!)}
                </span>
                {showReviewer && r.reviewerName && (
                  <span className="text-sm text-[var(--text)]">{r.reviewerName}</span>
                )}
                <time
                  dateTime={new Date(r.createdAt).toISOString()}
                  className="ml-auto text-xs text-[var(--text-faint)]"
                  title={fmt.dateTime(new Date(r.createdAt))}
                >
                  {fmt.relativeTime(new Date(r.createdAt))}
                </time>
              </div>
              {r.comment && (
                <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{r.comment}</p>
              )}
            </li>
          ))}
          {thread.appliedAt && (
            <li className="text-sm text-[var(--text-dim)]">
              {t('reviewThreadAppliedAt', {
                date: fmt.dateTime(new Date(thread.appliedAt)),
              })}
            </li>
          )}
        </ol>
      </section>
    );
  }
  ```

- [ ] **Step 5: Run (green).**

- [ ] **Step 6: Wire into submission detail page**

  In `apps/web/app/mod/submissions/[id]/page.tsx`:

  - Add import: `import { ReviewThread } from '@/components/mod/review-thread';`
  - Fetch the thread on the server: after the existing `caller.moderation.get(...)` call, add:

    ```ts
    const thread = await caller.moderation.getReviewThread({ submissionId: id });
    ```

  - In the JSX, below the review actions block, render:

    ```tsx
    <ReviewThread thread={thread} variant="moderator" />
    ```

- [ ] **Step 7: Run `./dev qa`** — green.

- [ ] **Step 8: Commit.**

  ```bash
  git commit -am "feat(mod): add ReviewThread component, wire into submission detail"
  ```

---

### Task 14: `<AuditFilters />` + `<AuditRow />` with expandable meta

**Files:**
- Create: `apps/web/src/components/mod/audit-filters.tsx`
- Create: `apps/web/src/components/mod/audit-row.tsx`
- Create: `apps/web/src/components/mod/__tests__/audit-filters.test.tsx`
- Modify: `apps/web/app/mod/audit/page.tsx`
- Modify: `apps/web/messages/en.json` (add filter labels + meta toggle copy)

- [ ] **Step 1: i18n keys** under `mod.audit`:

  ```json
  "filterActor": "Actor",
  "filterActorPlaceholder": "Search users…",
  "filterAction": "Action",
  "filterActionAny": "Any action",
  "filterTargetType": "Target type",
  "filterTargetTypeAny": "Any target type",
  "filterFrom": "From",
  "filterTo": "To",
  "filterApply": "Apply",
  "filterClear": "Clear",
  "metaToggleExpand": "Show details",
  "metaToggleCollapse": "Hide details"
  ```

- [ ] **Step 2: Failing test for filter form roundtrip** (`audit-filters.test.tsx`)

  ```tsx
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { describe, it, expect, vi } from 'vitest';
  import { AuditFilters } from '../audit-filters';

  vi.mock('next-intl', () => ({
    useTranslations: () => (k: string) => k,
  }));

  describe('<AuditFilters />', () => {
    it('submits selected filters as URL search params', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(
        <AuditFilters
          initial={{}}
          onSubmit={onSubmit}
          actions={['submission.applied', 'role.changed']}
        />,
      );
      await user.selectOptions(screen.getByLabelText('filterAction'), 'submission.applied');
      await user.click(screen.getByRole('button', { name: 'filterApply' }));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'submission.applied' }),
      );
    });
  });
  ```

- [ ] **Step 3: Run (red).**

- [ ] **Step 4: Implement `audit-filters.tsx`**

  ```tsx
  'use client';

  import { useTranslations } from 'next-intl';
  import { useRouter, useSearchParams } from 'next/navigation';
  import { useState } from 'react';

  interface Props {
    initial: { actor?: string; action?: string; targetType?: string; from?: string; to?: string };
    actions: string[];
    onSubmit?: (next: { actor?: string; action?: string; targetType?: string; from?: string; to?: string }) => void; // for tests
  }

  const TARGET_TYPES = ['submission', 'reciter', 'album', 'track', 'user'] as const;

  export function AuditFilters({ initial, actions, onSubmit }: Props): React.JSX.Element {
    const t = useTranslations('mod.audit');
    const router = useRouter();
    const search = useSearchParams();
    const [actor, setActor] = useState(initial.actor ?? '');
    const [action, setAction] = useState(initial.action ?? '');
    const [targetType, setTargetType] = useState(initial.targetType ?? '');
    const [from, setFrom] = useState(initial.from ?? '');
    const [to, setTo] = useState(initial.to ?? '');

    function apply(e: React.FormEvent): void {
      e.preventDefault();
      const next = {
        ...(actor ? { actor } : {}),
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      };
      onSubmit?.(next);
      const params = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => params.set(k, v as string));
      router.push(`/mod/audit?${params.toString()}`);
    }

    function clear(): void {
      setActor(''); setAction(''); setTargetType(''); setFrom(''); setTo('');
      router.push('/mod/audit');
    }

    return (
      <form
        role="search"
        onSubmit={apply}
        onReset={clear}
        className="mb-6 grid grid-cols-1 gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] p-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        <label className="text-[13px] text-[var(--text-dim)]">
          {t('filterActor')}
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder={t('filterActorPlaceholder')}
            className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>
        <label className="text-[13px] text-[var(--text-dim)]">
          {t('filterAction')}
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="">{t('filterActionAny')}</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-[var(--text-dim)]">
          {t('filterTargetType')}
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="">{t('filterTargetTypeAny')}</option>
            {TARGET_TYPES.map((tt) => (
              <option key={tt} value={tt}>{tt}</option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-[var(--text-dim)]">
          {t('filterFrom')}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>
        <label className="text-[13px] text-[var(--text-dim)]">
          {t('filterTo')}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-[6px] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-[8px] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            {t('filterApply')}
          </button>
          <button
            type="reset"
            className="rounded-[8px] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)]"
          >
            {t('filterClear')}
          </button>
        </div>
      </form>
    );
  }
  ```

- [ ] **Step 5: Implement `audit-row.tsx`** with the expandable-meta toggle:

  ```tsx
  'use client';

  import { useState } from 'react';
  import { useTranslations } from 'next-intl';
  import type { AuditLogDTO } from '@nawhas/types';

  interface Props {
    entry: AuditLogDTO;
  }

  export function AuditRow({ entry }: Props): React.JSX.Element {
    const t = useTranslations('mod.audit');
    const [open, setOpen] = useState(false);
    const subRowId = `audit-row-meta-${entry.id}`;
    const meta = entry.meta as Record<string, unknown> | null;
    const hasMeta = meta && Object.keys(meta).length > 0;

    return (
      <>
        <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
          <td className="w-8 px-2 py-3">
            {hasMeta && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={subRowId}
                onClick={() => setOpen((v) => !v)}
                className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                {open ? t('metaToggleCollapse') : t('metaToggleExpand')}
              </button>
            )}
          </td>
          <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">{entry.action}</td>
          <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{entry.targetType ?? '—'}</td>
          <td className="max-w-0 truncate px-4 py-3 text-xs text-[var(--text-dim)]">{entry.targetId ?? '—'}</td>
          <td className="px-4 py-3 text-right text-xs text-[var(--text-dim)]">
            <time dateTime={String(entry.createdAt)} title={new Date(entry.createdAt).toLocaleString()}>
              {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </time>
          </td>
        </tr>
        {open && hasMeta && (
          <tr id={subRowId} className="bg-[var(--surface-2)]">
            <td colSpan={5} className="px-4 py-3">
              <table className="text-xs text-[var(--text)]">
                <tbody>
                  {Object.entries(meta).map(([k, v]) => (
                    <tr key={k} className="align-top">
                      <th scope="row" className="pr-3 text-left font-medium text-[var(--text-dim)]">{k}</th>
                      <td>
                        {typeof v === 'object' && v !== null
                          ? <pre className="whitespace-pre-wrap font-mono text-[11px]">{JSON.stringify(v, null, 2)}</pre>
                          : <span className="font-mono">{String(v)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        )}
      </>
    );
  }
  ```

- [ ] **Step 6: Update `app/mod/audit/page.tsx`** to use the filter strip + new row component:

  ```tsx
  // Add to the imports
  import { AuditFilters } from '@/components/mod/audit-filters';
  import { AuditRow } from '@/components/mod/audit-row';

  // After the route signature, accept searchParams:
  export default async function ModAuditPage({
    searchParams,
  }: {
    searchParams: Promise<{ actor?: string; action?: string; targetType?: string; from?: string; to?: string }>;
  }): Promise<React.JSX.Element> {
    const sp = await searchParams;
    // ...existing session/caller setup...
    const { items, nextCursor } = await caller.moderation.auditLog({
      limit: 20,
      ...(sp.actor ? { actor: sp.actor } : {}),
      ...(sp.action ? { action: sp.action } : {}),
      ...(sp.targetType ? { targetType: sp.targetType as 'submission' | 'reciter' | 'album' | 'track' | 'user' } : {}),
      ...(sp.from ? { from: sp.from } : {}),
      ...(sp.to ? { to: sp.to } : {}),
    });
    // ...
  ```

  Render the filter strip above the table:

  ```tsx
  <AuditFilters
    initial={sp}
    actions={[
      'submission.applied',
      'submission.approved',
      'submission.rejected',
      'submission.changes_requested',
      'submission.notes_updated',
      'submission.withdrawn',
      'role.changed',
    ]}
  />
  ```

  Replace the inline `<AuditTableRow />` JSX with `<AuditRow entry={entry} />`. Add a leading `<th>` for the toggle column (`<th scope="col" className="w-8" />`).

- [ ] **Step 7: Run `./dev qa`** — green.

- [ ] **Step 8: Commit.**

  ```bash
  git commit -am "feat(mod): add audit-log filter strip and expandable meta"
  ```

---

### Task 15: `<DashboardStats />` + revamped `/mod` overview

**Files:**
- Create: `apps/web/src/components/mod/dashboard-stats.tsx`
- Create: `apps/web/src/components/mod/__tests__/dashboard-stats.test.tsx`
- Modify: `apps/web/app/mod/page.tsx`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: i18n keys** under `mod.overview`:

  ```json
  "statPendingTitle": "Pending review",
  "statPendingSubtitle": "submissions awaiting review",
  "statPendingEmpty": "All caught up",
  "statRecentTitle": "Last 7 days",
  "statRecentSubtitle": "submissions received",
  "statOldestTitle": "Oldest pending",
  "statOldestEmpty": "No pending items",
  "statOldestHours": "{n, plural, =0 {Just now} =1 {1 hour old} other {# hours old}}",
  "statOldestDays": "{n, plural, =1 {1 day old} other {# days old}}"
  ```

- [ ] **Step 2: Failing component test** (`dashboard-stats.test.tsx`):

  ```tsx
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { DashboardStats } from '../dashboard-stats';

  vi.mock('next-intl', () => ({
    useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
      vars ? `${k}:${JSON.stringify(vars)}` : k,
  }));

  describe('<DashboardStats />', () => {
    it('renders three cards and 7 sparkline bars', () => {
      render(<DashboardStats stats={{
        pendingCount: 3,
        last7DaysCount: 12,
        last7DaysBuckets: [1, 2, 0, 3, 1, 4, 1],
        oldestPendingHours: 26,
      }} />);
      expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
      expect(screen.getAllByLabelText(/^bar:/).length).toBe(7);
    });
  });
  ```

- [ ] **Step 3: Run (red).**

- [ ] **Step 4: Implement** `dashboard-stats.tsx`:

  ```tsx
  import Link from 'next/link';
  import { useTranslations } from 'next-intl';

  interface Stats {
    pendingCount: number;
    last7DaysCount: number;
    last7DaysBuckets: number[];
    oldestPendingHours: number | null;
  }

  export function DashboardStats({ stats }: { stats: Stats }): React.JSX.Element {
    const t = useTranslations('mod.overview');
    const max = Math.max(1, ...stats.last7DaysBuckets);

    return (
      <ul className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <li>
          <Link href="/mod/queue" className="block rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6 transition-colors hover:border-[var(--border-strong)]">
            <p className="font-serif text-3xl font-medium text-[var(--text)]">{stats.pendingCount}</p>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              {stats.pendingCount === 0 ? t('statPendingEmpty') : t('statPendingSubtitle')}
            </p>
          </Link>
        </li>
        <li className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <p className="font-serif text-3xl font-medium text-[var(--text)]">{stats.last7DaysCount}</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t('statRecentSubtitle')}</p>
          <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
            {stats.last7DaysBuckets.map((c, i) => (
              <div
                key={i}
                aria-label={`bar:${i}:${c}`}
                style={{ height: `${(c / max) * 100}%` }}
                className="w-3 rounded-sm bg-[var(--accent)]/70"
              />
            ))}
          </div>
          <table className="sr-only">
            <caption>{t('statRecentTitle')}</caption>
            <tbody>
              {stats.last7DaysBuckets.map((c, i) => (
                <tr key={i}><th scope="row">{i}</th><td>{c}</td></tr>
              ))}
            </tbody>
          </table>
        </li>
        <li className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-6">
          <p className="font-serif text-3xl font-medium text-[var(--text)]">
            {stats.oldestPendingHours === null
              ? '—'
              : stats.oldestPendingHours >= 24
                ? t('statOldestDays', { n: Math.floor(stats.oldestPendingHours / 24) })
                : t('statOldestHours', { n: Math.floor(stats.oldestPendingHours) })}
          </p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {stats.oldestPendingHours === null ? t('statOldestEmpty') : t('statOldestTitle')}
          </p>
        </li>
      </ul>
    );
  }
  ```

- [ ] **Step 5: Run (green).**

- [ ] **Step 6: Update `app/mod/page.tsx`** — replace the existing one-card grid with the new component, keep the recent-activity section:

  ```tsx
  // imports
  import { DashboardStats } from '@/components/mod/dashboard-stats';

  // inside the component, replace the existing single-card grid with:
  const stats = await caller.moderation.dashboardStats();
  // ...
  <DashboardStats stats={stats} />
  // existing 'Recent activity' section stays as-is below
  ```

- [ ] **Step 7: Run `./dev qa`** — green.

- [ ] **Step 8: Commit.**

  ```bash
  git commit -am "feat(mod): replace single-card overview with three-card dashboard stats"
  ```

---

### Task 16: `/profile/contributions/[id]` route + contributor-side review thread

**Files:**
- Create: `apps/web/app/(protected)/profile/contributions/[id]/page.tsx`
- Modify: `apps/web/app/(protected)/profile/contributions/page.tsx` (link rows to detail)
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: Read the existing listing page** to understand its DTO + how rows are rendered.

  Run: `cat apps/web/app/(protected)/profile/contributions/page.tsx`

  Note the row structure — adapt it to wrap in a `<Link href={\`/profile/contributions/${id}\`}>` for navigation.

- [ ] **Step 2: i18n keys** under `profile.contributions`:

  ```json
  "detailHeading": "My submission",
  "detailBackLink": "← Back to contributions",
  "detailNotFound": "Submission not found"
  ```

  (Reuse `mod.submission.fieldXLabel` keys for field labels — they're already translated and apply equally to the contributor view.)

- [ ] **Step 3: Implement the detail route**

  Create `apps/web/app/(protected)/profile/contributions/[id]/page.tsx`. Mirrors the moderator submission detail layout but:
  - Pulls submission via the existing `submission` router (add a `submission.getMine({ submissionId })` if one doesn't exist — check `submission.ts` first).
  - Calls `submission.getMyReviewThread({ submissionId: id })`.
  - Renders the same `<SubmissionFields>` helper from the mod page (extract or copy — see comment) — the field-diff vs. preview rendering is independent of role.
  - Renders `<ReviewThread thread={thread} variant="contributor" />`.
  - No `<ReviewActions />`, no `<ModeratorNotes />`.

  ```tsx
  // file: apps/web/app/(protected)/profile/contributions/[id]/page.tsx
  import { notFound } from 'next/navigation';
  import Link from 'next/link';
  import { headers } from 'next/headers';
  import { getTranslations } from 'next-intl/server';
  import { db, reciters, albums, tracks, lyrics } from '@nawhas/db';
  import { eq } from 'drizzle-orm';
  import { auth } from '@/lib/auth';
  import { createCallerFactory } from '@/server/trpc/trpc';
  import { appRouter } from '@/server/trpc/router';
  import { ReviewThread } from '@/components/mod/review-thread';
  // import the SubmissionFields helper if it's been extracted; otherwise copy

  export const dynamic = 'force-dynamic';

  const createCaller = createCallerFactory(appRouter);

  export default async function MyContributionDetailPage({
    params,
  }: {
    params: Promise<{ id: string }>;
  }): Promise<React.JSX.Element> {
    const { id } = await params;
    const reqHeaders = await headers();
    const sessionData = await auth.api.getSession({ headers: reqHeaders });
    if (!sessionData?.session) notFound();

    const caller = createCaller({ db, session: sessionData.session, user: sessionData.user });
    const t = await getTranslations('profile.contributions');

    let submission;
    try {
      submission = await caller.submission.getMine({ submissionId: id });
    } catch {
      notFound();
    }
    const thread = await caller.submission.getMyReviewThread({ submissionId: id });
    // current values for diff (only for edit submissions)
    const currentValues = await fetchCurrentValues(submission); // copy fetchCurrentValues from mod page

    return (
      <main>
        <Link href="/profile/contributions" className="text-sm text-[var(--text-dim)]">
          {t('detailBackLink')}
        </Link>
        <h1 className="mt-4 mb-2 font-serif text-[28px] font-medium">{t('detailHeading')}</h1>
        {/* render fields preview/diff (copy from mod page) */}
        {/* ... */}
        <ReviewThread thread={thread} variant="contributor" />
      </main>
    );
  }
  ```

  *Implementation note: rather than duplicating `fetchCurrentValues` and `SubmissionFields` between the mod page and this page, extract them into `apps/web/src/components/submissions/submission-fields.tsx` and share. Adds one extra commit-worthy refactor — fine to do as part of this task.*

- [ ] **Step 4: Add `submission.getMine` if absent**

  In `submission.ts`, if no procedure returns the contributor's own submission by id, add:

  ```ts
  getMine: protectedProcedure
    .input(z.object({ submissionId: z.uuid() }))
    .query(async ({ ctx, input }): Promise<SubmissionDTO> => {
      const [row] = await ctx.db
        .select()
        .from(submissions)
        .where(eq(submissions.id, input.submissionId))
        .limit(1);
      if (!row || row.submittedByUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return row as SubmissionDTO;
    }),
  ```

  Add a quick test in `submission.test.ts`.

- [ ] **Step 5: Wrap rows in the listing page** with `<Link href="/profile/contributions/{id}">`.

- [ ] **Step 6: Run `./dev qa`** — green.

- [ ] **Step 7: Commit.**

  ```bash
  git commit -am "feat(profile): add /profile/contributions/[id] with read-only review thread"
  ```

---

### Task 17: `/changes` public route + day-grouping components

**Files:**
- Create: `apps/web/app/changes/page.tsx`
- Create: `apps/web/src/components/changes/changes-day-section.tsx`
- Create: `apps/web/src/components/changes/change-row.tsx`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: i18n keys** under new `changes` namespace:

  ```json
  "pageTitle": "Recent changes",
  "pageDescription": "Latest additions and edits to the catalogue.",
  "groupToday": "Today",
  "groupYesterday": "Yesterday",
  "verbAddReciter": "added a reciter",
  "verbEditReciter": "edited a reciter",
  "verbAddAlbum": "added an album",
  "verbEditAlbum": "edited an album",
  "verbAddTrack": "added a track",
  "verbEditTrack": "edited a track",
  "loadMore": "Load more",
  "empty": "No changes yet."
  ```

- [ ] **Step 2: Implement `change-row.tsx`**

  ```tsx
  import Link from 'next/link';
  import { useTranslations, useFormatter } from 'next-intl';
  import { CoverArt } from '@/components/cover-art'; // or wherever the placeholder lives — check Phase 2.5 components
  import type { RecentChangeDTO } from '@/server/routers/home';

  const VERB_KEY: Record<string, string> = {
    'create:reciter': 'verbAddReciter',
    'edit:reciter': 'verbEditReciter',
    'create:album': 'verbAddAlbum',
    'edit:album': 'verbEditAlbum',
    'create:track': 'verbAddTrack',
    'edit:track': 'verbEditTrack',
  };

  export function ChangeRow({ change }: { change: RecentChangeDTO }): React.JSX.Element {
    const t = useTranslations('changes');
    const fmt = useFormatter();
    const verbKey = VERB_KEY[`${change.action}:${change.entityType}`] ?? 'verbAddReciter';
    return (
      <li className="flex items-center gap-3 py-3">
        <CoverArt src={change.avatarUrl} alt="" size={48} />
        <div className="flex-1 text-sm text-[var(--text)]">
          <span>{change.submitterName} {t(verbKey)}: </span>
          <Link href={change.entitySlugPath} className="font-medium hover:underline">
            {change.entityTitle}
          </Link>
        </div>
        <time
          dateTime={new Date(change.at).toISOString()}
          className="text-xs text-[var(--text-faint)]"
          title={new Date(change.at).toLocaleString()}
        >
          {fmt.relativeTime(new Date(change.at))}
        </time>
      </li>
    );
  }
  ```

  (Verify the actual CoverArt import path / props by checking
  `apps/web/src/components/` for the Phase 2.5 cover-art component;
  swap to a thin `<img>` with placeholder fallback if the API doesn't
  match.)

- [ ] **Step 3: Implement `changes-day-section.tsx`**

  ```tsx
  import { useTranslations, useFormatter } from 'next-intl';
  import { ChangeRow } from './change-row';
  import type { RecentChangeDTO } from '@/server/routers/home';

  function isSameDay(a: Date, b: Date): boolean {
    return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
  }

  function dayLabel(date: Date, t: (k: string) => string, fmt: { dateTime: (d: Date) => string }): string {
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, today)) return t('groupToday');
    if (isSameDay(date, yesterday)) return t('groupYesterday');
    return fmt.dateTime(date);
  }

  export function ChangesDaySection({ date, changes }: { date: Date; changes: RecentChangeDTO[] }): React.JSX.Element {
    const t = useTranslations('changes');
    const fmt = useFormatter();
    return (
      <section className="border-t border-[var(--border)] py-6 first:border-t-0">
        <h2 className="sticky top-16 mb-3 bg-[var(--surface)] py-2 text-sm font-medium uppercase tracking-wide text-[var(--text-dim)]">
          {dayLabel(date, t, fmt)}
        </h2>
        <ol>
          {changes.map((c) => <ChangeRow key={c.id} change={c} />)}
        </ol>
      </section>
    );
  }
  ```

- [ ] **Step 4: Implement `app/changes/page.tsx`**

  ```tsx
  import type { Metadata } from 'next';
  import { db } from '@nawhas/db';
  import { headers } from 'next/headers';
  import { getTranslations } from 'next-intl/server';
  import { auth } from '@/lib/auth';
  import { createCallerFactory } from '@/server/trpc/trpc';
  import { appRouter } from '@/server/trpc/router';
  import { buildMetadata } from '@/lib/metadata';
  import { ChangesDaySection } from '@/components/changes/changes-day-section';
  import type { RecentChangeDTO } from '@/server/routers/home';

  export const dynamic = 'force-dynamic';
  export const metadata: Metadata = buildMetadata({
    title: 'Recent changes',
    description: 'Latest additions and edits to the catalogue.',
  });

  const createCaller = createCallerFactory(appRouter);

  export default async function ChangesPage(): Promise<React.JSX.Element> {
    const reqHeaders = await headers();
    const sessionData = await auth.api.getSession({ headers: reqHeaders });
    const caller = createCaller({
      db,
      session: sessionData?.session ?? null,
      user: sessionData?.user ?? null,
    });
    const { items } = await caller.home.recentChanges({ limit: 50 });
    const t = await getTranslations('changes');

    // Group by UTC day
    const groups = new Map<string, { date: Date; changes: RecentChangeDTO[] }>();
    for (const c of items) {
      const day = new Date(c.at).toISOString().slice(0, 10);
      if (!groups.has(day)) groups.set(day, { date: new Date(day), changes: [] });
      groups.get(day)!.changes.push(c);
    }
    const sections = Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 font-serif text-[36px] font-medium text-[var(--text)]">{t('pageTitle')}</h1>
        <p className="mb-8 text-sm text-[var(--text-dim)]">{t('pageDescription')}</p>
        {sections.length === 0 ? (
          <p className="text-sm text-[var(--text-faint)]">{t('empty')}</p>
        ) : (
          sections.map((s) => (
            <ChangesDaySection key={s.date.toISOString()} date={s.date} changes={s.changes} />
          ))
        )}
      </main>
    );
  }
  ```

  (Pagination via "Load more" client component is deferred — the
  initial page is a 50-item fetch which is plenty for V1. If this
  needs to grow, add a small `<LoadMoreChanges />` client component
  modelled on `<LoadMoreAudit />`.)

- [ ] **Step 5: Run `./dev qa`** — green.

- [ ] **Step 6: Commit.**

  ```bash
  git commit -am "feat(changes): add public day-grouped /changes feed"
  ```

---

### Task 18: Header nav — "Recent changes" link

**Files:**
- Modify: `apps/web/src/components/layout/header.tsx` (or wherever the public header lives)
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: Locate the header nav**

  Run: `find apps/web/src/components/layout -name "header*"` and `find apps/web/src/components -name "*nav*" -not -path "*/__tests__/*"`. Identify the file that renders the public top-level nav links.

- [ ] **Step 2: Add i18n key** under `nav` (or wherever existing nav strings live):

  ```json
  "recentChanges": "Recent changes"
  ```

- [ ] **Step 3: Insert the link** into the nav alongside the existing items, between the browse-style links and the search/user area. Use the same `<Link>` styling as adjacent items.

- [ ] **Step 4: Run `./dev qa`** — green.

- [ ] **Step 5: Manual smoke** — start dev server (`./dev start`), open `/`, click the new link, confirm `/changes` renders.

- [ ] **Step 6: Commit.**

  ```bash
  git commit -am "feat(nav): add Recent changes link to public header"
  ```

---

### Task 19: E2E — approve-and-applies-immediately happy path

**Files:**
- Create or modify: `apps/e2e/tests/moderation-w2.spec.ts`

- [ ] **Step 1: Locate existing E2E patterns**

  Run: `find apps/e2e -name "*.spec.ts" | head` and look at one (e.g. `contributor-submissions.spec.ts`) to understand login fixtures, contributor + moderator helpers, and DB seed/cleanup conventions.

- [ ] **Step 2: Write the test**

  ```ts
  import { test, expect } from '@playwright/test';
  import { loginAs } from './helpers/auth'; // adjust to project pattern

  test('approve immediately applies submission and entity is reachable', async ({ page, browser }) => {
    // Contributor submits a reciter
    await loginAs(page, 'contributor');
    await page.goto('/contribute/reciter/new');
    await page.getByLabel('Name').fill('E2E Reciter Approve');
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page).toHaveURL(/\/profile\/contributions/);

    // Switch to moderator
    const modContext = await browser.newContext();
    const modPage = await modContext.newPage();
    await loginAs(modPage, 'moderator');
    await modPage.goto('/mod/queue');
    await modPage.getByRole('link', { name: /e2e reciter approve/i }).click();
    await modPage.getByRole('button', { name: /^approve$/i }).click();

    // The status should flip to applied (no second click)
    await expect(modPage.getByText(/applied/i)).toBeVisible();

    // Public reciter page resolves
    await modPage.goto('/reciters/e2e-reciter-approve');
    await expect(modPage.getByRole('heading', { name: /e2e reciter approve/i })).toBeVisible();

    await modContext.close();
  });
  ```

- [ ] **Step 3: Run** — `./dev test:e2e --filter=moderation-w2`

  Expected: PASS.

- [ ] **Step 4: Commit.**

  ```bash
  git commit -am "test(e2e): cover approve-and-applies-immediately path for W2"
  ```

---

### Task 20: E2E — `/mod/audit` filter

**File:** `apps/e2e/tests/moderation-w2.spec.ts` (extend)

- [ ] **Step 1: Add the test**

  ```ts
  test('audit filter narrows to submission.applied', async ({ page }) => {
    await loginAs(page, 'moderator');
    await page.goto('/mod/audit');
    await page.getByLabel(/^Action$/i).selectOption('submission.applied');
    await page.getByRole('button', { name: /apply/i }).click();
    await expect(page).toHaveURL(/action=submission\.applied/);
    // every visible row's first text cell should contain submission.applied
    const cells = await page.locator('table tbody tr').allTextContents();
    expect(cells.every((row) => row.includes('submission.applied'))).toBe(true);
  });
  ```

- [ ] **Step 2: Run** — `./dev test:e2e --filter=moderation-w2`

  Expected: PASS.

- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "test(e2e): cover audit-log action filter"
  ```

---

### Task 21: E2E — public `/changes` shows applied event

**File:** `apps/e2e/tests/moderation-w2.spec.ts` (extend)

- [ ] **Step 1: Add the test** — depends on the Task 19 fixture having run already, or seeded inline.

  ```ts
  test('public /changes shows newly applied submission in todays group', async ({ page }) => {
    // Seed via UI: contributor submits + moderator approves a uniquely-named reciter
    const slug = `changes-feed-${Date.now()}`;
    const name = `Changes Feed ${Date.now()}`;
    await loginAs(page, 'contributor');
    await page.goto('/contribute/reciter/new');
    await page.getByLabel('Name').fill(name);
    await page.getByRole('button', { name: /submit/i }).click();
    await loginAs(page, 'moderator'); // (or same logic as Task 19 with multiple contexts)
    await page.goto('/mod/queue');
    await page.getByRole('link', { name: new RegExp(name, 'i') }).click();
    await page.getByRole('button', { name: /^approve$/i }).click();

    // Public feed
    await page.goto('/changes');
    await expect(page.getByText(/today/i)).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();
  });
  ```

- [ ] **Step 2: Run** — `./dev test:e2e --filter=moderation-w2`

  Expected: PASS.

- [ ] **Step 3: Commit.**

  ```bash
  git commit -am "test(e2e): cover public /changes feed surfacing applied submissions"
  ```

---

### Task 22: Final verification

- [ ] **Step 1: Full QA** — `./dev qa`. Expected: green.
- [ ] **Step 2: Full unit tests** — `./dev test`. Expected: green.
- [ ] **Step 3: Full E2E** — `./dev test:e2e`. Expected: green.
- [ ] **Step 4: Manual smoke**, against the dev server (`./dev start`):
  - `/mod` — three cards render with sensible numbers; sparkline visible.
  - `/mod/queue` — pending submissions listed; click into one.
  - `/mod/submissions/[id]` — moderator notes textarea above review actions; type and confirm "Saved" indicator appears.
  - Click Approve on a pending submission — page refreshes with status `applied`, entity is reachable on public route immediately.
  - `/mod/audit` — filter strip visible; selecting an action narrows the table; toggling a row's chevron expands meta.
  - `/profile/contributions` — rows link to `/profile/contributions/[id]`; detail page shows review thread without reviewer names.
  - `/changes` — public feed renders day groups with the recently approved entity in "Today".
  - Public header — "Recent changes" link works from anywhere.
- [ ] **Step 5: Update the roadmap** at `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md`:
  - Flip the Phase 2.4 W2 entry from "not started" to "✅ shipped 2026-04-XX".
  - Add a closeout summary paragraph in the same shape as the W1 entry — list the major commits, the schema/migration footprint, and any deferred follow-ups.
- [ ] **Step 6: Commit the roadmap update.**

  ```bash
  git commit -am "docs(roadmap): record Phase 2.4 W2 ship + closeout"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec section | Implementing task(s) |
|---|---|
| §1 Merged approve+apply | 3 (extract+merge), 4 (UI cleanup), 19 (E2E) |
| §1 Migration / wipe | 2 (reset script), 1 (index) |
| §2 Internal moderator notes | 5 (procedure), 12 (component + wire) |
| §3 Revision thread (mod variant) | 6 (procedure), 13 (component + wire) |
| §3 Revision thread (contributor variant) | 7 (procedure), 16 (route + thread) |
| §4 Audit filters | 8 (searchUsers), 9 (auditLog filter), 14 (UI) |
| §4 Expandable meta | 14 (audit-row component) |
| §5 Dashboard stats | 10 (procedure), 15 (component + wire) |
| §6 Public /changes feed | 1 (index), 11 (procedure), 17 (route + components) |
| §6 Header nav link | 18 |
| §7 Server changes summary | covered by tasks 3, 5–11 |
| §7 Pages affected | covered by tasks 4, 13, 14, 15, 16, 17, 18 |
| §7 Components added/removed | covered by tasks 4 (delete), 12, 13, 14, 15, 17 (create) |
| §8 Tests | tRPC tests inline in tasks 3, 5–11; component tests in 12–15; E2E in 19–21 |

No spec sections are uncovered.

**Placeholder scan:** No "TBD" or "implement later" anywhere. Each task
includes the actual code (or a precise reference to where to copy from
within the existing codebase).

**Type consistency:**

- `ReviewThreadDTO` shape declared in Task 6 is used identically in
  Tasks 7 and 13.
- `RecentChangeDTO` shape declared in Task 11 is used identically in
  Task 17.
- `applyToCanonical` returns `{ entityId, entityType }` in Task 3 and
  is consumed with that shape both in `review` (same task) and in the
  retained `applyApproved` (same task).
- Filter param names (`actor`, `action`, `targetType`, `from`, `to`)
  match across Tasks 9, 14, and 20.

No type or naming inconsistencies surfaced.
