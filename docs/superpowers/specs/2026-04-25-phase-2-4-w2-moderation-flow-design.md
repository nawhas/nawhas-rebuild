# Phase 2.4 W2 — Moderation Flow (Design)

**Status:** Design draft 2026-04-25 · Awaiting user review
**Author:** Asif (brainstormed with Claude)
**Scope:** Second of three workstreams from the
[Contributor & Moderator Overhaul](./2026-04-23-contributor-moderator-overhaul-design.md)
spec. Focuses on the moderator-side experience: merging approve+apply,
internal moderator notes, the review thread, audit log filters, the
dashboard, and the public `/changes` feed folded in from Phase 2.5.

## Context

W1 shipped 2026-04-23 with a richer schema and rewritten contribute forms.
The moderator side is still the same as M6: approve and apply are two
separate clicks (`moderation.review` flips status to `approved`, and a
separate `moderation.applyApproved` performs the canonical write); the
submission detail page renders only the latest status as a badge with no
review history; there's no internal moderator scratchpad even though the
`moderator_notes` column exists from W1; `/mod/audit` is unfiltered and
its `meta` jsonb is invisible; `/mod` shows one stat card and the last
ten audit rows; and there's no public-facing surface that announces
"the catalogue is alive" — every applied submission lands silently.

Phase 2.5 (POC design port, shipped 2026-04-25) folded a public
day-grouped `/changes` feed into W2's scope as the public twin of the
moderator audit log.

This spec covers all of that. W3 (contributor lifecycle: withdraw,
apply-for-access, resubmit-diff, digest emails, public contributor
profile) is the next workstream.

## Goals

1. **One-click decisions.** Approving a submission applies it to the
   canonical tables in the same transaction. The orphan bug (status
   `approved` but no canonical row) becomes structurally impossible in
   the primary path.
2. **Decision context.** Moderators see the full review history below
   the field diff, and have a private scratchpad for internal notes.
3. **Useful audit.** The audit log is filterable by actor, action,
   target type, and date range, with each row's full `meta` reachable.
4. **Visible momentum.** The public `/changes` feed shows the catalogue
   updating in real time, day by day.

## Non-Goals

- **No W3 work.** Withdraw, apply-to-contribute, resubmit-with-diff,
  digest emails, and the public contributor profile are all W3.
- **No discussion surface on submissions.** The review thread is
  read-only. No moderator-to-moderator commenting outside of decisions.
  No markdown or rich text in notes or comments.
- **No notifications redesign.** Email behaviour for reject /
  changes_requested is unchanged. New events (apply, notes update) do
  not send email.
- **No realtime / websockets.** `/changes` is request-time fetched,
  same as every other public route.
- **No admin dashboard.** Three-role model (`user` / `contributor` /
  `moderator`) stays.

## Design

### §1 — Merged approve+apply

`moderation.review(approve)` becomes the single canonical write path.
Inside one transaction:

1. Insert `submission_reviews` row (action=`approved`, reviewer,
   comment).
2. Run the existing `applyApproved` body inline — slug pick, canonical
   insert/update, lyrics upsert for tracks. Reuses the existing
   `pickReciterSlug` / `pickAlbumSlug` / `pickTrackSlug` helpers and
   the per-language lyrics upsert loop verbatim.
3. Insert `audit_log` row with `action='submission.applied'`,
   `targetType=<reciter|album|track>`, `targetId=<canonical entity id>`,
   `meta={ submissionId, submissionAction }` — single event per
   approve+apply, not two. (Today's `applyApproved` writes the same
   shape; we keep it identical so the §3 bookend lookup
   (`meta.submissionId`) and the §6 `/changes` join keep working.)
4. `update submissions set status = 'applied'`.

**Failure modes (all roll back the whole tx):**

- **Slug collision** (Postgres `23505` unique violation): "A
  `<reciter|album|track>` with this name already exists. Try a
  different name." Status stays `pending`. The slug helpers already
  pick free suffixes, so this should be rare in practice — the
  remaining hole is two near-simultaneous approves picking the same
  suffix. The unique-violation rollback is the safety net.
- **FK violation** (`23503` on `reciterId` / `albumId`): "Parent
  `<reciter|album>` no longer exists — reject this submission."
  Status stays `pending`.
- **Other DB error:** Generic "Couldn't apply this submission. Try
  again, or reject." with a `support_id` logged via Sentry. The audit
  log row is not written (it's inside the rolled-back tx).

`reject` and `changes_requested` paths are unchanged — review row +
status update + audit log + email, no canonical write.

`moderation.applyApproved` stays in the router but is **removed from
the UI**. The submission detail page no longer shows an Apply button.
The procedure exists only as a documented ops escape hatch (e.g.
`pnpm tsx scripts/apply-submission.ts <id>` if a moderator ever needs
to re-attempt the canonical write outside of a review). JSDoc reflects
this.

The "Awaiting apply" tab from the original Phase 2.4 spec is **dropped
from W2 scope** — with the merge, the only path to `approved` status
is the manual escape hatch, which is itself transactional, so the
state is unreachable in steady state.

**Migration / wipe:** before W2 ships, run
`update submissions set status = 'pending' where status = 'approved'`
against the staging DB. Any existing approved-but-unapplied rows go
back into the queue and get re-decided through the new flow. Persisted
as `pnpm tsx scripts/reset-approved-submissions.ts` so it can be
re-run idempotently. Production preservation is not a concern (no
production cutover yet).

### §2 — Internal moderator notes

New UI on `/mod/submissions/[id]` only, never visible to the
contributor.

Single textarea labelled "Moderator notes", rendered above the review
actions so it's prompted-into during the decision. Pre-filled with
`submissions.moderator_notes` if non-empty. Saves via a new
`moderation.setModeratorNotes({ submissionId, notes })` mutation,
debounced 600ms after the last keystroke; small "Saved" / "Saving…"
indicator next to the field. No version history — single column,
last write wins.

Authz: `moderatorProcedure` only. Audit log entry written on each
save: `action='submission.notes_updated'`,
`meta = { length: notes.length }` — note text is not stored in audit
meta to keep `meta` bounded. Length-only is enough to confirm "notes
were edited at this time" for accountability without leaking content.

Not rendered on `/profile/contributions/[id]`. Not included in any
contributor-facing email. The column already exists from W1, so no
schema change.

### §3 — Revision thread

Below the field diff on `/mod/submissions/[id]`, and mirrored on
`/profile/contributions/[id]` for the contributor with reviewer name
redacted.

**Source rows.** `submission_reviews` for this `submissionId`, plus
two synthetic bookend rows derived from the submission itself:

- **Top:** "Submitted by `<name>` on `<date>`" — sourced from
  `submissions.createdAt` joined to `users` for the submitter's name.
- **Bottom (when `status='applied'`):** "Applied on `<date>`" —
  sourced from the `audit_log` row with `action='submission.applied'`
  whose `meta.submissionId` matches. Latest match wins.

**Each review row renders:**

- Action badge — green "Approved" / red "Rejected" / amber "Changes
  requested", reusing the existing `SubmissionStatusBadge` colour
  vocabulary.
- Reviewer name + role badge — moderator view only. Contributor view
  shows just the action.
- Comment block when present. Plain text, preserves newlines
  (`whitespace-pre-wrap`), no markdown.
- Relative + absolute timestamp ("3 days ago" with `title` attribute
  holding the full ISO string).

**Empty thread** (a brand-new pending submission with no reviews yet)
renders just the "Submitted by …" bookend + a hint: "No reviews yet."

Backed by a new `moderation.getReviewThread({ submissionId })` query
returning `{ submitter, reviews, applied }`. Joins
`submission_reviews → users` for reviewer names. Contributor variant
exposed as `submission.getMyReviewThread({ submissionId })` — same
shape with reviewer names stripped, scoped to
`submittedByUserId === ctx.user.id`.

### §4 — `/mod/audit` filters + expandable meta

URL-driven filter strip above the existing audit table. All filters
compose with AND. Empty filters omit the param.

| Filter | Control | URL param |
|---|---|---|
| Actor | Typeahead combobox (new `moderation.searchUsers` procedure, prefix + ilike on name/email, moderator-scoped) | `?actor=<userId>` |
| Action | Native `<select>` from a static enum: `submission.approved`, `submission.rejected`, `submission.changes_requested`, `submission.applied`, `submission.notes_updated`, `submission.withdrawn` (W3 forward-compat), `role.changed` | `?action=<value>` |
| Target type | Native `<select>`: `submission`, `reciter`, `album`, `track`, `user` | `?targetType=<value>` |
| Date range | Two `<input type="date">` ("from", "to"), inclusive on both ends, interpreted in UTC, unbounded if empty | `?from=YYYY-MM-DD&to=YYYY-MM-DD` |

Submitting reloads the route (Server Component re-fetches with the
filtered query). Existing cursor pagination preserved per filter
combination.

`moderation.auditLog` extended:

```ts
.input(z.object({
  limit: z.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
  cursor: z.string().optional(),
  actor: z.string().min(1).max(128).optional(),
  action: z.string().min(1).max(64).optional(),
  targetType: z.enum(['submission','reciter','album','track','user']).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}))
```

Unrecognised actions just return zero rows (forward-safe).

**Expandable meta.** Each row gets a chevron toggle in the leftmost
column. Toggling renders a sub-row underneath with the `meta` jsonb as
a two-column key-value table — flat keys at first level, nested
objects rendered as JSON in `<pre>`. Toggle state is purely
client-side; reload collapses everything.

**A11y.** The filter strip is a `<form role="search">` so screen
readers announce it; each `<input>` has a visible label; Apply / Clear
are real `<button type="submit">` / `<button type="reset">`. Toggle
chevrons are `<button aria-expanded>` with `aria-controls` pointing at
the sub-row id.

### §5 — `/mod` dashboard stats

Three stat cards on `/mod`:

1. **Pending count.** Total submissions where
   `status IN ('pending','changes_requested')`. Links to `/mod/queue`.
   Card shows the number + subtitle "submissions awaiting review".
   When `0`, neutral colouring + "All caught up" subtitle.
2. **Last 7 days received.** Count of submissions where
   `createdAt >= now() - interval '7 days'`. Below the number, a
   7-bar inline sparkline showing per-day counts as plain CSS divs
   (no chart library). Each bar has `aria-label="<date>: <count>"`
   and the strip itself has a `<table class="sr-only">` mirror for
   assistive tech.
3. **Oldest pending.** Age of the oldest `pending` row in human
   format ("3 days old", "12 hours old", "Just now"). When there's
   nothing pending, card greys out with "No pending items".

Backed by one new procedure `moderation.dashboardStats()` returning
`{ pendingCount, last7DaysCount, last7DaysBuckets: number[7], oldestPendingHours: number | null }`.
One DB round trip — three small aggregates and a `min(createdAt)`.

Below the cards: the existing recent-activity audit-tail list
(last ten events) stays as-is.

### §6 — Public `/changes` feed

New public route `/changes`. No auth required.

**Data source.** `audit_log` filtered to
`action = 'submission.applied'`, joined to `submissions` (for `type`
and `targetId`), joined to the relevant entity table
(reciter / album / track) for display title + slug + avatar/artwork
URL, joined to `users` for the submitter's display name.

**Layout.** Day-grouped, newest first. Each day is a `<section>` with
a sticky-on-scroll heading ("Today", "Yesterday", "Apr 22, 2026") and
an `<ol>` of events for that day. Each event row renders:

- Entity avatar (reciter `avatarUrl` / album `artworkUrl` / track's
  album `artworkUrl`, ~48×48 rounded) — falls back to the existing
  `CoverArt` placeholder on null.
- Action verb derived from `submission.action`: "added a reciter" /
  "edited a reciter" / "added an album" / etc.
- Entity title as a link to its public page
  (`/reciters/<slug>`, `/reciters/<slug>/albums/<albumSlug>`, etc.).
- Submitter name (no link in V1 — the public contributor profile is
  W3).
- Relative + absolute timestamp.

**Pagination.** Cursor-based, same shape as the audit log. 20 events
per page. Client-side "Load more" component below the list.

**Server piece.** New `home.recentChanges({ limit, cursor })` tRPC
procedure (parallel to `home.getTopTracks` / `home.getRecentSaved`
shipped in Phase 2.3). One query joining
`audit_log → submissions → reciters/albums/tracks → users`. Returns a
flat `RecentChangeDTO[]` shaped like
`{ id, action, entityType, entityTitle, entitySlugPath, submitterName, avatarUrl, at }`.

**Indexing.** Add an index `audit_log_action_created_at_idx` on
`audit_log(action, created_at desc)` so the filter+sort hits a single
index. Tiny migration.

**Privacy.** Only `submission.applied` events surface. Internal
moderator actions (`role.changed`, `submission.notes_updated`, etc.)
never leak. Submitter name is the same name shown on contribution
counts in the future contributor profile (their public display name,
already shown to the world via Better Auth defaults). If a submitter
is ever anonymised post-hoc, the join falls back to "A contributor"
when `users.name` is null.

**Nav.** New top-level link "Recent changes" in the public header.
Exact placement settled in the implementation plan.

### §7 — Server changes summary

**Routers (extensions to existing files; no new router file):**

- `moderation.review` — fold canonical write into the `'approved'`
  branch. Reuses the existing slug pickers and lyrics-upsert loop.
- `moderation.applyApproved` — kept; downgraded to ops escape hatch.
  JSDoc updated.
- `moderation.setModeratorNotes({ submissionId, notes })` — new
  mutation. Writes `submissions.moderator_notes`, audits
  `submission.notes_updated`.
- `moderation.getReviewThread({ submissionId })` — new query.
- `moderation.searchUsers({ query, limit })` — new query,
  moderator-scoped, used by the actor-filter typeahead.
- `moderation.auditLog` — extend with `actor` / `action` /
  `targetType` / `from` / `to` filter params.
- `moderation.dashboardStats()` — new query.
- `submission.getMyReviewThread({ submissionId })` — new query, owner-only,
  reviewer names stripped.
- `home.recentChanges({ limit, cursor })` — new query for `/changes`.

**Migration (one):**

- Add index `audit_log_action_created_at_idx` on
  `audit_log(action, created_at desc)`.
- One-shot data fix:
  `update submissions set status = 'pending' where status = 'approved'`,
  delivered as `pnpm tsx scripts/reset-approved-submissions.ts` —
  not part of the migration file so it can be re-run idempotently.

**No schema additions.** `moderator_notes`, the `applied` /
`withdrawn` enum values, and `submission_reviews` all exist from W1.

**Pages affected:**

- `app/mod/page.tsx` — three-card stat grid + existing audit tail.
- `app/mod/queue/page.tsx` — unchanged.
- `app/mod/audit/page.tsx` — filter strip + expandable meta.
- `app/mod/submissions/[id]/page.tsx` — moderator notes textarea,
  Apply button removed, revision thread below diff.
- `app/(protected)/profile/contributions/[id]/page.tsx` — **new
  route.** The current `/profile/contributions/page.tsx` is a listing
  only; there is no per-submission view today. The new route renders
  the contributor's own submission detail (their own copy of the
  field-diff or preview, plus the reviewer-redacted revision thread).
  Linked from each row of the existing listing page.
- `app/changes/page.tsx` — new public route.
- Header nav — new "Recent changes" link.

**Components added:**

- `components/mod/moderator-notes.tsx` — debounced-save textarea +
  indicator.
- `components/mod/review-thread.tsx` — shared between mod and
  contributor views, role-conditional content.
- `components/mod/audit-filters.tsx` — the filter form.
- `components/mod/audit-row.tsx` — extracted from the inline
  component on the audit page; gains the expandable meta toggle.
- `components/mod/dashboard-stats.tsx` — three-card grid + sparkline.
- `components/changes/change-row.tsx` — public feed row.
- `components/changes/changes-day-section.tsx` — day grouping.

**Components removed:**

- `components/mod/apply-button.tsx` — no longer used in the UI;
  deleted.

### §8 — Tests

**tRPC (vitest, real DB via `./dev test`):**

- `moderation.review(approve)` happy path: review row + canonical
  entity + audit log + status='applied' written in one transaction.
- `moderation.review(approve)` slug collision: pre-seed an entity
  with slug `ali`. Submit a reciter create with name "Ali". Expect
  the picker to land on `ali-2`, status `applied`. (Regression net
  for the existing slug helper.)
- `moderation.review(approve)` FK violation: pre-seed an album-create
  submission targeting a `reciterId` that's then deleted. Expect
  rollback, submission still `pending`, no canonical row, no audit
  row.
- `moderation.review(approve)` for a track edit with lyrics: verify
  `lyrics` rows upserted in the same tx.
- `moderation.review(reject)` and `(changes_requested)` paths
  unchanged.
- `moderation.setModeratorNotes` happy path + authz.
- `moderation.getReviewThread` returns reviews chronologically with
  reviewer names; bookend rows present.
- `submission.getMyReviewThread` strips reviewer names; non-owner →
  403.
- `moderation.searchUsers` prefix + ilike; moderator-only.
- `moderation.auditLog` with each filter individually + combined;
  date range edge cases (inclusive on both ends, UTC).
- `moderation.dashboardStats` numeric correctness on empty + populated
  fixtures.
- `home.recentChanges` only surfaces `submission.applied` events;
  cursor pagination stable across days.

**Component tests (vitest + RTL):**

- `<ModeratorNotes />` debounced save fires once after multiple
  keystrokes; "Saved" indicator surfaces on success.
- `<ReviewThread />` renders rows in order; reviewer names hidden in
  contributor variant; bookends render.
- `<AuditFilters />` form roundtrips URL params correctly.
- `<DashboardStats />` sparkline renders 7 bars at correct relative
  heights.

**E2E (Playwright):**

- Approve-and-applies-immediately: contributor submits a reciter,
  moderator approves, the public reciter page resolves with the new
  slug on the next nav.
- Audit filter: load `/mod/audit?action=submission.applied&from=...`,
  expect the table to reflect the filter.
- Public `/changes`: after the approve E2E, navigate to `/changes`
  and confirm the new event appears in today's group.

## Out of scope (W3 / later)

Reminded explicitly because they're tempting to bundle:

- Withdraw pending submission (W3).
- Apply for contributor access + `/mod/access-requests` queue (W3).
- Resubmit-with-diff panel (W3).
- Moderator digest emails + in-app pending-count badge (W3).
- Public contributor profile + heatmap (W3).
- Server-side draft persistence — localStorage stays the source of
  truth.
- Markdown / rich text in moderator notes or review comments.

## Open implementation questions (deferred to plan phase)

1. Header nav placement for the "Recent changes" link — between
   "Browse" and the search icon vs. inside an overflow menu.
2. Submitter avatar in the `/changes` feed — the rebuild has no
   per-user avatar slot today. Probably defer to W3 where the
   contributor profile lands.
3. "Regenerate slug" moderator-only button on submission detail — the
   original Phase 2.4 spec parked this between W1 and W2. With merged
   approve+apply, landing it as a slug-collision recovery action
   becomes more useful. Tentatively in scope for the W2 plan;
   escalate to user if cost grows.
4. Audit `action` filter dropdown — static enum vs. distinct-on-DB.
   Static is simpler and forward-compatible; settle in plan.

## Refs

- [Contributor & Moderator Overhaul (parent spec)](./2026-04-23-contributor-moderator-overhaul-design.md)
- [Rebuild roadmap](./2026-04-21-rebuild-roadmap.md)
- W1 spec: same parent doc, §W1
- Phase 2.5 POC port: [`./2026-04-24-poc-design-port-design.md`](./2026-04-24-poc-design-port-design.md)
  — established the public `/changes` feed as W2's responsibility.
