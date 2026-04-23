# Contributor & Moderator Overhaul (Design)

**Status:** Design draft 2026-04-23 · Awaiting user review
**Author:** Asif (brainstormed with Claude)
**Scope:** End-to-end improvements to the contribution and moderation loop across three sequential workstreams.

## Context

The contribution → moderation loop shipped in M6 (phases 3–9, Feb–Mar 2026) and has been polished for a11y / theming / i18n. Architecturally it's complete: role-gated tRPC procedures (`contributorProcedure`, `moderatorProcedure`), `submissions` + `submission_reviews` + `audit_log` tables, submission detail page with field diff, apply-to-canonical step, user role management, and an audit log viewer.

In practice the experience feels thin on both sides:

- **Contributor forms are minimal.** Reciter accepts `name` + optional slug only. Album and track submission forms require the contributor to paste a **raw UUID** for the parent entity (`reciterId`, `albumId`). Artwork and audio are URL-only inputs — no upload affordance despite S3 presigned infra already existing for the avatar flow. Lyrics cannot be submitted at all, even though the `lyrics` table exists.
- **Moderate flow has an orphan bug.** Approve and Apply are two separate actions. If a moderator approves but doesn't click Apply in the same session, the submission leaves `/mod/queue` (which filters to `pending + changes_requested`) and becomes effectively invisible — only discoverable via URL memory or digging through the audit log.
- **Role promotion is manual.** No "apply for contributor access" flow; new contributors must be promoted by a moderator out of band.
- **No draft, no withdrawal, no revision thread, no internal moderator notes, no audit filters, no new-submission notifications.**

The DB schema for core entities is also thin — `reciters` has only `name` and `slug`; there is no `description`, `country`, `avatar`, or `arabicName`. Richer forms require a schema migration to back them.

## Goals

1. **Contribution forms feel like a real product.** Parent pickers (not UUIDs), upload widgets, auto-generated slugs, lyrics support, draft autosave, inline help.
2. **Moderation is one coherent action.** Approving applies to canonical tables in the same transaction; approved-but-unapplied drift becomes surfaced rather than orphaned.
3. **Moderator surface has discussion and history.** Internal moderator notes, revision thread derived from `submission_reviews`, filterable audit log.
4. **Contributor lifecycle is self-service.** Apply for contributor access, save drafts, withdraw pending submissions, see diff since rejection on resubmit, get batched notifications when a queue has work.

## Non-Goals

- **No rework of the public content pages.** Reciter / album / track / search pages are out of scope; this spec is about the contribute and `/mod` surfaces only.
- **No permissions redesign.** The three-role model (`user` / `contributor` / `moderator`) stays. Moderator remains the top role; admin-level actions are out of scope.
- **No realtime notifications, websockets, or push.** Digest email + in-app badge only for V1.
- **No Storybook coverage / visual regression suite** for new form components.
- **No migration of legacy moderator features** (draft-lyrics diff viewer, story moderation, etc.) — those remain excluded per the rebuild roadmap.
- **No server-side drafts in V1.** `localStorage` is sufficient.

## Hard constraint

**Users never enter slugs.** Slug is auto-generated from name/title by the server at apply time; contributors see a live preview under the name field while typing, but the field is read-only. On edit, slugs are frozen to preserve URL stability; a moderator-only "Regenerate slug" escape hatch is the only way to mutate an existing slug.

## Workstreams

Three sequential workstreams. Each ships its own PR series and has its own implementation plan.

| # | Name | Order | Why this order |
|---|---|---|---|
| W1 | Contribute forms | 1st | Biggest perceived lift for contributors; unlocks richer moderator diffs in W2. Contains the schema migration. |
| W2 | Moderation flow | 2nd | Fixes the approve/apply orphan bug; adds discussion surface that benefits from W1's richer data. |
| W3 | Contributor lifecycle | 3rd | Acquisition and retention; only pays off once the core loop feels good. |

Each workstream is described in its own section below.

---

## §0 — Shared foundation (delivered in W1)

### Schema migrations

**`reciters` — add columns:**
- `description` (`text`, nullable) — short bio, 500 char limit enforced at app layer.
- `country` (`text`, nullable) — ISO-3166-1 alpha-2 code (e.g. `IQ`, `IR`, `PK`). Free-text fallback accepted server-side for now; UI uses a dropdown sourced from a static ISO list.
- `avatar_url` (`text`, nullable) — S3 URL, populated via presigned upload.
- `birth_year` (`integer`, nullable) — 4-digit year, app-validated (1800 ≤ year ≤ current).
- `arabic_name` (`text`, nullable) — Arabic-script rendering of the reciter's name.

**`albums` — add column:**
- `description` (`text`, nullable) — album-level notes. 1,000 char limit.

**`tracks` — no new columns.** Lyrics live in the existing `lyrics` table (row per language).

**`submissions` — modify:**
- Add `moderator_notes` (`text`, nullable) — internal notes from moderators, never sent to the contributor. Distinct from the existing `notes` (submitter-facing).
- Extend `status` enum to include `'withdrawn'`. Existing values (`draft`, `pending`, `approved`, `rejected`, `changes_requested`) retained.

**`access_requests` — new table:**
```
id              uuid primary key default gen_random_uuid()
user_id         uuid not null references users(id) on delete cascade
reason          text  -- optional free-text from applicant
status          text not null default 'pending'  -- pending | approved | rejected
reviewed_by     uuid references users(id)  -- moderator who decided
review_comment  text
created_at      timestamptz not null default now()
updated_at      timestamptz not null default now()
unique (user_id) where status = 'pending'  -- one pending request per user
```
Separate from `submissions` because the payload shape and lifecycle are different enough that shoehorning would be more work than a clean table.

All migrations generated via Drizzle `drizzle-kit generate` and applied via `./dev migrate`. Backfill is trivial — all new columns are nullable; the new enum value and table are additive.

### Auto-slug behaviour

Canonical helper in `apps/web/src/server/routers/moderation.ts:18` already exists: `slugify(text)`.

**Create path:**
1. On form submit, server computes `candidate = slugify(name || title)`.
2. Apply step queries the target table (`reciters` globally, `albums` scoped to `reciter_id`, `tracks` scoped to `album_id`) for existing slugs matching `candidate` and `candidate-\d+`.
3. Picks the lowest free integer suffix: `candidate`, `candidate-2`, `candidate-3`, …
4. Writes canonical row with that slug.

**Preview:** while the contributor types the name, a read-only "URL will be: `/reciters/ali-akbar`" line appears under the input. The preview is computed client-side (same `slugify`) and deliberately does NOT show the collision suffix — the suffix is determined at apply time and may change depending on what's been approved in between. Copy clarifies this: "Final URL may add a number suffix if the slug is taken."

**Edit path:** slug is not regenerated. Moderator-only "Regenerate slug" button exists on `/mod/submissions/[id]` for the rare case a rename should change the URL.

### Upload approach

Reuse the S3 presigned pattern already in `apps/web/src/lib/storage.ts` (MinIO in dev, S3-compatible in prod). Two new API routes:

- `POST /api/uploads/image` — multipart, field `file`. Role-gated to `contributor+`. Validates MIME (`image/jpeg`, `image/png`, `image/webp`), size ≤ 5 MB. Uploads to `BUCKET_IMAGES`. Returns `{ url, key }`.
- `POST /api/uploads/audio` — multipart, field `file`. Role-gated to `contributor+`. Validates MIME (`audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/ogg`), size ≤ 50 MB. Uploads to `BUCKET_AUDIO`. Returns `{ url, key, duration }` (duration extracted server-side via `ffprobe` or `music-metadata`).

Forms store the returned `url` in submission data. Canonical entity writes the same URL on apply.

---

## §1 — W1: Contribute forms

### Reciter form

| Field | Required | Control |
|---|---|---|
| Name | yes | Text |
| Arabic name | no | Text (RTL hint) |
| Country | no | Dropdown (ISO-3166-1 alpha-2 list) |
| Birth year | no | Number (1800 → current) |
| Description | no | Textarea (500 char counter) |
| Avatar | no | Image upload via `POST /api/uploads/image` |
| Slug | — | **Removed from UI. Preview only under name field.** |

### Album form

| Field | Required | Control |
|---|---|---|
| Reciter | yes | **Parent picker — typeahead combobox** querying existing reciters by name. Displays reciter avatar + name. Required. Keyboard-navigable. |
| Title | yes | Text |
| Year | no | Number (1900 → current) |
| Description | no | Textarea (1000 char counter) |
| Artwork | no | Image upload via `POST /api/uploads/image` |
| Slug | — | **Removed from UI. Preview only under title field.** |

### Track form

| Field | Required | Control |
|---|---|---|
| Album | yes | **Parent picker — single combobox with results grouped by reciter.** E.g.: `Reciter A → Album 1`, `Reciter A → Album 2`, `Reciter B → Album 3`. Keyboard-navigable. |
| Title | yes | Text |
| Track number | no | Number (≥ 1) |
| Audio | no | Audio upload via `POST /api/uploads/audio`. On success, fills `audioUrl` and pre-fills `duration` from probe. Contributor can override duration. |
| YouTube ID | no | Text (11 chars) |
| Duration | no | Number (seconds; auto-filled from upload) |
| Slug | — | **Removed from UI. Preview only under title field.** |
| Lyrics | no | **New tabbed subform** — see below. |

### Lyrics subform (inside Track form)

Tabbed UI. Tabs: **English** / **Arabic** / **Urdu** / **Transliteration**. Each tab contains:
- Large textarea (monospace toggle).
- Character counter.
- RTL rendering for Arabic and Urdu tabs.

On submit, any tab with non-empty content produces a row in the `lyrics` table, keyed by `(track_id, language)`. Empty tabs produce no row. On apply for a track edit, existing lyrics rows are upserted by language; tabs cleared to empty result in the row being deleted.

**Submission data storage:** lyrics go into the `data` jsonb as `data.lyrics = { [language: string]: string }`. The submission schema extends the existing `trackDataSchema` with an optional `lyrics` key. Apply step writes to `lyrics` table in the same transaction as the `tracks` upsert.

### Parent picker component

New shared component `apps/web/src/components/contribute/parent-picker.tsx` backed by new tRPC procedures `contribute.searchReciters({ query })` and `contribute.searchAlbums({ query })`. Each returns top 20 matches by prefix + fuzzy on name/title. Debounced client-side (200 ms). Used by album form (reciter picker) and track form (album picker).

### Draft autosave

- Keyed by `{ formType, action, targetId }`.
- Serialised to `localStorage` on every field change, debounced 500 ms.
- TTL: 7 days. On form mount, if a draft exists, banner appears: "Restore unsaved draft from 3 days ago? [Restore] [Discard]".
- Cleared on successful submit.

### Unsaved-changes guard

`beforeunload` listener active whenever form state differs from initial values (or from the draft if restored). Standard browser prompt; no custom modal.

### Field help

Every field gets a one-sentence hint rendered under the input, sourced from `messages/<locale>/contribute.json`. Example: "Optional. Short biographical note shown on the reciter's profile page."

### Server-side changes for W1

- **Schema:** migrations for new columns on `reciters`, `albums`, `submissions`; new `access_requests` table (used in W3 but cheap to include here).
- **Zod schemas:** extend `reciterDataSchema`, `albumDataSchema`, `trackDataSchema` in `apps/web/src/server/routers/submission.ts` to accept the new optional fields.
- **Apply step:** update `moderation.applyApproved` to write the new fields on insert/update; add lyrics upsert for track apply.
- **New tRPC:** `contribute.searchReciters`, `contribute.searchAlbums`.
- **New API routes:** `POST /api/uploads/image`, `POST /api/uploads/audio`.

### Tests

- tRPC: extend existing `submission.test.ts` with new-field validation and lyrics payload shape.
- tRPC: extend `moderation.test.ts` with apply-writes-new-fields + lyrics upsert.
- E2E: one happy-path test per form (Playwright) covering parent picker → upload → submit → visible on queue.
- Unit: `slugify` collision suffix logic.

---

## §2 — W2: Moderation flow

### Merge approve + apply

**Default path:** `moderation.review` with `action='approved'` runs review-row insert + status update + **canonical write + audit log** in a single transaction. Status transitions `pending → approved` and the entity is live immediately.

**On canonical-write failure inside the transaction:**
- Unique-violation on slug: transaction rolls back. Moderator sees "Slug `ali-akbar` already exists. Try a different name or click Regenerate slug."
- Foreign-key violation (e.g., reciter was deleted between submission and approval): transaction rolls back. Moderator sees "Parent reciter no longer exists — reject this submission instead." Status stays `pending`.
- Any other DB error: transaction rolls back, generic error surfaced with `support_id` (the audit log row isn't written; we log to stderr for ops).

**Escape hatch — `applyApproved` retained:**
- Kept in the router for backfill of any legacy approved-but-unapplied submissions and for a manual retry path.
- Not exposed as a primary action. The submission detail page no longer shows an "Apply" button by default.

**Awaiting-apply tab:**
- `/mod/queue` gains a tab switcher: **Pending** (default, existing behaviour) / **Awaiting apply**.
- "Awaiting apply" shows submissions where `status='approved'` AND no canonical entity corresponds to `targetId` (for edits) / no row exists matching the submitted slug under the same parent (for creates). Computed via left join.
- Expected to be empty in steady state once merged approve+apply ships. Serves as a drift alarm.

### Internal moderator notes

New column `submissions.moderator_notes` (text, nullable). Rendered on `/mod/submissions/[id]` above the review actions as an editable textarea with "Save notes" button, visible only when role is `moderator`. Writes via new tRPC `moderation.setModeratorNotes({ submissionId, notes })`. Not shown to the submitter on `/profile/contributions`.

### Revision thread

On `/mod/submissions/[id]`, below the field diff, render all `submission_reviews` rows in chronological order as a thread:
- Reviewer name + role badge
- Action badge (approved / rejected / changes_requested)
- Comment (if any)
- Relative + absolute timestamp

Replaces the current "only latest status is shown" approach. Adds context when multiple rounds happened.

### Audit log filters

Add query params to `/mod/audit`:
- `?actor=<userId>` — user picker, typeahead on name/email.
- `?action=<enum>` — dropdown of all distinct values (`submission.approved`, `role.changed`, etc.).
- `?targetType=<enum>` — dropdown: `submission`, `reciter`, `album`, `track`, `user`.
- `?from=<date>&to=<date>` — date range picker.

All filters combined with AND. tRPC procedure `moderation.auditLog` extended to accept these params; existing pagination cursor semantics unchanged.

Each row in the audit list becomes expandable — clicking reveals the full `meta` jsonb rendered as a key-value table.

### Dashboard

`/mod` top cards, replacing / extending the current counts:
1. **Pending count** — links to `/mod/queue?tab=pending`.
2. **Awaiting apply count** — links to `/mod/queue?tab=awaiting-apply`. Highlighted if > 0.
3. **Last 7 days** — submissions received (tiny inline bar chart rendered as a row of CSS divs — no chart library).
4. **Oldest pending** — age of oldest pending submission ("3 days old").

Below cards: the existing recent audit-log tail stays.

### Server-side changes for W2

- **Schema:** `submissions.moderator_notes` added (part of W1 migration).
- **Router:** merge apply logic into `moderation.review` when `action='approved'`; `applyApproved` retained.
- **Router:** new `moderation.setModeratorNotes`.
- **Router:** `moderation.auditLog` accepts filter params.
- **Router:** `moderation.queue` accepts `tab=awaiting-apply` variant.
- **Router:** new `moderation.dashboardStats` returning the four dashboard numbers.

### Tests

- tRPC: `moderation.review(approve)` writes canonical row in one transaction.
- tRPC: failure-mode tests — slug collision rollback, FK violation rollback.
- tRPC: `awaiting-apply` filter returns only orphaned approved submissions.
- tRPC: audit filter params.
- E2E: approve-and-applies-immediately happy path.

---

## §3 — W3: Contributor lifecycle

### Apply for contributor access

**Applicant side:**
- A logged-in user with role=`user` visiting `/contribute` sees an "Apply to contribute" CTA (replaces the current access-denied page).
- CTA opens a small form: reason (optional textarea, 500 char limit) + submit button.
- Submit creates an `access_requests` row via new tRPC `access.requestContributor({ reason })`. Status `pending`.
- Post-submit UI: "Your request has been sent. You'll get an email when it's reviewed." Persistent across refreshes by checking for an existing pending request.

**Moderator side:**
- New route `/mod/access-requests` — paginated list of requests, filterable by status.
- Each row: applicant name/email, reason excerpt, date. Click-through to detail.
- Detail page shows full reason + applicant's submission history (none expected for `user` role but useful to show nothing). Actions: **Approve** (promotes via existing `moderation.setRole` + marks request `approved`) and **Reject** (with comment, marks `rejected`).
- Audit log entry written on both outcomes (`access_request.approved` / `access_request.rejected`).

**Emails:**
- Approved → "You're a contributor" email with a link to `/contribute`.
- Rejected → "Your contributor application" email with moderator's comment.

### Withdraw pending submission

- New tRPC `submission.withdraw({ submissionId })`. Only callable by the submitter on their own submission. Only valid when status is `pending` or `changes_requested`.
- Action: sets `status='withdrawn'`, writes audit log entry `submission.withdrawn`.
- UI: `/profile/contributions` row with eligible status shows a "Withdraw" button with a confirmation dialog.
- Queue filter (`pending + changes_requested`) excludes `withdrawn` by default. Withdrawn submissions remain visible in the submitter's history as a read-only record.

### Resubmit with diff-since-rejection

- When a submission is `changes_requested` and the contributor clicks "Resubmit" on `/profile/contributions`, the form is pre-filled with the last submitted values.
- Above the form, render a collapsible "What changed from your last submission?" panel showing side-by-side diff of previous-values vs. current-form-state. Updates live as the contributor edits.
- Also show the moderator's `comment` from the most recent `submission_reviews` row, highlighted.

### Moderator notifications

**Digest email:**
- Triggered no more than once per hour per moderator.
- Condition: moderator has `moderator` role AND `pending + changes_requested > 0` AND at least one submission has arrived since the moderator's last digest send.
- Content: count of pending items, oldest-pending age, link to `/mod/queue`.
- Implementation: scheduled job (existing cron infra assumed, or a lightweight interval check in the API layer — **⚡ open for plan phase**; email side is fire-and-forget via existing `sendEmail` helper).

**In-app badge:**
- On the "Moderator Dashboard" nav link (existing in `user-menu.tsx`), render a small red-circle badge with the pending count when it's > 0.
- Count fetched via a lightweight tRPC query (`moderation.pendingCount`) cached for 30 s client-side.

### Server-side changes for W3

- **Schema:** `access_requests` table (landed in W1's migration).
- **Router:** new `access` router with `requestContributor`, `getMyRequest` (for applicant check), `list`, `review` (moderator-only).
- **Router:** `submission.withdraw`.
- **Router:** `moderation.pendingCount`.
- **Job:** moderator digest email scheduler.
- **Emails:** `sendContributorApproved`, `sendContributorRejected`, `sendModeratorDigest`.

### Tests

- tRPC: happy path for each new procedure + authz failure modes (non-moderator cannot review requests; non-owner cannot withdraw).
- E2E: apply → approve → log in as user → see contribute access.
- E2E: submit → moderator requests changes → resubmit with diff panel visible.

---

## §4 — Rollout plan

| Workstream | Schema change? | Breaks existing flows? | Est. PR count |
|---|---|---|---|
| W1 | Yes — adds columns to `reciters`, `albums`, `submissions`; new `access_requests` table | No — new fields are optional, existing forms widen to accept them, existing rows remain valid | 4–6 (migration, uploads, forms, pickers, drafts) |
| W2 | No (notes column lands in W1) | Yes — the approve-only-then-apply flow is retired in the UI; moderators no longer click two buttons. Backfill: any existing approved-but-unapplied rows show up in the new "Awaiting apply" tab for one-time cleanup | 3–4 (merge logic, notes, thread, audit filters, dashboard) |
| W3 | No (`access_requests` lands in W1) | No — purely additive | 3–4 (access request flow, withdraw, diff, notifications) |

Each workstream gets its own implementation plan written via the `writing-plans` skill. W1's plan is the immediate follow-up to this spec's approval.

## Open implementation questions (deferred to planning)

1. Scheduled-job infrastructure for the moderator digest email — does existing cron infra exist, or should it be a lightweight periodic check in an existing cron runner?
2. `ffprobe` vs `music-metadata` for server-side audio duration extraction — both workable; choose at plan phase based on dependency weight.
3. Whether the "Regenerate slug" moderator-only button ships in W1 (small addition) or W2 (part of moderation polish).
4. Whether lyrics updates on an already-approved track go through a separate lightweight submission flow or piggyback on the track edit flow — leaning piggyback for V1.
