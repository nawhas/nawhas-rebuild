# Nawhas Rebuild — Roadmap (April 2026)

**Status:** Design / planning
**Author:** Asif (brainstormed with Claude)
**Date:** 2026-04-21

## Context

Nawhas.com runs in production on the legacy stack (Laravel + Nuxt 2 + Vuetify, monorepo at `github.com/nawhas/nawhas`). A rebuild in this repository (`nawhas-rebuild`) is well underway on a modern stack. The rebuild is already at or ahead of the live production feature set, but has two gaps preventing a public cutover: the visual styling no longer matches the production aesthetic, and several core dependencies have since moved a major version.

This document lays out the roadmap for taking the rebuild to public launch and beyond. It is a **top-level roadmap**, not an implementation plan — each phase below will be broken into its own spec and plan before execution.

## Goals

1. **Modernize the foundation.** The primary purpose of the rebuild is to shed legacy stack friction (Laravel + Nuxt 2) that historically blocked contributors. Keeping the stack current is therefore a first-class goal, not a nice-to-have.
2. **Match the production visual identity.** The rebuild currently does not match the Shia-devotional aesthetic of live `nawhas.com` across colour, typography, spacing, and component polish. A proper design pass is a launch blocker.
3. **Grow contributors.** Today the project is maintained by two people. Post-launch the rebuild needs to be easy to discover, trivial to set up, and have a groomed backlog so outside contributors can land their first PR without asking.

## Non-Goals

- **Blind feature parity with the legacy repo.** The legacy repo contains features that are not shipped in production today (stories, draft-lyrics diff viewer, print-lyrics, moderator tools that never went live). These are out of scope for the launch.
- **Net-new feature work before launch.** Playlists, topics/browse-by-event, MP3 download, mobile app, etc. are post-launch. They're tracked separately from this roadmap.

## Approach

**Approach A — sequential.** Stack upgrades first, design pass second, launch third, community push fourth. Rationale: redesigning components against a Next 15 / Zod 3 / Typesense-client 2 codebase wastes work when those are about to change. Getting upgrades out of the way first means the design pass is the last thing to touch any given file.

The alternative considered — running design and upgrades in parallel — was rejected here for two reasons: a two-person team creates real merge friction between the tracks, and locking in tokens against soon-to-change primitives (e.g. Tailwind 4.x minor bumps, Next 16 RSC caching behaviour) risks rework.

## Phase 1 — Stack Upgrades (single batch)

All upgrades land in a single coordinated PR stream. The upgrades are interlocked — Next 16's caching behaviour interacts with tRPC/react-query, Zod 4 is pulled in by newer versions of some consumers, and TypeScript 6's stricter lib types surface issues across every bumped package — so there is no clean seam at which to split them.

### Major-version changes (drive the effort)

- **Next.js 15.1 → 16.2** — async dynamic APIs (work already started via the `headers()/cookies()` ESLint rule in recent commits), new caching defaults, Turbopack default, React Compiler opt-in evaluation.
- **TypeScript 5.7 → 6.0** — typecheck sweep + stricter lib types.
- **Zod 3.24 → 4.3** — every tRPC input/output schema, every Better-Auth plugin config, every form validator.
- **Typesense npm client 2 → 3** + **Typesense server 26 → 28 (Docker)** — sync code, collection schemas, reconciliation runner.
- **diff 8 → 9** — lyrics diff viewer only.
- **Node 20 → 22 LTS** — Docker base images + `engines` field.

### Routine minor/patch bumps (ride along)

| Package | From | To |
|---|---|---|
| react, react-dom | 19.0 | 19.2 |
| drizzle-orm | 0.39.3 | 0.45.2 |
| drizzle-kit | 0.30.4 | 0.31.10 |
| better-auth | 1.2.5 | 1.6.5 |
| @trpc/* | 11.0.0 | 11.16.0 |
| @tanstack/react-query | 5.65.1 | 5.99.2 |
| tailwindcss | 4.0.6 | 4.2.4 |
| turbo | 2.3.3 | 2.9.6 |
| eslint | 10.1.0 | 10.2.1 |
| @sentry/nextjs | 10.47.0 | 10.49.0 |
| vitest | 4.1.0 | 4.1.5 |
| next-intl | 4.9.0 | 4.9.1 |
| @aws-sdk/* | 3.1022 | 3.1033 |
| postgres | 3.4.5 | 3.4.9 |

### Verification

Before starting: expand integration coverage around search and the lyrics diff viewer — these are the two surfaces most likely to regress silently under the major jumps. Those tests become the regression net.

After landing: all four required CI checks green (quality, build, docker-build, e2e) + Lighthouse thresholds held (perf ≥ 0.8, a11y ≥ 0.9, LCP ≤ 2500ms, FCP ≤ 2000ms, CLS ≤ 0.1) + prodlike smoke test passes + manual smoke of home, reciter, album, track, search, auth, library, contribute, and mod flows. Next 16's caching defaults are the single most likely source of debugging pain; budget accordingly.

## Phase 2 — Design System + Visual Parity

Starts only when Phase 1 is fully merged, so design tokens and primitives aren't chasing a moving target.

### 2.1 Legacy visual audit

Screenshot every live production page across desktop and mobile breakpoints. Extract design tokens — palette, typography scale, spacing grid, border radii, shadows, motion — and write them to `docs/design/tokens.md`. This becomes the source of truth for everything that follows.

### 2.2 Design-system foundation in `packages/ui`

The groundwork is already in place: Radix Slot, class-variance-authority, tailwind-merge — the shadcn/ui recipe. This phase codifies the tokens into the Tailwind 4 theme layer and fills in the missing primitives: Button variants, Card, Dialog, Tabs, DropdownMenu, Tooltip, Sheet, Input, Select, Toast. Each primitive ships with a Vitest render test and a visual snapshot.

### 2.3 Page-by-page redesign

Redesign in descending order of user traffic. Each page ships behind the same bar:

1. Home
2. Reciter profile
3. Album
4. Track — the key surface (audio + lyrics + metadata)
5. Library / History / Saved / Liked
6. Search results
7. Auth pages
8. Contribute + Mod (lowest traffic)

Every page gets a Playwright visual-regression snapshot on its way in. After that phase the parity bar is objective: the snapshot matches or the PR is red.

## Phase 3 — Launch Prep

### 3.1 Data strategy

Open decision, owner: Asif. Two paths:

- **Import legacy data:** one-shot migration from the legacy Laravel database into the new Drizzle schema. Preserves existing slugs so public URLs don't break, preserves saved libraries and listening history so returning users don't lose state.
- **Fresh start:** seed canonical catalogue data from scratch. Simpler, but returning users re-create their libraries.

The choice depends on how large and engaged the legacy user base actually is. Decision goes in its own sub-spec before Phase 3 starts.

### 3.2 SEO parity

- Redirect map: any legacy URL shape that differs from the rebuild gets a 301 to the new equivalent.
- Sitemap: parity with legacy coverage (`sitemap.ts` already exists — audit for completeness).
- Meta / OG tags on every public page match or exceed the legacy equivalent.

### 3.3 Public beta cutover

- Deploy rebuild to `beta.nawhas.com`, leave legacy `nawhas.com` live.
- Parallel run for 1–2 weeks; watch Sentry, Lighthouse, real-user metrics.
- When confidence is high, swap DNS. Keep `legacy.nawhas.com` reachable for one release cycle as a safety net.

## Phase 4 — Community / Contributor Push

Can partly overlap with Phase 3 once beta is live and stable.

### 4.1 Onboarding polish

Rewrite `CONTRIBUTING.md` as "your first PR in 30 minutes." Single setup command. Explicit dev-loop walkthrough. Clear pointer to `ARCHITECTURE.md` (already good). Explicit "where do I add a new ___?" recipes for the common changes.

### 4.2 Good-first-issue grooming

~20 well-scoped tickets across small features, visual polish, docs, tests, accessibility. Each labelled `good-first-issue` with acceptance criteria and file-path pointers.

### 4.3 Public roadmap + changelog

A GitHub Projects board with the phases above and their sub-tasks. Release Drafter (or equivalent) for auto-generated changelog.

### 4.4 Community channel + announcement

Discord or Matrix server, a launch post when `nawhas.com` cuts over, reach out to the existing user base.

## Dependencies & Sequencing

```
Phase 1 (single batch)
      ↓
Phase 2.1 → 2.2 → 2.3   (visual work)
                  ↓
            Phase 3   (launch prep)
                  ↓
            Phase 4   (can partly overlap with late 3)
```

## Risks

- **Phase 1** as a single batch means the PR is large and Next 16's caching defaults are the single most likely source of debugging pain. Mitigation: expand prodlike smoke coverage before the bump, and land against a dedicated long-lived branch so the work can be pushed and reviewed incrementally without blocking `main`.
- **Phase 2.3** can drift in scope if the token system from 2.1 is weak. Mitigation: tokens reviewed and committed *before* any page redesign starts.
- **Phase 3.1 data migration** is high-risk if done late. Mitigation: decide path early in Phase 2 so migration code can be written and tested in parallel with the visual work.

## Open Questions

1. Does the legacy production database need to be imported, or is a fresh start acceptable? (blocks Phase 3.1 detailed spec)
2. Do any legacy URL shapes differ from the rebuild's, and if so which? (needed for Phase 3.2 redirect map)
3. Is there an existing Discord/community channel, or does one need to be created? (Phase 4.4)

## What this document is *not*

This roadmap names phases and sub-projects; it does not specify implementation details. Each sub-project (Phase 1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1–4.4) gets its own design spec and implementation plan before coding starts.
