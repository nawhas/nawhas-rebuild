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
| Reciters list | ✅ | Aligned — anchor nav restyled to POC pills + counts on cards (counts via aggregated reciter.list) |
| Reciter detail | ✅ | Aligned — 200px avatar grid, bio + location + counts + pills, new Popular Tracks section, larger initial discography page |
| Albums list | ✅ | Aligned — URL-driven year filter dropdown + paginated grid (server-side filter coexists with load-more) |
| Album detail | ✅ | Aligned — dropped card chrome, eyebrow + description + action pills, accent-soft reciter link, +Add track in tracks header |
| Track detail | ✅ | Aligned — kept nested URL; new POC hero, breadcrumb, sidebar, lyrics empty-state; YouTube simplified |
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

**Status:** ✅ Done

**POC:** `src/app/reciters/page.tsx` (client)
**Current:** `apps/web/app/reciters/page.tsx` + `apps/web/src/components/reciters/reciter-grid.tsx`

**Findings:**
- POC: client-side filterable A–Z letter buttons (clicking "B" filters list to B-prefix), 4-col grid, cards show "{N} tracks · {N} albums" subtitle.
- Current was: A–Z **anchor nav** (clicking jumps to letter section), 2/3/4-col responsive grid via `<ReciterCard>`, no counts on cards.

**Decision:**
- [x] **Hybrid (user-chosen)** — keep Current's anchor-nav behavior + load-more pagination, restyle the letter buttons to POC's pill look (bordered, `var(--accent)` bg + white text on hover), and add POC's "{N} tracks · {N} albums" subtitle to each card. Backend: `reciter.list` now returns `ReciterFeaturedDTO[]` (with aggregated counts via `tracks⨝albums⨝reciters` group-by).

**Action items:**
- ✅ Backend: `reciter.list` aggregates `albumCount` + `trackCount` per row — `apps/web/src/server/routers/reciter.ts`. Stub-DB unit test updated for the new chain (`leftJoin` + `groupBy`) — `apps/web/src/__tests__/reciter.test.ts`.
- ✅ Server action `fetchMoreReciters` return type bumped to `PaginatedResult<ReciterFeaturedDTO>` — `apps/web/src/server/actions/reciters.ts`.
- ✅ `ReciterCard` accepts `ReciterDTO | ReciterFeaturedDTO`; renders the counts subtitle when the richer shape is passed — `apps/web/src/components/cards/reciter-card.tsx`.
- ✅ `ReciterGrid` typed against `ReciterFeaturedDTO[]`; A–Z anchor-nav buttons restyled to POC pill look (`border + transparent bg`, accent-on-hover) — `apps/web/src/components/reciters/reciter-grid.tsx`. Tests updated in `__tests__/reciter-grid.test.tsx`.

---

## 6. Reciter detail

**Status:** ✅ Done — all 4 decisions resolved

**POC:** `src/app/reciter/[slug]/page.tsx` — URL `/reciter/[slug]`
**Current:** `apps/web/app/reciters/[slug]/page.tsx` — URL `/reciters/[slug]` (plural)

**Findings:**
- URL — plural `/reciters` already canonical (matches our nested URL strategy). POC singular was a prototype detail.
- POC header: 200px avatar + name + verified pill + bio + 📍 location + "{N} Albums · {N} Tracks" stats + "Suggest edit" / "Add album" pills. Current had: 96px avatar + name + album count only — no bio, no location, no track count, no pills.
- POC has a "Popular Tracks" section (3-col grid of 6 tracks) between header and discography. Current didn't.
- POC's Albums grid is plain 4-col showing all. Current uses paginated `<ReciterDiscography>` (cursor-based).
- Verified badge skipped — no DB column for it.

**Decisions:**
- [x] **D1: Header content + layout** — Match POC fully. Backend: extended `ReciterWithAlbumsDTO` with `albumCount` + `trackCount`; `reciter.getBySlug` aggregates the track count via a single `tracks⨝albums` join. Header rewrites to a 2-col grid `[200px_1fr]` with bio, country (rendered with a 📍 pin icon), both stat counts, and Suggest edit / Add album pills. Verified badge skipped (no DB column).
- [x] **D2: Popular Tracks section** — Match POC fully. New `track.getPopularByReciter({ reciterSlug, limit })` procedure (newest-first proxy until real popularity windowing lands; same Phase 2.6 follow-up as home Trending). New `<ReciterPopularTracks>` component renders a 3-col responsive grid (cover + title + album year). `TrackListItemDTO` extended with `albumYear: number | null` (added to both `trackListItemColumns` projections in track + home routers).
- [x] **D3: Discography page size** — Hybrid (C). Bumped initial page size 12 → 24 so most reciters' full catalogues land in the first SSR payload; load-more pagination retained for the long tail.
- [x] **D4: Section heading sizing** — Keep Current's `font-serif text-2xl font-medium`. Site-wide consistency over per-page POC fidelity.

**Action items:**
- ✅ Type: `ReciterWithAlbumsDTO` gained `albumCount` + `trackCount`; `TrackListItemDTO` gained `albumYear`. — `packages/types/src/index.ts`.
- ✅ Backend: `reciter.getBySlug` now aggregates counts; new `track.getPopularByReciter` procedure. — `apps/web/src/server/routers/reciter.ts`, `apps/web/src/server/routers/track.ts`. Both `trackListItemColumns` projections in track + home routers updated to select `albums.year` as `albumYear`.
- ✅ Header rewrite: `apps/web/src/components/reciters/reciter-header.tsx` (now async server component, 200px avatar grid, bio + location + counts + pills). Tests rewritten in `__tests__/reciter-header.test.tsx`.
- ✅ Popular Tracks: new `apps/web/src/components/reciters/reciter-popular-tracks.tsx` + test in `__tests__/reciter-popular-tracks.test.tsx`. Wired between header and discography in `apps/web/app/reciters/[slug]/page.tsx`.
- ✅ Page: parallel-fetches album page + popular tracks; bumped initial album page size 12 → 24. — `apps/web/app/reciters/[slug]/page.tsx`.
- ✅ i18n: new `reciter.header` and `reciter.popularTracks` keys.
- ✅ Test fixture: `jsonld.test.ts` `makeReciter` updated to include the new count fields.

---

## 7. Albums list

**Status:** ✅ Done

**POC:** `src/app/albums/page.tsx`
**Current:** `apps/web/app/albums/page.tsx` + `apps/web/src/components/albums/album-grid.tsx`

**Findings:**
- POC: year-filter dropdown + 5-col grid. Reciter-filter code stubbed but unwired.
- Current was: paginated 2/3/4-col `<AlbumGrid>` with load-more. No filters.

**Decision:**
- [x] **A** — add a server-side year filter (URL-driven via `?year=`) that coexists with pagination. Reciter filter skipped (POC's stub was unwired; can be added in a future iteration if needed).

**Action items:**
- ✅ Backend: `album.list` accepts an optional `year` filter; new `album.listAvailableYears` procedure returns DISTINCT release years (newest-first) for the dropdown — `apps/web/src/server/routers/album.ts`.
- ✅ Server action `fetchMoreAlbums` signature bumped from `(cursor: string)` to `({ cursor, year? })` so subsequent pages stay scoped to the same filter — `apps/web/src/server/actions/albums.ts`.
- ✅ New `<YearFilter>` client component (URL-driven dropdown using `useRouter` + `useSearchParams` + `useTransition`) — `apps/web/src/components/albums/year-filter.tsx`.
- ✅ `<AlbumGrid>` now takes `year?: number | null`, threads it into load-more, and resets accumulated state on filter change — `apps/web/src/components/albums/album-grid.tsx`. Tests updated in `__tests__/album-grid.test.tsx` (mock signature change + new year-threading test).
- ✅ Page reads `?year=`, renders the filter alongside the title in a flex-row header, and shows a friendly empty-state card when the filter has no matches — `apps/web/app/albums/page.tsx`.
- ✅ i18n: new `albumsPage.yearFilter.{label,allYears}` and `albumsPage.noResults` keys.

---

## 8. Album detail

**Status:** ✅ Done — all 4 decisions resolved

**POC:** `src/app/album/[slug]/page.tsx`
**Current:** `apps/web/app/albums/[slug]/page.tsx`

**Findings:**
- URL matches: `/albums/[slug]` (POC singular `/album/[slug]` was a prototype detail).
- POC header: plain 2-col grid (320px cover + content), no card chrome. "ALBUM" eyebrow, 48px Fraunces title, reciter link in `var(--accent-soft)` (red), "Released YYYY" line, optional description, action pills.
- Current header: bordered card with the cover and title; smaller serif title (2.5→3.5rem); reciter link in `var(--text-dim)` (grey); year+track-count inline; no description; no action pills.
- Track list: POC has "+ Add track" pill in the heading row. Current didn't.
- `<PlayAllButton>` is a Current-only feature (POC has no audio).

**Decisions:**
- [x] **D1: Header chrome** — Drop the card. Header now a plain 2-col grid `[320px_1fr]` with 60px gap.
- [x] **D2: Header content** — Match POC fully: "ALBUM" eyebrow, "Released YYYY" prefix, description paragraph (max-w-500), and action pills "Suggest edit" + "Add track to album".
- [x] **D3: Reciter link styling** — `var(--accent-soft)` from rest, hover → `var(--accent)` (matches POC's coloured-link treatment).
- [x] **D4: Tracks section** — Keep `<PlayAllButton>` (production feature) AND add a small "+ Add track" pill in the tracks heading row (per POC).

**Action items:**
- ✅ AlbumHeader rewritten: `apps/web/src/components/albums/album-header.tsx`. Now async server component with `getTranslations`; eyebrow + description + action pills + POC reciter colour. Tests rewritten in `__tests__/album-header.test.tsx`.
- ✅ TrackList: `apps/web/src/components/albums/track-list.tsx` — added optional `addTrackHref` prop and a small bordered pill in the heading row. Now async (uses i18n). Tests updated in `__tests__/track-list.test.tsx` with new coverage for the pill.
- ✅ Page: `apps/web/app/albums/[slug]/page.tsx` passes `addTrackHref="/contribute/track/new"` into TrackList.
- ✅ i18n: new `albumDetail` namespace with `eyebrow`, `releasedPrefix`, `suggestEdit`, `addTrack`, `addTrackShort`, `tracksHeading` keys.

---

## 9. Track detail

**Status:** ✅ Done — all 6 decisions resolved

**POC:** `src/app/track/[slug]/page.tsx` — URL `/track/[slug]` (flat)
**Current:** `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx` (nested)

**Findings:**
- URL: nested wins on data-layer terms — track slugs are unique only within an album (`tracks_album_slug_unique` on `albumId, slug`), so POC's flat URL would need a schema migration.
- POC hero: 2-col with cover (lg=360px) on left + red radial-glow background + Fraunces 72px weight-400 title + uppercase "NAWHA TRACK" eyebrow + reciter pill (avatar circle + name) + horizontal action row (Play lg / ❤ / ✎ Suggest edit / ⋯ overflow). Current has narrower header + smaller title + inline metadata + separate Save/Like row.
- POC has Home • Album • Track breadcrumb at top. Current has none.
- POC body: 2-col with Lyrics (1.6fr) + Sidebar (Album card + 8 Related Tracks).
- POC lyrics: segmented tabs (Urdu / Roman / English) + "✎ Edit lyrics" + "+ Add translation" buttons + empty state with "+ Contribute lyrics" CTA.
- Current `LyricsDisplay` has Radix tab nav (Arabic / Urdu / English / Romanized) but **no edit/add links** and returns `null` on empty.
- Current has `<MediaToggle>` for YouTube tracks — POC has no equivalent.
- Current emits JSON-LD via `JsonLd` for SEO — POC has none (kept).

**Decisions:**
- [x] **D1: URL strategy** — Keep nested `/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]`. POC's flat URL was a prototype convenience that would need a globally-unique slug migration we don't want. ✅
- [x] **D2: Hero treatment** — Option A (full POC fidelity). New `<TrackHero>` component replaces `<TrackHeader>` + `<TrackActions>`: 2-col cover-left/title-right, red radial glow, "NAWHA TRACK" uppercase eyebrow, clamp(40px,6vw,72px) Fraunces weight-400 title, reciter pill (28px accent-circle initials + name in surface-2 pill), action row (lg `<TrackDetailPlayButton variant="hero">` + `<SaveButton>` in 44px circle wrapper + "Suggest edit" pill linking to `/contribute/edit/track/...` + stub `⋯` overflow). Page container bumped `md` → `xl` (1280px). `<LikeButton>` no longer surfaced on the track hero (POC has only one heart-style action; Save kept as canonical). Orphaned `track-header.tsx` + `track-actions.tsx` deleted along with their tests. ✅
- [x] **D3: Body sidebar** — Option A. New `<TrackSidebar>` rendering the album mini-card + a related-tracks list (8 items). Body laid out as 2-col `[1.6fr_1fr]` below the waveform; lyrics live in the left column. Related = "other tracks by the same reciter, excluding this one, ordered by createdAt desc". New tRPC procedure `track.getRelated({ trackId, limit })` (default 8, max 16). ✅
- [x] **D4: Lyrics chrome** — Option A. `<LyricsDisplay>` updated: gained an `editHref` prop, renders inline "✎ Edit lyrics" + "+ Add translation" pills next to the language tabs, replaces the early-return-null with a proper empty-state card containing a "+ Contribute lyrics" CTA. Title bumped to POC's serif 28px weight-400 with -0.02em tracking. Page now passes `editHref={`/contribute/edit/track/${reciterSlug}/${albumSlug}/${trackSlug}`}` and renders the component unconditionally so lyrics-less tracks still surface the contribute affordance. ✅
- [x] **D5: Breadcrumb** — Option B: 4-level breadcrumb (Home • Reciter • Album • Track) above the hero. New `<TrackBreadcrumb>` Server Component with semantic `<nav>` + `<ol>`; first three crumbs link to their pages, last crumb is plain text with `aria-current="page"`. ✅
- [x] **D6: MediaToggle/YouTube** — Option B: dropped the Listen/Watch tab switcher (Listen tab was redundant with the new hero play button), now renders `<YoutubeEmbedSlot>` directly under a "Watch on YouTube" section heading when `track.youtubeId` is set. `media-toggle.tsx` and its two test files (one in `src/components/tracks/__tests__`, one in `src/__tests__/components`) deleted. ✅

**Action items:**
- ✅ Hero rewrite: `apps/web/src/components/tracks/track-hero.tsx` (new). Test in `__tests__/track-hero.test.tsx`.
- ✅ `TrackDetailPlayButton` gained a `hero` variant (bare 56px circle) — `apps/web/src/components/player/track-detail-play-button.tsx`.
- ✅ Page wired: `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx` now uses `<TrackHero>` and `Container size="xl"`. Existing `<MediaToggle>` retained for YouTube tracks (D6 will revisit).
- ✅ i18n: new `trackDetail` namespace with `eyebrow`, `suggestEdit`, `moreOptions` keys.
- 🗑️ Deleted: `track-header.tsx`, `track-actions.tsx`, and their tests. `<LikeButton>` retained (no consumers right now).
- ✅ Sidebar: `apps/web/src/components/tracks/track-sidebar.tsx` (new) + test in `__tests__/track-sidebar.test.tsx`.
- ✅ Backend: `track.getRelated` procedure added in `apps/web/src/server/routers/track.ts` (returns `TrackListItemDTO[]`, default 8). Inline `trackListItemColumns` projection (duplicated from home router; promote to shared lib later if a third consumer appears).
- ✅ Page: 2-col `[1.6fr_1fr]` body grid below the waveform; lyrics in left column, sidebar in right.
- ✅ i18n: `trackDetail.sidebar` keys (`regionLabel`, `albumHeading`, `relatedHeading`).
- ✅ Lyrics chrome: `apps/web/src/components/tracks/lyrics-display.tsx` updated with `editHref` prop, empty-state card, contribution pills. Tests updated in `__tests__/lyrics-display.test.tsx`. New i18n keys under `trackDetail.lyrics`.
- ✅ Breadcrumb: `apps/web/src/components/tracks/track-breadcrumb.tsx` (new) + test in `__tests__/track-breadcrumb.test.tsx`. Wired above `<TrackHero>` in the page. New `trackDetail.breadcrumb` i18n keys.
- ✅ MediaToggle simplified: page now renders `<YoutubeEmbedSlot>` directly inside a labelled section when `youtubeId` exists. New `trackDetail.watch.heading` i18n key. Deleted: `media-toggle.tsx` + the duplicate test files at `src/components/tracks/__tests__/media-toggle.test.tsx` and `src/__tests__/components/media-toggle.test.tsx`.

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
