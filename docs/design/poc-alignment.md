# POC Alignment Tracker

Tracks page-by-page comparison between the new design POC at `/home/asif/dev/nawhas/new-design-poc` and the current production app at `apps/web/`.

**Goal:** decide for each page whether to align Current → POC, leave as-is, or pick a hybrid. Update status as we work through each section.

---

## Status legend

- ⬜ **Not started** — findings recorded, no decision yet
- 🟨 **In progress** — actively being reconciled
- ✅ **Done** — aligned (or explicitly accepted as divergent) and verified

---

## Cross-cutting verdicts

| Area | Status | Verdict |
|---|---|---|
| Color tokens | ✅ | Exact match — every CSS var lines up |
| Fonts (Inter / Fraunces / Noto Nastaliq) | ✅ | Exact match |
| Footer | ✅ | Exact match in structure |
| Header / Navbar | ✅ | Aligned — gradient logo + Library link + short labels + Contribute pill + POC dropdown style |
| Player bar | ⬜ | Close — Current has more features (queue, lazy load) |
| Home | ✅ | Aligned — POC hero + 6-section roster (Trending / Saved / Quote / Top Reciters / Popular / TopNawhas); plays-count + trending data on roadmap |
| Reciters list | ⬜ | Close — A–Z filter unclear |
| Reciter detail | ⬜ | URL path changed; layout close |
| Albums list | ⬜ | Close — year filter removed |
| Album detail | ⬜ | Close — componentized |
| Track detail | ⬜ | URL flattened → nested; sidebar removed |
| Library | ⬜ | Differs significantly (paradigm change) |
| Dashboard | ⬜ | Close — sidebar widget differs |
| Contributor profile | ⬜ | Close — one stat removed |
| Changes feed | ⬜ | Close — filter sidebar removed |
| Submit / Contribute | ⬜ | Differs significantly (IA change) |
| Moderation | ⬜ | Differs significantly (IA change) |

---

## 1. Header / Navbar

**Status:** ✅ Done — all 6 decisions resolved

**POC:** `src/components/Header.tsx`
**Current:** `apps/web/src/components/layout/header.tsx`

**Findings:**
- Logo — POC has gradient avatar icon (N in circle, red→`#7a1c1a` gradient, 28px) + Fraunces 22px wordmark in `var(--text)` (white). Current had wordmark only at 24px in `var(--accent)` (red).
- Nav links — POC: Home, Library, Reciters, Albums, Changes (5). Current: Home, Reciters, Albums, Changes (4 — Library dropped).
- Nav labels — POC: "Reciters", "Albums", "Changes". Current i18n: "Browse Reciters", "Browse Albums", "Recent Changes".
- Contribute CTA — POC has red "+ Contribute" pill in header. Current has it only in user menu.
- Search bar — Current has desktop search bar between nav and auth. POC has none.
- Avatar style — POC: gold→brown gradient (`#8a6a4a → #4a3a2a`). Current: flat white circle.
- User menu items — POC: name + @handle + role badge / My Dashboard / Public profile / Submit contribution / Moderation queue / Sign out. Current: name + email / Profile / Contribute / Moderator Dashboard / Sign out.
- Sign-in (logged out) — POC N/A. Current shows red "Sign In" button.
- Mobile — POC has none. Current has full hamburger + slide-out menu.

**Decisions:**
- [x] **D1: Logo** — Match POC exactly: gradient "N" icon + white wordmark at 22px. ✅ Applied to `apps/web/src/components/layout/header.tsx`.
- [x] **D2: Nav links** — Match POC: restore "Library" link, use short labels ("Reciters", "Albums", "Changes"). ✅ Applied to `apps/web/src/components/layout/header.tsx` + `apps/web/messages/en.json`. Tests updated.
- [x] **D3: Contribute CTA** — Red pill button in header for `role=contributor|moderator` only (preserves access-control gate). ✅ Applied; removed duplicate from user menu. New header tests cover all four role states.
- [x] **D4: User menu** — full. ✅ Avatar (gold/brown gradient default + `user.image` fallback + 36px + white border). ✅ Dropdown header (name + @username + color-coded role badge). ✅ Items (hybrid C): My Dashboard / Public profile / Account settings / Moderation queue (mod only, red label) / Sign out — all with 11px dim subtitles. Public profile hidden when `username` is null. Note: mobile-nav still uses `/profile` and the renamed labels via existing i18n keys, so mobile menu now reads "Account settings" and "Moderation queue" automatically.
- [x] **D5: Search bar** — Keep desktop search bar in header (POC didn't model search; production needs global findability). No code change.
- [x] **D6: Mobile menu** — Keep Current's hamburger AND mirror the new POC dropdown style inside the slide-out: name + @username + role badge header, then My Dashboard / Public profile / Account settings, then a separator, then role-gated Contribute and Moderation queue (red, with pending badge), then Sign Out. All items have subtitles. Extracted shared `RoleBadge` component used by both desktop and mobile.

**Action items:**
- ✅ Logo: gradient N icon + 22px white wordmark — `apps/web/src/components/layout/header.tsx`
- ✅ Nav: added Library link, short labels — `apps/web/src/components/layout/header.tsx`, `apps/web/messages/en.json`, layout test files updated
- ✅ Contribute pill: `apps/web/src/components/layout/header.tsx`; removed from `user-menu.tsx`; tests updated in `__tests__/header.test.tsx` and `__tests__/user-menu.test.tsx`
- ✅ User menu visual + header: `apps/web/src/components/layout/user-menu.tsx`; new role-badge i18n keys in `apps/web/messages/en.json`. Tests cover Member/Contributor/Moderator badge rendering.
- ✅ User menu items + subtitles: `apps/web/src/components/layout/user-menu.tsx`; new i18n keys (`myDashboard`, `myDashboardSubtitle`, `publicProfile`, `publicProfileSubtitle`, `accountSettingsSubtitle`, `moderationQueueSubtitle`); renamed `nav.profile` → "Account settings" and `nav.moderatorDashboard` → "Moderation queue". Tests updated in `__tests__/user-menu.test.tsx` and `__tests__/mobile-nav.test.tsx`.
- ✅ Search bar: no change — kept in header (`apps/web/src/components/layout/header.tsx`).
- ✅ Mobile menu alignment: extracted shared `RoleBadge` → `apps/web/src/components/layout/role-badge.tsx`. Refactored mobile slide-out user section in `apps/web/src/components/layout/mobile-nav.tsx` to mirror desktop dropdown (name + @username + role badge header; full menu item set with subtitles; pending-count badge for moderators). Added `contributeSubtitle` i18n key.

---

## 2. Footer

**Status:** ✅ Done — exact structural match, no rework needed

**POC:** `src/components/Footer.tsx`
**Current:** `packages/ui/src/components/footer.tsx`

**Findings:**
- 4-column grid (Product / Community / Admin / About) identical.
- Current adds responsive breakpoints (1 col mobile → 2 sm → 4 md+) and explicit hover states.
- Current uses i18n (`useTranslations('footer')`).
- Current correctly avoids rendering footer landmark twice (PageLayout owns it).

**Action items:** none.

---

## 3. Player bar

**Status:** ⬜ Not started

**POC:** `src/components/MiniPlayer.tsx`
**Current:** `apps/web/src/components/player/PlayerBar.tsx` + `PlayerBarLazy.tsx`

**Findings:**
- Layout matches: fixed bottom, 3-column (track info | play+progress | close).
- Colors match: dark overlay, accent red progress bar.
- Current adds queue panel + now-playing modal (PlayerPanels) — POC has none.
- Current lazy-loads (`next/dynamic({ ssr: false })`) — POC inlines.
- Current has PlayerBarSpacer to reserve layout height — POC uses `paddingBottom: "100px"` on body.

**Decisions needed:**
- [ ] Keep Current's queue panel + now-playing modal? (POC doesn't show these)

**Action items:** _TBD_

---

## 4. Home page

**Status:** ✅ Done — all 6 decisions resolved

**POC:** `src/app/page.tsx`
**Current:** `apps/web/app/page.tsx` + `apps/web/src/components/home/`

**Findings:**
- POC sections (in order): Hero → **Trending This Month** → Saved Tracks → **Quote Banner** → Top Reciters → Most Popular Tracks (2-col card grid).
- Current sections (in order): Hero → SavedStrip → FeaturedReciters → **RecentAlbums** → PopularTracks (`<ol>`) → **TopNawhasTable** (`<ol>` with serif numerals).
- **Trending This Month** missing in Current — POC has 5-col grid.
- **Quote banner** missing in Current.
- **RecentAlbums** new in Current — POC has no equivalent.
- **Most Popular Tracks**: POC = 2-col card grid (cover + reciter + plays). Current = `<ol>` numbered list with title + duration only.
- **TopNawhasTable** new in Current — `<ol>` with serif rank numerals + reciter · album subtitle.
- SavedStrip is new and auth-aware (hidden if user not logged in or empty).
- Track links use nested URL `/reciters/.../albums/.../tracks/...` — POC uses flat `/track/[slug]`.
- Hero — POC: dark + red radial gradient + noise circles, Inter sans h1, white-pill search w/ right circular button. Current was: red linear gradient, Fraunces serif h1 with subtitle, dark `<SearchBar>` shared component.

**Decisions:**
- [x] **D1: Hero** — Match POC fully: dark `var(--bg)` background with two-layer radial gradient (red glow + noise circles), Inter sans h1 (POC clamp 34→52 / weight 700 / -0.025em letter-spacing), POC headline "Explore the most advanced library of nawhas online", no subtitle, `<SearchBar variant="hero" />` restyled to white pill (140×540) with right-side circular dark submit button + heavy shadow. ✅
- [x] **D2: Trending section** — Option B (visual restoration). New `<TrendingTracks>` component wired in above SavedStrip, backed temporarily by `home.getTopTracks` (newest-first proxy, slice 5). Real "last 30 days play count" trending procedure tracked as a Phase 2.6 follow-up in the rebuild roadmap. ✅
- [x] **D3: Saved tracks** — Option B + always-visible: keep Current's compact 6-col strip, swap placeholder `<div>` for proper `<CoverArt>`, and always render the section. Three states: (1) signed-out → empty state with sign-in CTA; (2) signed-in but no saves → empty state explaining how to save; (3) signed-in with saves → grid. Loading shows the heading without flashing the wrong CTA. ✅
- [x] **D4: Quote banner** — Option A: restore POC banner with hardcoded quote. New `<QuoteBanner>` component matches POC visual exactly (`var(--accent-glow)` bg, 64px vertical padding, 16px radius, 24px italic semibold quote, dim attribution). Inserted between SavedStrip and FeaturedReciters. Option B (i18n + rotating quotes) tracked as a Phase 2.6 follow-up in the roadmap. ✅
- [x] **D5: Top Reciters** — Option A (full POC fidelity): drop card chrome, flat avatar + name + "{N} albums · {N} tracks" subtitle, 2/3/4-col responsive grid. Backend change: new `ReciterFeaturedDTO` (extends `ReciterDTO` with `albumCount` + `trackCount`); `home.getFeatured` aggregates counts via single grouped query. Heading renamed "Featured Reciters" → "Top Reciters". `<ReciterCard>` left untouched (still used on `/reciters` and `/albums/[slug]`). ✅
- [x] **D6: Other sections** — Option C: dropped `<RecentAlbums>` (covered by Trending), restyled `<PopularTracks>` to POC's 2-col horizontal-card grid (cover + title + reciter + duration, with "See all" link), and **also dropped `<TopNawhasTable>`** (redundant with PopularTracks once both surface the same conceptual list). Backend: `FeaturedDTO.tracks` upgraded from `TrackDTO[]` to `TrackListItemDTO[]` (added album/reciter joins to the popular-tracks query) so cards can link to canonical track URLs. `getTopTracks` limit dropped from 10 → 5 since only Trending consumes it. Plays-count subtitle deferred — same play-event dependency as Trending follow-up. ✅

**Action items:**
- ✅ Hero: `apps/web/src/components/home/hero-section.tsx` (full rewrite to match POC). i18n updated in `apps/web/messages/en.json` (`slogan` updated; `subtitle` key removed).
- ✅ SearchBar hero variant restyled: `apps/web/src/components/search/search-bar.tsx` — white pill bg, dark text, right-side circular dark submit button, no left icon (kept for default variant). Hero test updated.
- ✅ Trending This Month: new component `apps/web/src/components/home/trending-tracks.tsx` + test in `__tests__/trending-tracks.test.tsx` + wired into `apps/web/app/page.tsx` (above SavedStrip). i18n keys `home.sections.trendingThisMonth` and `home.sections.seeAll` added.
- 📌 Follow-up captured in `docs/superpowers/specs/2026-04-21-rebuild-roadmap.md` under Phase 2.6: real trending procedure backed by 30-day play count.
- ✅ SavedStrip rewritten in `apps/web/src/components/home/saved-strip.tsx`. Real `<CoverArt>` swapped in for the placeholder div. Three-state empty/empty/grid handled with new i18n keys (`savedEmptyAuthedTitle/Body`, `savedEmptySignedOutTitle/Body`). Tests updated in `__tests__/saved-strip.test.tsx`.
- ✅ Quote banner: new `apps/web/src/components/home/quote-banner.tsx` + test in `__tests__/quote-banner.test.tsx`; wired into `apps/web/app/page.tsx` between SavedStrip and FeaturedReciters.
- 📌 Follow-up captured in roadmap Phase 2.6: i18n + rotating quote-banner copy.
- ✅ Top Reciters: `apps/web/src/components/home/featured-reciters.tsx` rewritten to flat avatar+name+counts; new `ReciterFeaturedDTO` in `packages/types/src/index.ts`; `home.getFeatured` aggregates counts in `apps/web/src/server/routers/home.ts`. Test rewritten in `__tests__/featured-reciters.test.tsx`.
- ✅ Section roster trimmed: deleted `apps/web/src/components/home/recent-albums.tsx` + its test (only used on home). PopularTracks rewritten as POC 2-col card grid in `apps/web/src/components/home/popular-tracks.tsx`. `FeaturedDTO.tracks` upgraded to `TrackListItemDTO[]` in `packages/types/src/index.ts`; popular-tracks query in `apps/web/src/server/routers/home.ts` joins albums + reciters. Test rewritten in `__tests__/popular-tracks.test.tsx`. Plays-count subtitle is a Phase 2.6 follow-up sharing the play-event source with the trending follow-up (extended note added in roadmap).
- ✅ TopNawhasTable removed: deleted `apps/web/src/components/home/top-nawhas-table.tsx` + its test (was redundant with PopularTracks). `topNawhas` i18n key removed. `getTopTracks` limit reduced 10 → 5 in `apps/web/app/page.tsx` since Trending is the sole consumer. Final home composition is now Hero → Trending → Saved → Quote → Top Reciters → Popular (6 sections, matching POC's 5 + Saved auth surface).

---

## 5. Reciters list

**Status:** ⬜ Not started

**POC:** `src/app/reciters/page.tsx` (client)
**Current:** `apps/web/app/reciters/page.tsx` + `src/components/reciters/reciter-grid.tsx`

**Findings:**
- POC: sticky A–Z letter filter buttons + "All" + 4-col grid, all client-side filtered with `useMemo`.
- Current: server-fetches first 24, client `ReciterGrid` does cursor-based load-more. A–Z filter not visible in page file.
- Card content matches: avatar + name + "tracks · albums" count.

**Decisions needed:**
- [ ] Restore A–Z letter filter, or keep load-more pagination?
- [ ] Hybrid: keep load-more but add letter quick-jump?

**Action items:** _TBD_

---

## 6. Reciter detail

**Status:** ⬜ Not started

**POC:** `src/app/reciter/[slug]/page.tsx` — URL `/reciter/[slug]`
**Current:** `apps/web/app/reciters/[slug]/page.tsx` — URL `/reciters/[slug]` (plural)

**Findings:**
- URL changed: singular `/reciter` → plural `/reciters`. **This is a breaking link change.**
- Layout close: hero (avatar + bio + counts + verified badge) + Popular Tracks + Albums.
- POC: hardcoded "Popular Tracks" 3-col grid + Albums 4-col grid (shows all).
- Current: `ReciterHeader` + `ReciterDiscography` (paginated, cursor-based).
- "Suggest edit" / "Add album" buttons present in both.

**Decisions needed:**
- [ ] Confirm `/reciters/[slug]` (plural) is the correct final URL — or revert to `/reciter`?
- [ ] Keep ReciterDiscography pagination, or show all like POC?

**Action items:** _TBD_

---

## 7. Albums list

**Status:** ⬜ Not started

**POC:** `src/app/albums/page.tsx`
**Current:** `apps/web/app/albums/page.tsx` + `src/components/albums/album-grid.tsx`

**Findings:**
- POC: year-filter dropdown + 5-col grid. Reciter-filter code exists but isn't wired.
- Current: server-fetches 24, client `AlbumGrid` load-more. No year filter visible.
- Card content matches: cover + title + year (Current may add reciter name).

**Decisions needed:**
- [ ] Restore year filter (POC) or keep load-more only (Current)?
- [ ] Wire up reciter filter that POC stubbed out?

**Action items:** _TBD_

---

## 8. Album detail

**Status:** ⬜ Not started

**POC:** `src/app/album/[slug]/page.tsx`
**Current:** `apps/web/app/albums/[slug]/page.tsx`

**Findings:**
- URL matches: `/albums/[slug]`.
- Layout matches: 320px cover + title + reciter link + year + description + buttons + track list.
- Current extracted `AlbumHeader` + `PlayAllButton` + `TrackList` components.
- Visual: POC inline `48px` Fraunces title; Current responsive `text-[2.5rem]→[3.5rem]` serif.
- "Suggest edit" / "Add track" buttons present in both.

**Decisions needed:**
- [ ] Confirm visual sizing matches POC at desktop breakpoint.

**Action items:** _TBD_

---

## 9. Track detail

**Status:** ⬜ Not started

**POC:** `src/app/track/[slug]/page.tsx` — URL `/track/[slug]` (flat)
**Current:** `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx` (nested)

**Findings:**
- URL: flat → deeply nested. **Breaking link change** affecting every track link in the app.
- POC layout: breadcrumb → cover + title + reciter badge + play + waveform + lyrics (left col) + album info + related tracks sidebar (right col).
- Current layout: TrackHeader + TrackActions + MediaToggle/TrackDetailPlayButton + Waveform + LyricsDisplay. **No related-tracks sidebar visible.**
- Lyrics: POC has language tabs (Urdu / Roman / English) + edit/add buttons. Current has `LyricsDisplay` — needs verification it preserves tabs.
- MediaToggle (YouTube playback) is new in Current — POC has no YouTube concept.

**Decisions needed:**
- [ ] Revert to flat `/track/[slug]` URL or keep nested?
- [ ] Restore related-tracks sidebar?
- [ ] Confirm `LyricsDisplay` still has language tabs + edit/add translation buttons.
- [ ] Keep MediaToggle (YouTube) feature?

**Action items:** _TBD_

---

## 10. Library

**Status:** ⬜ Not started — **biggest paradigm question**

**POC:** `src/app/library/page.tsx` (filterable catalog)
**Current:** `apps/web/app/(protected)/library/tracks/page.tsx` (saved-only)

**Findings:**
- POC: two-column (240px sidebar filters + main). 5 tabs: All / Tracks / Reciters / Poets / Albums. Sidebar has Language, Theme, Year-range filters. Real-time search.
- Current: full-width, only `/library/tracks` exists. No filters. Only shows the user's saved tracks. Load-more pagination.
- **POC = browse/discover catalog. Current = personal saved-tracks page.** Completely different purpose.

**Decisions needed (the big one):**
- [ ] Should `/library` be a public filterable catalog (POC) or a private saved-only page (Current)?
- [ ] If catalog: what does "saved" UX look like — separate page (`/saved`?) or a tab inside `/library`?
- [ ] If saved-only: should `/library` redirect to `/library/tracks`? Should we add the missing tabs (Reciters/Poets/Albums)?

**Action items:** _TBD_

---

## 11. Dashboard

**Status:** ⬜ Not started

**POC:** `src/app/dashboard/page.tsx`
**Current:** `apps/web/app/(protected)/dashboard/page.tsx`

**Findings:**
- Layout matches: 2-col (main + 280px sidebar) with 4-stat grid + submission tabs.
- Current uses `ContributorHero` component + i18n + real data.
- POC has "Most Needed" sidebar (Translations / Lyrics / Metadata). Current dropped it.
- Current adds "View profile" link to public contributor page.

**Decisions needed:**
- [ ] Restore "Most Needed" sidebar?
- [ ] Keep "View profile" link in addition?

**Action items:** _TBD_

---

## 12. Contributor public profile

**Status:** ⬜ Not started

**POC:** `src/app/contributor/[slug]/page.tsx`
**Current:** `apps/web/app/contributor/[username]/page.tsx`

**Findings:**
- Layout matches: avatar (200px POC) + 3-col stat grid + heatmap + badges.
- POC stats: Total / Approved / Pending / **Total Plays**. Current: dropped "Total Plays".
- Current uses `ContributorHero` (shared with Dashboard) + server-fetched heatmap.
- Badges visually identical (emoji pills).

**Decisions needed:**
- [ ] Restore "Total Plays" stat?

**Action items:** _TBD_

---

## 13. Changes feed

**Status:** ⬜ Not started

**POC:** `src/app/changes/page.tsx`
**Current:** `apps/web/app/changes/page.tsx`

**Findings:**
- Layout matches: 2-col (main + 280px sidebar) with date-grouped change cards.
- POC has type-filter sidebar (All / Lyrics / Metadata / etc). Current dropped it.
- Current extracted `ChangesDaySection` component.

**Decisions needed:**
- [ ] Restore type-filter sidebar?

**Action items:** _TBD_

---

## 14. Submit / Contribute

**Status:** ⬜ Not started — **architectural mismatch**

**POC:** `src/app/submit/page.tsx` + `src/app/submit/SubmitClient.tsx` — single unified form
**Current:** `apps/web/app/contribute/page.tsx` (landing) + `app/contribute/track/new/`, `album/new/`, `reciter/new/`, `apply/`, `edit/...` — multi-route

**Findings:**
- POC: one form. 4 type buttons (Lyrics / Translation / Correction / Metadata). Generic Track/Language/Content fields.
- Current: landing page → choose entity (Track/Album/Reciter) → dedicated form per entity. Plus `/contribute/apply` for access requests, plus `/contribute/edit/...` flows.
- POC = quick contribution (lyrics, corrections). Current = structured entity creation + access control. **Different goals.**

**Decisions needed:**
- [ ] Keep Current's multi-route entity-creation IA, or collapse to POC's single-form approach?
- [ ] If keeping Current: redesign `/contribute` landing to match POC's visual treatment?
- [ ] Where does "submit lyrics for an existing track" live? (POC: just pick "Lyrics" type. Current: needs a route.)

**Action items:** _TBD_

---

## 15. Moderation

**Status:** ⬜ Not started — **architectural mismatch**

**POC:** `src/app/moderation/page.tsx` — single page, side panel
**Current:** `apps/web/app/mod/...` — multi-route with horizontal tab nav

**Findings:**
- POC: single page, 360px sidebar queue + main detail panel. Client-side state. Approve/Reject/Request-changes buttons inline.
- Current: separate routes — `/mod` overview, `/mod/queue`, `/mod/submissions/[id]`, `/mod/audit`, `/mod/access-requests`, `/mod/users`. Top tab nav (`ModNav`). Auth + role guard in `/mod/layout.tsx`.
- Current detail page has metadata sidebar, review thread, moderator notes — richer than POC.

**Decisions needed:**
- [ ] Collapse to single-page with sidebar queue + detail panel (POC)? Or keep multi-route (Current)?
- [ ] If keeping multi-route: align tab nav styling to POC's queue button visual?
- [ ] Card radius — POC default 12px vs Current 16px on submission detail. Standardize on which?

**Action items:** _TBD_

---

## Open global questions

- [ ] **URL strategy** — flat (POC: `/track/[slug]`, `/reciter/[slug]`, `/album/[slug]`) vs hierarchical (Current: `/reciters/[slug]/albums/[slug]/tracks/[slug]`). Decide once and apply consistently.
- [ ] **Filtering paradigm** — POC favors inline client-side filtering (year, A–Z, type). Current favors load-more pagination. Decide whether filters are coming back across reciters / albums / library / changes.
- [ ] **Auth scope** — Current has full Better Auth (login/register/forgot/reset/verify). POC has none. This is correct production scope; not a regression. No action needed.
