# Phase 2.4 W3 — Contributor Lifecycle (Design)

**Status:** Design draft 2026-04-25 · Awaiting user review
**Author:** Asif (brainstormed with Claude)
**Scope:** Third of three workstreams from the
[Contributor & Moderator Overhaul](./2026-04-23-contributor-moderator-overhaul-design.md)
spec. Focuses on the user-facing lifecycle around becoming and being a
contributor: applying for access, withdrawing in-flight work, resubmitting
with reviewer feedback in context, the moderator nudge that closes the
loop, and the deferred Phase 2.5 POC surfaces (public profile, heatmap,
contributor dashboard).

## Context

W1 shipped 2026-04-23 with the rewritten contribute forms and the
`access_requests` table reserved for W3. W2 shipped 2026-04-25 with the
merged approve+apply moderator flow, internal notes, review thread, audit
filters, dashboard, and the public `/changes` feed.

The remaining gap is the **contributor's** half of that loop. Today:

- Anyone with role=`user` who lands on `/contribute` sees a passive
  "Apply for Contributor Access" message with no actionable CTA. There is
  no application form, no moderator queue for applications, no
  approve/reject workflow on top of the `access_requests` table that W1
  shipped.
- Submissions cannot be withdrawn. Once submitted, a contributor's only
  exit is to wait for moderator rejection. The `withdrawn` status is
  reserved on the enum but no procedure or UI flips to it.
- When a moderator requests changes, the contributor sees a status badge
  flip to `changes_requested` and the comment shows up in the review
  thread on the detail page — but the **edit form** they navigate to to
  fix the issue has no awareness of the feedback. They have to flip
  between two pages to know what to change.
- Moderators have no out-of-band nudge. New submissions and access
  requests pile up silently until a moderator happens to open the app.
  The pending-count is visible on `/mod` but only after navigating there.
- The public catalogue has no contributor-attribution surface. The POC
  shipped a `/contributor/[slug]` profile, contribution heatmap, and
  contributor `/dashboard` — none of which exist in the rebuild yet.

This spec covers all of that. After W3 ships, the W1+W2+W3 trio
constitutes the full contribute / moderate / surface loop the rebuild
needed to close before launch.

## Goals

1. **Self-service contributor onboarding.** A signed-in user can apply
   for contributor access, track the application's status, and withdraw
   it. Moderators triage applications from a dedicated queue.
2. **Reversible contributions.** Contributors can withdraw their own
   pending or changes-requested submissions. Once applied, withdrawal is
   no longer available.
3. **Feedback in context.** When a moderator requests changes, the
   contributor's edit form surfaces the feedback inline plus a diff of
   what's currently in the submission, so they fix the issue without
   page-flipping.
4. **Out-of-band moderator nudge.** A throttled hourly digest emails
   moderators when there are new pending submissions or access requests,
   so the queue gets attention even when nobody happens to open the app.
   In-app, a pending-count badge on the main nav and per-tab on `/mod`
   sub-nav makes the work visible at a glance.
5. **Public contributor identity.** Every contributor gets a public
   `/contributor/[username]` profile with a year-long contribution
   heatmap, plus a private `/dashboard` with their stats and submission
   history. Both are ports of the Phase 2.5 POC, deferred from that
   phase as W3 scope.

## Non-Goals

- **No trust-level automation.** A `trust_level` enum column lands on
  `users` (default `new`) and renders as a pill on the public profile +
  dashboard, but the *criteria* for promotion (`new` → `regular` →
  `trusted` → `maintainer`) are deferred to a roadmap follow-up. For W3,
  trust level is set manually via DB only — no `/mod/users` surface.
- **No "Most Needed" sidebar on dashboard.** The POC ships a static
  card with translation/lyrics/metadata counts; deriving those at
  runtime is its own research question. Drop for W3.
- **No "Total Plays" stat on profile.** The POC shows it; we don't track
  per-contributor listening telemetry today and adding it is a
  data-pipeline workstream of its own. Drop for W3.
- **No multi-year heatmap.** Default current year only, no year picker.
- **No username rename post-signup.** Username locked at signup; rename
  via DB script if needed. Self-service rename is a future feature.
- **No email digest unsubscribe / preferences.** Moderators are a closed
  admin-managed set; no per-moderator opt-out.
- **No public contributor leaderboard / `/contributors` listing.** The
  individual profile route ships; a directory is a future feature.

## Design

### §1 — Schema deltas

Migration `0012_w3_contributor_lifecycle.sql` lands six column additions
across three tables and two new partial indexes. No DROP statements; no
data destructive changes. No backfill via migration — populating
`username` for existing users is a one-shot script (`scripts/backfill-
usernames.ts`) consistent with the project's "we'll repopulate, no
production yet" stance.

#### `users` (3 new columns)

```sql
ALTER TABLE users ADD COLUMN username text;
ALTER TABLE users ADD COLUMN trust_level text NOT NULL DEFAULT 'new';
ALTER TABLE users ADD COLUMN bio text;

CREATE UNIQUE INDEX users_username_idx ON users (lower(username));
```

- `username` is **nullable** at the column level so the migration is
  non-destructive on dev/staging data, but **required** at signup time
  via the better-auth signup hook + a Zod validator. The case-insensitive
  unique index is the canonical collision check.
- `trust_level` is `text` with the Zod-enforced enum
  `'new' | 'regular' | 'trusted' | 'maintainer'`. Default `'new'`. No
  auto-population in W3.
- `bio` is optional free-text shown only on the public profile.

#### `access_requests` (3 new columns + 1 new index)

```sql
ALTER TABLE access_requests ADD COLUMN withdrawn_at timestamptz;
ALTER TABLE access_requests ADD COLUMN reviewed_at timestamptz;
ALTER TABLE access_requests ADD COLUMN notified_at timestamptz;

CREATE INDEX access_requests_pending_unnotified_idx
  ON access_requests (created_at)
  WHERE status = 'pending' AND notified_at IS NULL;
```

- `status` enum widens from `'pending' | 'approved' | 'rejected'` to
  include `'withdrawn'`. No DDL change — the column is `text`; only the
  Zod validator updates.
- `reviewed_at` mirrors `submission_reviews.created_at` semantics so we
  don't pollute `updated_at` (which would also bump on `notified_at`
  writes).
- `notified_at` is the digest-cron idempotency primitive.
- The partial index keeps the cron's "pending and unnotified" query a
  single index scan; the index only contains rows the cron cares about.

#### `submissions` (1 new column + 1 new index)

```sql
ALTER TABLE submissions ADD COLUMN notified_at timestamptz;

CREATE INDEX submissions_pending_unnotified_idx
  ON submissions (created_at)
  WHERE status = 'pending' AND notified_at IS NULL;
```

Same digest-dedup rationale as access_requests.

#### `@nawhas/types` shared constants

```ts
export const ACCESS_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const
export const TRUST_LEVELS = ['new', 'regular', 'trusted', 'maintainer'] as const
export type AccessRequestStatus = typeof ACCESS_REQUEST_STATUSES[number]
export type TrustLevel = typeof TRUST_LEVELS[number]
```

New DTOs: `AccessRequestDTO`, `ContributorProfileDTO`,
`ContributorHeatmapBucketDTO`, `ContributorDashboardStatsDTO`,
`ResubmitContextDTO`. UI imports DTOs only — never raw query shapes.

### §2 — Server: `accessRequests` router (new)

`apps/web/src/server/routers/accessRequests.ts`. Mounted on the app
router as `accessRequests.*`.

| Procedure | Auth | Input | Output | Behaviour |
|---|---|---|---|---|
| `apply` | `protectedProcedure`, role≠`contributor/moderator/admin` | `{ reason: string \| null }` (max 1000 chars) | `{ id }` | INSERT row with status `pending`. The W1-shipped partial unique index `(user_id) WHERE status = 'pending'` enforces one-pending-per-user; on conflict throw `CONFLICT` mapped to a friendly message. |
| `withdrawMine` | `protectedProcedure`, owner-scoped | `{ id }` | `{ ok: true }` | Verifies caller owns row and status is `pending`. UPDATE `status='withdrawn'`, `withdrawn_at=now()`. Audit log: `access_request.withdrawn`. |
| `getMine` | `protectedProcedure` | none | `AccessRequestDTO \| null` | Returns most-recent application for the caller (any status). Powers the access-denied / pending / rejected variants on `/contribute` and `/contribute/apply`. |
| `queue` | `moderatorProcedure` | `{ limit: 20, cursor?: string, status?: 'pending' \| 'all' }` | cursor-paginated list | Same `encodeCursor(createdAt, id)` pattern as `moderation.queue`. Default `status='pending'`. |
| `review` | `moderatorProcedure` | `{ id, action: 'approved' \| 'rejected', comment?: string }` | `{ ok: true }` | Single transaction: UPDATE `access_requests` (status, `reviewed_by=caller`, `reviewed_at=now()`, `review_comment`); if `approved` also UPDATE `users.role='contributor'`; INSERT audit row (`access_request.approved` or `access_request.rejected`, target=user). After tx commit: send email to applicant via existing `email.ts` transport. |

Errors mapped to standard tRPC codes: `UNAUTHORIZED` (no session),
`FORBIDDEN` (wrong role / not owner), `NOT_FOUND` (id not in table),
`CONFLICT` (duplicate pending), `BAD_REQUEST` (illegal status
transition).

### §3 — Server: `submission` router additions

`apps/web/src/server/routers/submission.ts` (extend).

| Procedure | Auth | Input | Output | Behaviour |
|---|---|---|---|---|
| `withdrawMine` | `protectedProcedure`, owner-scoped | `{ id }` | `{ ok: true }` | Verifies caller owns row and status ∈ `{pending, changes_requested}`. UPDATE `status='withdrawn'`. Audit log: `submission.withdrawn`. No email — contributor-initiated, they know. |
| `getResubmitContext` | `protectedProcedure`, owner-scoped | `{ id }` | `{ priorData: SubmissionPayload, lastReviewComment: string \| null, lastReviewedAt: Date }` | Returns `submissions.data` jsonb + the most recent `submission_reviews` row's `comment` and `created_at`. Used by `<ChangesRequestedBanner>` to drive the diff panel on edit forms. Throws if status ≠ `changes_requested`. |

The status-transition matrix on `submissions` after W3:

```
draft → pending      (existing: submission.create)
pending → applied    (existing: moderation.review approve, W2)
pending → changes_requested  (existing: moderation.review changes_requested)
pending → rejected   (existing: moderation.review reject)
pending → withdrawn  (NEW: submission.withdrawMine)
changes_requested → pending     (existing: submission.update)
changes_requested → withdrawn   (NEW: submission.withdrawMine)
```

`applied`, `rejected`, `withdrawn` are terminal states.

### §4 — Server: `moderation` router additions

`apps/web/src/server/routers/moderation.ts` (extend).

| Procedure | Change | Notes |
|---|---|---|
| `dashboardStats` | Returns one extra field: `pendingAccessRequestsCount`. The 4 existing submission stats stay unchanged. | One additional `count(*)` query in the existing parallel-fetch. |
| `pendingCounts` | **New.** Returns `{ submissions: number, accessRequests: number }`. | Lighter than `dashboardStats`; called from every moderator nav render. Server component reads it directly via React `cache()` so layout + sub-nav share one DB hit per request. |

### §5 — Server: public profile + heatmap

`apps/web/src/server/routers/home.ts` (extend).

| Procedure | Auth | Input | Output | Behaviour |
|---|---|---|---|---|
| `contributorProfile` | `publicProcedure` | `{ username }` | `ContributorProfileDTO \| null` | Case-insensitive lookup against `users.username`. Joins computed stats: total submissions, approved (count of status=`applied`), pending (count of status ∈ `{pending, changes_requested}`), approval rate (`approved / (total - withdrawn)`, denominator excludes self-cancellations). Returns `null` for unknown username (route renders 404). |
| `contributorHeatmap` | `publicProcedure` | `{ username, year?: number }` (default current year) | `Array<ContributorHeatmapBucketDTO>` (`{ date: 'YYYY-MM-DD', count: number }`) | Aggregates submissions by `created_at::date` for that user, in that year. **Returned dense** — only days where `count > 0`. UI fills the year-grid client-side; most contributors have most days empty so transmitting 365 zeros is wasteful. |

### §6 — Server: dashboard router (new)

`apps/web/src/server/routers/dashboard.ts`. Mounted as `dashboard.*`.

| Procedure | Auth | Input | Output | Behaviour |
|---|---|---|---|---|
| `mine` | `protectedProcedure` | none | `ContributorDashboardStatsDTO` | Owner-scoped stats: `{ total, approved, pending, withdrawn, approvalRate, last4WeeksBuckets: number[] }`. Approval-rate denominator excludes withdrawn. Sparkline pattern reuses the bucket-query SQL from W2's `moderation.dashboardStats`. |

The dashboard's submission list reuses the existing
`submission.myHistory(limit, cursor, status?)` — only addition is an
optional `status` filter parameter to support the All / Pending /
Approved tabs.

### §7 — Cron job: send-moderator-digest

**Script:** `apps/web/scripts/send-moderator-digest.ts`. Mirrors
`reset-approved-submissions.ts` shape (script reuses the web app's
shared db client + env config).

```
1. SELECT submissions where status = 'pending' AND notified_at IS NULL
   ORDER BY created_at LIMIT 100
2. SELECT access_requests where status = 'pending' AND notified_at IS NULL
   ORDER BY created_at LIMIT 100
3. If both empty → exit 0 (no-op).
4. SELECT users where role IN ('moderator', 'admin')
5. For each moderator → sendModeratorDigest(to, { newSubmissions, newAccessRequests })
6. UPDATE submissions and access_requests SET notified_at = now() in one tx
   WHERE id IN (...) (only for the rows we just included in the digest).
```

**Idempotency.** The `notified_at IS NULL` filter + the post-send UPDATE
delivers at-least-once: a crash between send and UPDATE re-emails the
same items on the next run. This trade beats silent drops. The 100-row
LIMIT bounds the worst-case re-send blast under a freak crash loop.

**Helm chart.** New `deploy/helm/nawhas/templates/digest-cronjob.yaml`,
schedule `"0 * * * *"` (top of every hour), reuses the web image,
mounts the same env-vars secret, `concurrencyPolicy: Forbid`,
`successfulJobsHistoryLimit: 3`, `failedJobsHistoryLimit: 3`. Toggle via
`.Values.digestCronjob.enabled` (default `true`); staging values can
flip to `false` to keep MailHog quiet.

**Email helper.** New export in `apps/web/src/lib/email.ts`:
`sendModeratorDigest(to, payload)`. Subject:
`Nawhas moderation: N new items pending review`. Body lists each
submission and access-request as a row with deep links to `/mod/queue`
or `/mod/access-requests/[id]`. Fire-and-forget on per-recipient send
errors (logged), so one bad address doesn't block the rest.

### §8 — UI: new routes

#### `/contribute/apply`

Server component:

- Auth-gated: unauthenticated → redirect `/login?callbackUrl=/contribute/apply`.
- Role-gated: role ∈ `{contributor, moderator, admin}` → redirect
  `/contribute`.
- Calls `accessRequests.getMine()` server-side.
  - Existing `pending` row → render "Your application is pending review"
    panel with submission timestamp + **Withdraw** button.
  - Existing `rejected` row → render rejection comment + age + "Apply
    again" CTA that toggles the form into view.
  - Existing `approved` row → unreachable (role-gated above).
  - No row → render the form.

Client form: textarea for `reason` (optional, char counter, 1000-char
cap), submit button. On success → toast + redirect `/contribute` (which
now shows the "pending" panel via the same `getMine` call).

#### `/mod/access-requests`

Two-column layout, parallel to `/mod/queue`:

- **Left column** — paginated list (newest first) of rows with default
  filter `pending`. Each row: applicant `name`, email, `reason` snippet
  (3 lines, ellipsis), age. Filter strip at top mirroring the W2
  `<AuditFilters>` pattern: status dropdown (`pending` / `all` /
  `approved` / `rejected`).
- **Right column** — detail of the selected row: full reason, applicant
  hero (signup date, email, account age, prior applications if any),
  **Approve** + **Reject** buttons. Reject opens a comment textarea
  (required for reject).

Detail route `/mod/access-requests/[id]` available for direct linking
from the digest email.

#### `/contributor/[username]`

Public, server-rendered. Calls `home.contributorProfile({ username })`
in parallel with `home.contributorHeatmap({ username })`. 404 on null
profile.

Layout (POC port, restyled to rebuild tokens — red/zinc accent, not
POC's accent which Phase 2.5 already migrated):

```
┌────────────────────────────────────────────────────────────┐
│ ┌──────┐  Name (Fraunces, 40px)                            │
│ │      │  @username (text-dim, 16px)                       │
│ │ AVT  │  Bio paragraph (max 600px)                        │
│ │ 200  │  N total · N approved · N% approval rate          │
│ └──────┘  [TrustLevelPill]                                 │
├────────────────────────────────────────────────────────────┤
│ Contribution Activity                                       │
│ ┌────────────────────────────────────────────────────────┐ │
│ │  S M T W T F S    [52w × 7d heatmap]                   │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐                           │
│ │ Total  │ │Approved│ │Pending │                           │
│ └────────┘ └────────┘ └────────┘                           │
├────────────────────────────────────────────────────────────┤
│ Badges                                                      │
│ [⭐ Maintainer] [✓ Trusted] [🏆 100+ Contributions]        │
└────────────────────────────────────────────────────────────┘
```

POC's "Total Plays" stat dropped (per non-goals). Badges row derived
from `trust_level` + total submission count, no separate badge table.

#### `/dashboard`

Authenticated, under existing `(protected)` layout group. Replaces
`/profile/contributions` (list page). The detail route
`/profile/contributions/[id]` stays — linked from dashboard rows.

```
┌────────────────────────────────────────────────────┐
│ Hero card: avatar + name + @username + trust pill │
├──────────────────────────────────────┬─────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │ Quick      │
│ │Total │ │Apprvd│ │Pendng│ │ Rate │  │ Actions    │
│ └──────┘ └──────┘ └──────┘ └──────┘  │ ──────────  │
│                                       │ + New      │
│ All  Pending  Approved                │   Submission│
│ ──── ──────  ──────                  │ View Profile│
│                                       │             │
│ ┌─────────────────────────────────┐   │             │
│ │ submission row...               │   │             │
│ │ submission row...               │   │             │
│ │ submission row...               │   │             │
│ └─────────────────────────────────┘   │             │
└──────────────────────────────────────┴─────────────┘
```

POC's "Most Needed" sidebar card dropped (per non-goals). Quick Actions
links: **New Submission** → `/contribute`; **View Profile** →
`/contributor/<username>`.

The `(protected)` layout's user menu link "My contributions" repoints
to `/dashboard`.

### §9 — UI: restyled + extended surfaces

#### `/contribute` access-denied screen

`apps/web/app/contribute/layout.tsx` lines 36-61. Replace the passive
"Apply for Contributor Access" info box with active CTAs driven by
`accessRequests.getMine()`:

- No row → `<Button asChild><Link href="/contribute/apply">Apply for
  contributor access</Link></Button>`.
- `pending` row → "Your application is pending review (submitted N days
  ago)" + secondary withdraw button.
- `rejected` row → rejection comment + "Apply again" link.

#### Main-nav `/mod` link badge

`apps/web/src/components/layout/header.tsx` (or wherever the mod link
renders). Server component: if role ∈ `{moderator, admin}`, calls
`moderation.pendingCounts()`. Renders the count next to the Mod link
as a small destructive-tinted pill, e.g. `Mod ⓘ7`. `aria-label="7
items pending moderation"`.

#### `/mod` sub-nav per-tab badges

`apps/web/src/components/mod/mod-nav.tsx`. Each tab gets its own count
pill: `Queue (5)`, `Access requests (2)`. Audit and Users tabs unbadged.
Counts come from the same `pendingCounts` call as main-nav (React
`cache()` dedupe).

#### Contribute edit forms — `<ChangesRequestedBanner>`

When a contribute form page (`/contribute/[type]/[id]/edit`) loads with
a submission whose status is `changes_requested`, banner renders above
the form:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠ Changes requested                                      │
│ Reviewer: "Please add publication year and longer bio."  │
│ Reviewed 2 days ago by a moderator                       │
│                                                          │
│ ▾ See what's been changed (collapsed by default)         │
│   <FieldDiff prior=... current=...>                      │
└─────────────────────────────────────────────────────────┘
```

Reviewer name redacted using the W2-shipped contributor-redaction
pattern.

#### Submission detail page — Withdraw button

`/profile/contributions/[id]/page.tsx`. When status ∈ `{pending,
changes_requested}` and viewer is the owner, render `<Button
variant="destructive" outline>Withdraw submission</Button>` next to
the existing review-thread. Confirmation dialog ("This will cancel
your submission. You can resubmit later by starting fresh."), calls
`submission.withdrawMine`, refreshes.

### §10 — Components

| Component | Path | Notes |
|---|---|---|
| `<Heatmap>` | `apps/web/src/components/contributor/heatmap.tsx` | Ported from POC `Heatmap.tsx`. 52w × 7d grid, 14×14px cells, 6-step accent-opacity scale. SR-only `<table>` mirror for a11y (mod-dashboard sparkline pattern). |
| `<PendingCountBadge>` | `apps/web/src/components/mod/pending-count-badge.tsx` | Pure presentational: `count: number` → returns null if 0, else small destructive-tinted pill. Used in main-nav and per sub-nav tab. |
| `<ChangesRequestedBanner>` | `apps/web/src/components/contribute/changes-requested-banner.tsx` | Takes `priorData`, `currentData`, `reviewComment`, `reviewedAt`. Internally renders `<FieldDiff>`. |
| `<TrustLevelPill>` | `packages/ui/src/components/trust-level-pill.tsx` | POC styling: accent-glow background for `maintainer`/`trusted`, surface-2 for `regular`, no pill for `new`. Shared primitive. |
| `<ContributorHero>` | `apps/web/src/components/contributor/contributor-hero.tsx` | Avatar + name + @username + bio + inline stats + trust pill. `variant: 'profile' \| 'dashboard'` controls avatar size + outer wrapper. |
| `<ContributionList>` | `apps/web/src/components/contributor/contribution-list.tsx` | Existing `/profile/contributions` list rows, extracted into a reusable component taking `items` + optional empty state copy. Used in dashboard tabs. |

### §11 — i18n

All new strings under namespaces `contribute.apply.*`,
`mod.accessRequests.*`, `contributor.profile.*`, `dashboard.*`.
Estimate ~80 new keys. Existing `contribute.*` keys reused where
applicable (status badges, etc.).

### §12 — Testing

#### Unit tests (Vitest, `apps/web/src/server/`)

- `accessRequests.test.ts` (new): apply happy-path, duplicate-pending
  conflict, reapply after rejection, withdrawMine happy-path,
  withdrawMine non-owner, withdrawMine already-withdrawn, getMine
  most-recent-only, queue cursor pagination, review(approved) flips
  role + writes audit + sends email, review(rejected) with comment,
  double-review forbidden.
- `submission.test.ts` (extend): withdrawMine on pending, withdrawMine
  on changes_requested, withdrawMine on applied / withdrawn / non-owner
  forbidden, getResubmitContext returns prior data + last comment,
  getResubmitContext only valid on changes_requested.
- `moderation.test.ts` (extend): dashboardStats includes
  pendingAccessRequestsCount, pendingCounts returns sums.
- `home.test.ts` (extend): contributorProfile returns DTO,
  case-insensitive lookup, unknown username returns null,
  contributorHeatmap dense buckets + year filter scopes.
- `dashboard.test.ts` (new): mine returns owner-scoped stats,
  approval-rate formula correct (denominator excludes withdrawn),
  empty-state DTO when no submissions.

#### Component tests (Vitest + Testing Library)

- `apply-form.test.tsx`: renders, submits with reason, submits without
  reason, char-counter updates, error state.
- `access-request-row.test.tsx`: approve + reject flows, disabled-after
  states.
- `heatmap.test.tsx`: cell count for input year, opacity buckets, SR
  mirror table.
- `pending-count-badge.test.tsx`: returns null on count=0, renders
  count, aria-label.
- `changes-requested-banner.test.tsx`: renders comment, expands diff,
  redacts reviewer name.
- `trust-level-pill.test.tsx`: variant-by-level rendering.
- `contributor-hero.test.tsx`: profile vs dashboard variant, optional
  bio handling.

#### E2E tests (Playwright, `apps/e2e/tests/`)

`contributor-lifecycle.spec.ts` (new):

1. **Apply → approve → contribute end-to-end.** New user signs up →
   `/contribute` shows access-denied with apply CTA → submits the apply
   form → moderator opens `/mod/access-requests` → approves with
   comment → applicant refreshes `/contribute` and sees the regular
   contribute landing → submits a reciter.
2. **Withdraw application.** User applies → sees pending state →
   Withdraw → row disappears from the moderator queue.
3. **Withdraw submission.** Contributor submits → sees pending detail
   page → Withdraw → confirmation → status flips, no longer in
   `/mod/queue`.
4. **Resubmit with changes-requested banner.** Moderator
   `changes_requested` a submission → contributor opens edit page →
   banner visible with feedback comment → expand diff → save → status
   flips back to pending.
5. **Public contributor profile.** Anonymous user visits
   `/contributor/<username>` → sees hero, heatmap, stat cards. Bogus
   username 404s.
6. **Pending-count badge.** Moderator with pending items in queue →
   main-nav shows count → clears one → count decrements after refresh.

#### Verification gate (mirrors W2)

- `./dev qa` green (typecheck + lint + unit tests).
- DB-backed integration tests pass against the test container.
- E2E suite green in clean docker environment.
- Manual browser smoke (user's call after report): apply → approve flow,
  public profile, dashboard, withdraw, changes-requested banner,
  pending badges.
- Lighthouse canary on `/contributor/[username]` and `/dashboard` —
  perf ≥ 0.8, a11y ≥ 0.9.
- Helm CronJob render check: `helm template` against the staging values
  file.
- One-off invocation of the digest script in dev (against MailHog) to
  confirm email body renders correctly.

## Risks

- **Username collision under concurrent signups.** The case-insensitive
  unique index is the canonical guard, but the signup-form race window
  is real. Mitigation: catch the unique-violation error and surface as
  field-level "username taken" — same pattern as existing slug-collision
  handling on submissions.
- **Digest cron infinite-resend on partial failure.** If the send loop
  succeeds for some recipients but fails before the post-send UPDATE,
  the next run double-sends. Mitigation: keep the per-cron LIMIT at 100;
  worst-case repeat is bounded. Consider per-recipient `notified_at` if
  the duplication ever bites in practice (out of scope for W3).
- **Dashboard route conflict with `(protected)/profile`.** The current
  `/profile/contributions` page is being replaced; the detail route
  `/profile/contributions/[id]` stays. We need a redirect from the
  deleted list page to `/dashboard` to keep any inbound links from W1
  / W2 working — handled by a Next.js redirect in `next.config.ts`.
- **Trust-level enum without auto-population.** Every contributor stays
  `new` forever until manual DB intervention. Acceptable for W3; the
  follow-up work to add criteria + auto-population is roadmap-tracked.

## Open Questions

(None remaining at design-doc time. All Q1-Q5 + the table of small UX
calls from the brainstorm phase resolved before the spec was written.)

## Deferred / follow-up items

These ride out of W3 explicitly; tracked in roadmap closeout.

- **Trust-level criteria + auto-population logic.** Threshold rules,
  scheduled job to recompute, override surface for moderators. Roadmap
  follow-up.
- **`/mod/users` surface for setting trust level manually.** Without it,
  trust level is set via DB only.
- **Per-day pending-count sparkline on the moderator dashboard.**
  Extends `dashboardStats` in a future micro-feature.
- **Public contributor leaderboard / `/contributors` listing.**
  Individual profile route ships in W3; a directory is future.
- **"Withdraw all my data" GDPR-style flow.** Reuses the withdraw
  plumbing from W3.
- **Multi-year heatmap.** Default current year only in W3.
- **Username self-service rename.** Locked at signup in W3.
- **Email digest unsubscribe / preferences.** Moderators are
  admin-managed, no opt-out in W3.

## Refs

- [W1 — Contribute forms](./2026-04-23-contributor-moderator-overhaul-design.md)
  (parent spec)
- [W2 — Moderation flow](./2026-04-25-phase-2-4-w2-moderation-flow-design.md)
  (sibling spec, shipped 2026-04-25)
- [Phase 2.5 — POC Design Port](./2026-04-24-poc-design-port-design.md)
  (deferred profile + heatmap + dashboard surfaces folded into W3)
- [Roadmap](./2026-04-21-rebuild-roadmap.md) §2.4 W3
