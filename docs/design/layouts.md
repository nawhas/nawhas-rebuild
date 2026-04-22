# Page Layouts — Legacy vs Rebuild Audit

> **Source of truth:** per-page skeletons and shared-chrome structure for production `nawhas.com`, extracted code-first from `github.com/nawhas/nawhas@master` via `gh api`. Each entry compares legacy against the rebuild's equivalent route in `apps/web/app/`. Skeleton-level only — detailed component specs belong in Phase 2.3.
>
> **Shared chrome** (header, footer, persistent player bar) is documented once up front and referenced by each page entry.
>
> **Live-pages scope** is defined by the Phase 2.1 liveness sweep. Pages excluded per the roadmap's non-goals (stories, draft-lyrics diff viewer, print-lyrics, moderator tooling that never went live) are deliberately absent from this audit.

## Shared chrome

### Global header

**Legacy source:** `nawhas/nawhas:nuxt/layouts/default.vue#L27-66` (the `<v-app-bar>` block) + `nuxt/components/navigation/UserMenu.vue` and `nuxt/components/search/GlobalSearch.vue` imports at `#L93-95`.
**Rebuild source:** `apps/web/app/layout.tsx#L82` (mounts `<SiteHeaderDynamic />`) → `apps/web/src/components/layout/header.tsx#L32-86` + `apps/web/src/components/layout/nav-links.tsx`, `user-menu.tsx`, `mobile-nav.tsx`, `apps/web/src/components/search/search-bar.tsx`, `mobile-search-overlay.tsx`, `apps/web/src/components/theme/ThemeToggle.tsx`.

**Legacy skeleton:**
```
v-app-bar (fixed, white bg in light, 64px / 56px on sm-down, elevate-on-scroll)
  v-container.app-bar__container
    .app-bar__left
      v-app-bar-nav-icon (hamburger, md-and-down only → toggles v-navigation-drawer)
      v-toolbar-title  → nuxt-link /  (LogoIcon + LogoWordmark svg)
      nav.nav__buttons (lgAndUp only) [Home] [Browse] [Library] [About]
    .app-bar__center  (empty spacer)
    .app-bar__right
      <global-search /> (icon button → opens search dialog, no route)
      <user-menu />    (avatar menu → login dialog when signed out)
v-navigation-drawer (temporary, off-canvas, mdAndDown) — same 4 links as icon list
```

**Rebuild skeleton:**
```
nav.sticky.top-0.z-40.border-b.bg-white  (h-16, no elevate-on-scroll)
  a.sr-only  "Skip to main content"
  Container.flex.h-16.justify-between
    Link /  (text wordmark only, no icon svg)
    NavLinks.hidden.md:flex  [Home] [Browse reciters] [Browse albums]  (no Library, no About)
    <SearchBar />             (inline input, desktop only — see search page for divergence)
    div.hidden.md:flex  [ThemeToggle] [UserMenu | Sign in <Link>]
    <MobileSearchOverlay />   (icon trigger, md:hidden)
    <MobileNav />             (hamburger, md:hidden → absolute dropdown below header)
```

**Delta:**
- Logo: legacy ships an SVG icon + wordmark pair; rebuild is plain text `t('logoText')` (no mark). Deferred: visual wordmark parity.
- Nav items differ by composition: legacy has Home / Browse / Library / About; rebuild has Home / Browse reciters / Browse albums — Library and About are absent from the top nav (Library lives only at `/library/tracks` via deep link; `/about` has no rebuild equivalent per `## Pages` below).
- Search: legacy opens a **dialog component** from an icon trigger (no URL). Rebuild uses an inline `SearchBar` input on desktop and a full-screen overlay on mobile, and also has a dedicated `/search` route — a structural divergence flagged in the Phase 2.1 roadmap.
- Auth entry point: legacy `UserMenu` opens a **login dialog** in-place; rebuild routes to `/login` via `<Link>`.
- Theme toggle: legacy has none in the header (theme is in a preferences route); rebuild exposes `ThemeToggle` inline on desktop and in the mobile drawer.
- Mobile menu mechanism: legacy uses Vuetify `v-navigation-drawer` (off-canvas left slide-in with 4 icon+label tiles). Rebuild uses an absolutely-positioned dropdown `div` below the header with plain text links + theme toggle + auth block.
- Scroll-shadow elevation: legacy has `elevate-on-scroll`; rebuild uses a static `border-b`. Deferred: visual verify whether the flat border reads as too weak on light backgrounds.

### Global footer

**Legacy source:** `nawhas/nawhas:nuxt/layouts/default.vue#L75` mounts `<app-footer />` → `nuxt/components/AppFooter.vue#L1-21`.
**Rebuild source:** `apps/web/app/layout.tsx#L82` passes `footer={<></>}` to `PageLayout` → `apps/web/src/components/layout/page-layout.tsx#L30` still renders a `<footer role="contentinfo">` but it is empty.

**Legacy skeleton:**
```
v-footer.footer
  v-container.footer-content  (flex, space-between)
    .content__section--left    → nuxt-link /about         "About"
    .content__section--center  → nuxt-link /              <footer-icon /> svg
    .content__section--right   → a (prevent) @click       "Feedback" → EventBus → BugReportForm dialog
```

**Rebuild skeleton:**
```
<footer role="contentinfo">  (always rendered as empty landmark)
  (no children)
```

**Delta:**
- Rebuild has no visible footer content at all — the `<footer>` landmark is mounted with an empty fragment. Legacy's three links (About, brand icon, Feedback) have no equivalent.
- About link: legacy footer is one of the two entry points to `/about`; rebuild has no `/about` page (see `## Pages` → About).
- Feedback affordance: legacy opens a global `BugReportForm` dialog (see Global notifications / dialogs below); rebuild has no feedback surface.
- Brand-mark footer icon: legacy re-states identity at page end; rebuild omits. Deferred: decide if rebuild needs a footer landmark with links or should swap the empty element for a real one.

### Persistent player bar

**Legacy source:** `nawhas/nawhas:nuxt/layouts/default.vue#L76` mounts `<audio-player />` → `nuxt/components/audio-player/AudioPlayer.vue#L1-280` (template) + `#L853-868` (fixed-bottom `.audio-player` rules, upward box-shadow) + `nuxt/assets/app.scss#L27-31` (body reservation via `.app--player-showing .main-container { padding-bottom: 80px !important }`). Layout class toggle at `default.vue#L170-175`.
**Rebuild source:** `apps/web/app/layout.tsx#L85-86` mounts `<PlayerPanels />` + `<PlayerBarLazy />` outside `PageLayout` → `apps/web/src/components/player/PlayerBar.tsx#L196-383` (desktop bar) and `apps/web/src/components/player/MobilePlayerOverlay.tsx#L190-360` (separate full-screen overlay).

**Legacy skeleton:**
```
v-sheet.audio-player (fixed bottom, 80px tall, z-500, shadow UP 0 -2px 8px 4px rgba(0,0,0,.16))
  # Desktop (single row, hover grows horizontally via width transition):
    .artwork (80px img)  .player-content[ track-info | seek-bar | player-actions | player-sub-actions (queue/lyrics/volume menus) ]
  # Mobile minimized (default on sm-): thin bar, same row
    .artwork  .track-info  .seek-bar  [fav] [play] [overflow-menu]
  # Mobile maximized (toggleMinimized): full-screen viewport
    mobile-header (expand_more collapse chevron)
    artwork (full-width, swaps with LyricsOverlay or QueueList via fade transition)
    track-info + seek-bar + large playback controls
  Body reservation: <v-app class="app--player-showing"> applied when track != null → main-container gets padding-bottom:80px
```

**Rebuild skeleton:**
```
<PlayerBar> div.fixed.bottom-0.z-50.shadow-lg  (shadow-lg = DOWN, off-viewport, wasted)
  div.h-1 seek-bar (range input overlaid on progress fill)
  div.flex.px-4.py-2
    button (track-info tap target; opens MobilePlayerOverlay via openMobileOverlay)
      MusicNoteIcon placeholder  title  (reciter name empty — TODO in code)  ExpandIcon (md:hidden)
    <SaveButton />
    center: [Shuffle] [Prev] [Play/Pause] [Next]
    right: time   [VolumeSlider hidden md:flex]   [QueueToggle]
<MobilePlayerOverlay> div.fixed.inset-0.z-[60]  (separate component, mobile-only UX)
  [ChevronDown collapse] [Close]   large art placeholder   title   seek bar
  [Shuffle] [Prev] [Play/Pause h-16] [Next]   <LyricsDisplay /> when currentLyrics.length > 0
<QueuePanel> lazy-mounted side panel toggled from PlayerBar queue button
Body reservation: NONE — <main> never adds pb-20 when a track is loaded.
```

**Delta:**
- Shape: legacy is **one morphing component** (`v-sheet.audio-player`) that animates between minimized bar, expanded desktop bar, and full-screen mobile takeover via `minimized`/`mobile` flags on the same DOM. Rebuild splits responsibilities across three discrete components — `PlayerBar` (always-on bottom row), `MobilePlayerOverlay` (separate `z-[60]` full-screen dialog), and `QueuePanel` (side panel).
- **Bug — downward shadow (from tokens audit):** legacy hand-rolls `box-shadow: 0 -2px 8px 4px rgba(0,0,0,0.16)` casting **upward** into the page to separate bar from content (`AudioPlayer.vue#L862`). Rebuild uses Tailwind `shadow-lg` (`PlayerBar.tsx#L205`), which casts **downward** below the viewport and is visually wasted.
- **Bug — no body reservation (from tokens audit):** legacy toggles `app--player-showing` on the root `<v-app>` whenever `store.getters['player/track'] !== null` (`default.vue#L173`), reserving `padding-bottom: 80px` on `.main-container` (`app.scss#L27-31`). Rebuild's `<main>` in `page-layout.tsx` is unaware of the player's visibility and never adds `pb-20` — long-scrolling pages occlude their last rows behind the 64-72px bar.
- Morphing vs swap: legacy plays smooth width/height/position transitions (`$duration: 580ms cubic-bezier(0.4,0,0.2,1)` at `AudioPlayer.vue#L850-851`) between mini and full-screen. Rebuild does a hard show/hide on `PlayerBar` (CSS `translate-y` in/out) and slides `MobilePlayerOverlay` up as a distinct surface — no single-element morph.
- Artwork: legacy renders `<img :src="artwork">` when track has art; rebuild hardcodes an inline `MusicNoteIcon` placeholder in both components (no artwork wiring — `PlayerBar.tsx#L249-254`, `MobilePlayerOverlay.tsx#L245-248`). Deferred: album-art data flow.
- Reciter name: legacy shows `{{ track.reciter.name }} • {{ track.year }}` under the title; rebuild renders an empty `<p>` with an inline `TODO`-style comment (`PlayerBar.tsx#L262`). Known data-model gap.
- Controls parity: legacy has shuffle / prev / play / next / repeat + queue menu + lyrics overlay + volume via Howler default; rebuild has shuffle / prev / play / next + queue toggle + desktop volume slider. Missing in rebuild: **repeat mode** (legacy has `repeat | repeat_one`), **lyrics overlay inside the player** on mobile-expanded (rebuild surfaces lyrics only via `MobilePlayerOverlay` — rough parity but different affordance).
- Queue UX: legacy shows the queue as a fade-in overlay over the artwork on mobile-expanded and as a `v-menu` dropdown on desktop; rebuild uses a side-mounted `QueuePanel`.

### Global notifications / dialogs

**Legacy source:** `nawhas/nawhas:nuxt/layouts/default.vue#L77-87` mounts `<update-service-worker />`, `<toaster />`, and a `<v-dialog v-model="showBugReportDialog">` wrapping `<bug-report-form />`, all toggled via an app-wide `EventBus`.
**Rebuild source:** `apps/web/app/layout.tsx` — none of these equivalents are present at the root layout (`ThemeProvider` + `AudioProvider` + `NextIntlClientProvider` only).

**Delta:**
- Rebuild has **no global toast/snackbar surface** mounted at the root layout. Any transient feedback today relies on per-feature inline banners or is simply absent.
- Rebuild has **no service-worker update prompt**. Legacy's `UpdateServiceWorker` component announces new deployments; rebuild (Next.js App Router) has no installed SW and no PWA-update affordance.
- Rebuild has **no feedback / bug-report dialog**. Legacy's `BugReportForm` was reachable from both `UserMenu` and the footer's Feedback link via `EventBus → SHOW_FEEDBACK`; rebuild has no surface for this and no `EventBus` equivalent.

## Pages

### Home — `/`

**Legacy route file:** `nawhas/nawhas:nuxt/pages/HomePage.vue` (route declared inside `<router>` block, `#L1-4`)
**Legacy layout wrapper:** `default` (from `nuxt/layouts/default.vue`)
**Rebuild route file:** `apps/web/app/page.tsx`

**Purpose:** discovery landing page — hero + search, trending tracks, saved tracks (auth), a quote banner, top reciters, and a top-nawhas list.

**Legacy skeleton:**
```
header.header (radial red gradient; dark-mode swap at #L247-249)
  v-container.app__section  →  h1.header__title  "Explore the most advanced library of nawhas online."  (Roboto 200 / 64px / 75px / -1.5px — #L264-271; 48px on md-and-down at #L273-279; 32px xs-only at #L286-293)
  .search (absolute, overlaps header bottom) → <global-search hero />
v-container  h5.section__title  "Trending This Month"     →  v-row of <track-card colored show-reciter/> × 6 (or <skeleton-card-grid>)
v-container  h5.section__title  "Latest Stories"          →  <story-card-grid :stories="homeStories"/>          (conditional: only if $api.stories.index() returns items)
v-container  section__title "♥ Recently Saved Nawhas"     →  v-row of <track-card/> × 6 + "View All" → /library/tracks, empty → <saved-tracks-empty-state/>  (auth-gated)
<hero-banner background=imam-hussain-header.jpg class="my-12">  →  <hero-quote author="Imam Jafar Sadiq (a.s.)">…</hero-quote>
v-container  section__title--with-actions "Top Reciters" + "View All" → /reciters  →  v-row of <reciter-card featured/> × 6
v-container  h5.section__title  "Top Nawhas"              →  v-card wrapping <track-list :tracks metadata numbered :count="20"/>
```

**Legacy key components:**
- `<global-search hero>` at `nawhas/nawhas:nuxt/components/search/GlobalSearch.vue` — hero-mode inline search affordance over the header.
- `<track-card>` at `nawhas/nawhas:nuxt/components/tracks/TrackCard.vue` — colour-tinted track cell with play / save affordances.
- `<reciter-card featured>` at `nawhas/nawhas:nuxt/components/ReciterCard.vue` — rounded avatar tile with name + stats.
- `<hero-banner>` + `<hero-quote>` at `nawhas/nawhas:nuxt/components/HeroBanner.vue`, `nuxt/components/HeroQuote.vue` — full-bleed background + centered attributed quotation.
- `<story-card-grid>` at `nawhas/nawhas:nuxt/components/stories/StoryCardGrid.vue` — grid of story cards (excluded per roadmap non-goals).
- `<track-list metadata numbered :count="20">` at `nawhas/nawhas:nuxt/components/tracks/TrackList.vue` — numbered metadata-rich track table.

**Legacy interactions:** hero search icon opens `GlobalSearch` dialog (no URL change); track-cards play on click and push a saved-watcher via `$store.state.library.trackIds`; auth state change re-fetches saved tracks (`watch '$store.state.auth.user'`); "View All" buttons deep-link to `/library/tracks` and `/reciters`.

**Rebuild skeleton:**
```
<div.py-10>
  <Container>
    <h1 class="sr-only">  "Nawhas — Discover Recitations"   (no visible hero, no search affordance)
    <div.flex.flex-col.gap-12>
      <FeaturedReciters reciters={featured.reciters}>   section "Featured Reciters" → grid-cols-3/4/6 of <ReciterCard/>
      <RecentAlbums albums={featured.albums}>           section "Recent Albums"     → grid-cols-2/3/4/6 of <AlbumCard/>
      <PopularTracks tracks={featured.tracks}>          section "Popular Tracks"    → numbered <ol> with title + duration
```

**Rebuild key components:**
- `FeaturedReciters` at `apps/web/src/components/home/featured-reciters.tsx` — responsive grid wrapping `components/cards/reciter-card.tsx`.
- `RecentAlbums` at `apps/web/src/components/home/recent-albums.tsx` — responsive grid wrapping `components/cards/album-card.tsx` (LCP-priority on first card).
- `PopularTracks` at `apps/web/src/components/home/popular-tracks.tsx` — static numbered list of titles + durations (no play affordance yet).

**Delta:**
- **No hero.** Rebuild has a single `sr-only` h1 and jumps straight into section grids; the red-gradient header with the Roboto-200 64px slogan and inline hero search is gone. Deferred: whether to port the hero with corrected typography tokens or design a new landing treatment.
- **No saved-tracks-for-you strip.** Legacy shows the last six saved tracks with "View All" when signed in; rebuild has no personalised row on `/`.
- **No hero quote banner.** The `<hero-banner>` + `<hero-quote>` pairing (Imam Jafar Sadiq quotation over `imam-hussain-header.jpg`) has no rebuild equivalent.
- **No `TrackList` "Top Nawhas" table.** Legacy closes the page with a numbered metadata-rich table of 20 tracks; rebuild's `PopularTracks` is a minimal title + duration list with no play/save metadata.
- **IA reshape.** Legacy ordering: hero → trending tracks → stories → saved → quote → top reciters → top nawhas. Rebuild: reciters → albums → popular tracks. Albums are newly surfaced on home; reciters moved from mid-page to top.
- **Latest Stories intentionally dropped.** Legacy renders `<story-card-grid>` when `$api.stories.index()` returns items; the rebuild excludes stories per roadmap non-goals. Documented here only for historical parity; do not port.

→ detail deferred to Phase 2.3 spec for Home

### Reciter profile — `/reciters/:slug`

**Legacy route file:** `nawhas/nawhas:nuxt/pages/ReciterProfilePage.vue` (route `/reciters/:reciter` declared inside `<router>` block, `#L1-4`)
**Legacy layout wrapper:** `default`
**Rebuild route file:** `apps/web/app/reciters/[slug]/page.tsx`

**Purpose:** public reciter profile — hero with avatar + name over an Azadari-flags backdrop, popular tracks grid, and paginated albums list.

**Legacy skeleton:**
```
.reciter-profile
  <hero-banner background=azadari-flags.jpg :class="reciter-profile__hero--with-toolbar">
    .hero__content  → v-avatar (88px sm, 128px md+, 4px white border + elevation-4) + .hero__title (1.6rem / Roboto / weight 300, centered)
    .hero__bar (absolute bottom, deep-orange darken-4) — shown only when isModerator (#L199-201)
      left:  [<v-icon>public</v-icon> Website] [<v-icon>star_outline</v-icon> Favorite]   (non-functional placeholders in legacy)
      right: <edit-reciter-dialog v-if="isModerator"/>  + [<v-icon>more_vert</v-icon>]
  v-container  h5.section__title  "Top Nawhas"  →  v-row of <track-card show-reciter=false/> × 6 (or <skeleton-card-grid>)
  v-container#albums-section  section__title--with-actions "Albums" + <edit-album-dialog v-if="isModerator"/>
    → v-for <album :album :reciter show-reciter=false/>   +   <v-pagination v-model="page" color="deep-orange"/>    (empty-state copy when albums.length === 0)
```

**Legacy key components:**
- `<hero-banner>` at `nawhas/nawhas:nuxt/components/HeroBanner.vue` — reused full-bleed background; toolbar variant is a local child class.
- `<lazy-image>` at `nawhas/nawhas:nuxt/components/utils/LazyImage.vue` — avatar image with placeholder.
- `<track-card>` at `nawhas/nawhas:nuxt/components/tracks/TrackCard.vue` — same card as home.
- `<album>` at `nawhas/nawhas:nuxt/components/albums/Album.vue` — full album strip (artwork + metadata + track list) per entry in the discography.
- `<edit-reciter-dialog>` at `nawhas/nawhas:nuxt/components/edit/EditReciterDialog.vue` — moderator-only inline dialog for editing the reciter.
- `<edit-album-dialog>` at `nawhas/nawhas:nuxt/components/edit/EditAlbumDialog.vue` — moderator-only inline dialog for creating / editing an album from the discography toolbar.

**Legacy interactions:** route-query `?page=N` drives pagination (`onPageChanged` pushes `{ query: { page } }` and `onQueryChanged` re-fetches + scrolls to `#albums-section`); moderator affordances appear inline in the hero bar and album section title; `getPage($route)` reads the starting page from the query string.

**Rebuild skeleton:**
```
<div.py-10>
  <JsonLd data={buildReciterJsonLd(reciter)} />
  <Container>
    <ReciterHeader reciter>  div.flex.items-center.gap-4
      div (24×24 rounded-full bg-gray-200) → 2-letter initials   (no avatar image, no backdrop)
      h1.text-3xl.font-bold → reciter.name  +  p.text-sm → "N albums"
    <div.mt-8> <ReciterDiscography albums>
      h2 "Discography"  → grid-cols-2/3/4/5 of <AlbumCard/>  (or "No albums available yet.")
```

**Rebuild key components:**
- `ReciterHeader` at `apps/web/src/components/reciters/reciter-header.tsx` — initials avatar + name + album count, no image, no CTAs.
- `ReciterDiscography` at `apps/web/src/components/reciters/reciter-discography.tsx` — flat responsive grid of `AlbumCard`s, no per-album expand.

**Delta:**
- **Hero reduced to a header strip.** Legacy ships a full-bleed `azadari-flags.jpg` backdrop, 88 / 128px bordered avatar, and a 1.6rem centered name; rebuild renders a plain `flex` row with an initials placeholder — no image, no background. Deferred: port avatar + backdrop when media pipeline is wired.
- **No pagination.** Legacy paginates albums via `?page=` and scrolls to `#albums-section`; rebuild renders the full discography as a single grid with no paging.
- **Moderator affordances split out.** Legacy inlines `<edit-reciter-dialog>` and `<edit-album-dialog>` in the hero bar and album-section title, gated by `isModerator` from Vuex `auth` getters. Rebuild has **no inline edit affordances on this page** — moderator / contributor edits live at `/contribute/edit/reciter`, `/contribute/edit/album`, `/contribute/album/new` (and role-gated `/mod/*`). The public profile is read-only.
- **"Top Nawhas" section dropped.** Legacy's popular-tracks grid (6 cards + `section__title` 1.4rem) has no rebuild equivalent on this page.
- **Per-album expansion dropped.** Legacy's `<album>` component renders each album as a strip with artwork + metadata + nested track list; rebuild shows only album cards and defers the track list to `/albums/[slug]`.
- Typography: legacy hero title uses centered Roboto 1.6rem / weight 300; rebuild uses `text-3xl font-bold` left-aligned (divergence captured in `tokens.md` typography section).

→ detail deferred to Phase 2.3 spec for Reciter profile

### Album — legacy `/reciters/:reciter/albums/:album`, rebuild `/albums/[slug]`

**Legacy route file:** `nawhas/nawhas:nuxt/pages/AlbumPage.vue` (route `/reciters/:reciter/albums/:album` declared inside `<router>` block, `#L1-4`)
**Legacy layout wrapper:** `default`
**Rebuild route file:** `apps/web/app/albums/[slug]/page.tsx`  (no duplicate: the `reciters/[slug]/albums/[albumSlug]/` tree holds only the nested `tracks/[trackSlug]/page.tsx`, no album page)

**Purpose:** album detail — Vibrant-derived tinted hero with artwork + title + reciter/year/track-count metadata, then a numbered track list with play-album / add-to-queue CTAs.

**Legacy skeleton:**
```
.hero (Vibrant-derived background; default rgb(47,47,47) until Vibrant returns — #L230-251)
  v-container.hero__content (flex row)
    v-avatar.hero__artwork (96/128/192px tile, 4px white border)   <lazy-image crossorigin>
    .hero__text
      h4.hero__title   (Roboto Slab / bold / 2.4rem; 1.9rem sm-and-down; 1.4rem xs — #L320-324, #L379, #L391)
      .hero__meta
        router-link → getReciterUri(reciter):   <v-icon>album</v-icon>  "Album • {reciter.name} • {album.year}"
        div:                                     <v-icon>playlist_play</v-icon>  "{tracks} tracks"
  .hero__bar (absolute bottom; shown when hasPlayableTracks OR isModerator)
    left:  [play_circle_filled Play Album]  [playlist_add Add to Queue | done Added to Queue]
    right: <edit-album-dialog v-if="isModerator"/>
v-container.app__section
  section__title--with-actions "Tracks" + <edit-track-dialog v-if="isModerator"/>
  <track-list :tracks numbered/>
<v-snackbar v-model="addedToQueueSnackbar" right> ... "Added to Queue" [Close]
```

**Legacy key components:**
- `<lazy-image crossorigin>` at `nawhas/nawhas:nuxt/components/utils/LazyImage.vue` — artwork with `crossorigin` required so Vibrant can sample pixels.
- `<track-list numbered>` at `nawhas/nawhas:nuxt/components/tracks/TrackList.vue` — numbered track table (shared with HomePage).
- `<edit-album-dialog>` at `nawhas/nawhas:nuxt/components/edit/EditAlbumDialog.vue` — moderator-only.
- `<edit-track-dialog>` at `nawhas/nawhas:nuxt/components/edit/EditTrackDialog.vue` — moderator-only.

**Legacy interactions:** `mounted()` calls `Vibrant.from(image).getPalette()` and writes `DarkMuted` swatch → `background` + `textColor` (hero theming is data-driven per artwork); `playAlbum` commits `player/PLAY_ALBUM` with playable tracks; `addToQueue` commits `player/ADD_ALBUM_TO_QUEUE` + shows a right-anchored snackbar; reciter name in metadata links back via `getReciterUri()`.

**Rebuild skeleton:**
```
<main#main-content.py-10>
  <JsonLd data={buildAlbumJsonLd(album)} />
  <Container>
    <AlbumHeader album>   flex row  →  <AppImage 192/224px rounded-lg> (or music-note SVG placeholder)  +  h1.text-3xl.font-bold  +  <Link to /reciters/[slug]> reciterName  +  year  +  "N tracks"   (no tinted background, no Vibrant)
    <div.mt-4> <PlayAllButton tracks>
    <div.mt-8> <TrackList tracks reciterSlug albumSlug>   h2 "Tracks"   →  <ol>  →  <TrackListItem href=/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]>
```

**Rebuild key components:**
- `AlbumHeader` at `apps/web/src/components/albums/album-header.tsx` — artwork + title + reciter-link + year / track-count.
- `PlayAllButton` at `apps/web/src/components/player/play-all-button.tsx` — single CTA replacing legacy's Play + Add-to-Queue pair.
- `TrackList` + `TrackListItem` at `apps/web/src/components/albums/track-list.tsx`, `.../track-list-item.tsx` — numbered `<ol>` with per-row play affordance.

**Delta:**
- **URL flattened.** Legacy `/reciters/:reciter/albums/:album` (album is a child of its reciter) → rebuild `/albums/[slug]` (top-level, slug-only). The reciters tree still hosts the nested track route at `/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]`, but no album page lives there — no duplication.
- **No Vibrant-derived hero theming.** Legacy samples the artwork and tints the hero background + text; rebuild renders a plain neutral header with no per-album theming.
- **Typography divergence.** Legacy title is Roboto Slab bold 2.4rem (responsive 1.9rem / 1.4rem); rebuild uses `text-3xl font-bold` in the default sans stack with no responsive down-step. Recorded in `tokens.md`.
- **CTA pair collapsed.** Legacy has [Play Album] + [Add to Queue / Added to Queue toggle] + snackbar feedback; rebuild has a single `<PlayAllButton>`. No queue-add affordance, no snackbar.
- **Moderator edit dialogs absent.** Both `<edit-album-dialog>` (hero bar) and `<edit-track-dialog>` (section title) are gone; contributor/moderator flows live at `/contribute/edit/album`, `/contribute/edit/track` and `/mod/*`.
- **Metadata line.** Legacy renders a single line "Album • {reciter} • {year}" with an `album` icon, plus a separate "N tracks" line with a `playlist_play` icon, both inside the hero. Rebuild exposes reciter as a `<Link>` below the title, with year + track count as a small wrap row — same data, flatter treatment.

→ detail deferred to Phase 2.3 spec for Album

### Track — legacy `/reciters/:reciter/albums/:album/tracks/:track`, rebuild `/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]`

**Legacy route file:** `nawhas/nawhas:nuxt/pages/TrackPage.vue` (route declared inside `<router>` block, `#L1-4`)
**Legacy layout wrapper:** `default`
**Rebuild route file:** `apps/web/app/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]/page.tsx`

**Purpose:** the canonical track surface — Vibrant-tinted hero with artwork + title + reciter/album metadata + play / add-to-queue / favourite / print controls, an 8-column synchronised lyrics card, and a 4-column right rail with an optional YouTube card and the album's sibling-track list.

**Legacy skeleton:**
```
.hero (Vibrant-derived background + textColor; default rgb(150,37,2) until Vibrant returns — TrackPage.vue#L258-262, #L361-375)
  v-container.hero__content (flex row)
    v-avatar.hero__artwork (96/128/192px tile, 4px white border) <lazy-image crossorigin>
    .hero__text
      h4.hero__title           (Roboto Slab / bold / 2.4rem; 1.9rem sm-and-down; 1.4rem xs — #L447-451, #L571-589)
      .hero__meta
        router-link → reciterUri: reciter.name
        router-link → albumUri:   "{album.year} • {album.title}"
  .hero__bar (absolute bottom, rgba(0,0,0,.2))
    left:  [play_circle_filled Play | stop Stop]  [playlist_add Add to Queue | playlist_add_check Added to Queue]
    right: <edit-draft-lyrics/> <favorite-track-button/> [print] <edit-track-dialog v-if="isModerator"/>
v-container.app__section  v-row
  v-col md="8"  <lyrics-card :track dusk="lyrics-card"/>   (title "Write-Up", `assistant` badge when synced)
  v-col md="4"
    v-card.card--video  v-if="video"                       (title "Video" + `ondemand_video` icon, `<youtube>` embed — client-only)
    v-card.card--album                                      (title "More From This Album" + `format_list_bulleted`, numbered nuxt-links to sibling `getTrackUri(t, reciter)`, active-class tints row)
v-snackbar v-model="addedToQueueSnackbar" right            ("Added to Queue" + [Undo] [Close])
```

**Legacy key components:**
- `<lyrics-card>` at `nawhas/nawhas:nuxt/components/lyrics/LyricsCard.vue` — 8-col titled v-card wrapping `<lyrics-renderer>`, shows an `assistant`-icon tooltip ("New! Write-up synchronized with audio") when the lyrics JSON has `meta.timestamps`.
- `<lyrics-renderer>` at `nawhas/nawhas:nuxt/components/lyrics/LyricsRenderer.vue` — JSON-v1 renderer; owns a `LyricsHighlighter` util constructed from `store.state.player` when `isCurrentlyPlaying` and emits `highlight:changed` on active-group change (`#L54, #L101-117`); monospaced timestamps (Roboto Mono) shown at 45px left gutter.
- `<lyrics-overlay>` at `nawhas/nawhas:nuxt/components/audio-player/LyricsOverlay.vue` — reuses the same `<lyrics-renderer>` inside the morphing AudioPlayer and wires `highlight:changed → scrollIntoView({ block: 'center', behavior: 'smooth' })` (the Track-page `LyricsCard` does **not** scroll).
- `<favorite-track-button>`, `<edit-draft-lyrics>`, `<edit-track-dialog>` — hero-bar action cluster (`nuxt/components/tracks/FavoriteTrackButton.vue`, `nuxt/components/edit/EditDraftLyrics.vue`, `nuxt/components/edit/EditTrackDialog.vue`); last is moderator-only.
- `<youtube>` (vue-youtube plugin) — embed inside `<client-only>` when `track.video` yields an id via `getYouTubeID()`.
- `<lazy-image crossorigin>` at `nawhas/nawhas:nuxt/components/utils/LazyImage.vue` — artwork with `crossorigin` so Vibrant can sample pixels (same as Album).

**Legacy interactions:** `mounted()` calls `Vibrant.from(image).getPalette()` → `DarkMuted` swatch → `background` + `textColor` (per-artwork hero theming, same pattern as Album, `TrackPage.vue#L361-375`); `playAlbum` commits `player/PLAY_ALBUM` with `albumTracks` + `start: this.track`; `addToQueue` commits `player/ADD_TO_QUEUE` and flips `addedToQueueSnackbar` (with Undo); `print` opens `/print/:reciter/:year/:track` in a sized popup and is bound to `window.beforeprint`. Lyrics highlight-sync: `LyricsHighlighter` watches player time → rerender applies `.lyrics__group--highlighted` on the matching group, active only when this track is the currently-playing track (`LyricsRenderer.vue#L83-112`). No click-to-seek on timestamps; no language switch — the track carries a single lyrics document, so multi-language is **deferred: visual verify**. The overlay variant scrolls the highlighted group into view; the Track-page `LyricsCard` does not auto-scroll.

**Rebuild skeleton:**
```
<div.py-10>
  <JsonLd data={buildTrackJsonLd(track, reciterSlug, albumSlug, trackSlug)} />
  <Container size="md">
    <TrackHeader track>   header.py-8   h1.text-3xl.font-bold → track.title   +   flex row: <Link reciter> · <Link album> · year · "Track N" · time   (no artwork, no hero bg, no Vibrant)
    <TrackActions trackId>   flex row  [<SaveButton/>] [<LikeButton/>]
    track.youtubeId ?
      <MediaToggle track>   rounded-lg tablist  [Listen | Watch]  →  <TrackDetailPlayButton/> or <YoutubeEmbedSlot youtubeId/>
    :
      <TrackDetailPlayButton track lyrics/>   h-14 rounded-lg  [play/pause button] + live status "Now playing | Paused | Play this track"
    track.lyrics.length > 0 &&
      <div.mt-10> <LyricsDisplay lyrics/>   section "Lyrics"   tablist "Lyrics language" [Arabic|Urdu|English|Romanized] (only if >1 available)   per-lang <ArabicText/> or <UrduText/> or <p whitespace-pre-wrap>  (LTR scoped; localStorage persistence via `nawhas-lyrics-language`)
```

**Rebuild key components:**
- `TrackHeader` at `apps/web/src/components/tracks/track-header.tsx` — plain `<header>` with title + linked reciter / album / year / track# / duration dots, no image, no tinted background.
- `TrackActions` at `apps/web/src/components/tracks/track-actions.tsx` — `<SaveButton/>` + `<LikeButton/>` row (replaces legacy's favourite + add-to-queue + print cluster).
- `TrackDetailPlayButton` at `apps/web/src/components/player/track-detail-play-button.tsx` — in-page play/pause driven by `usePlayerStore`; syncs `setCurrentLyrics(lyrics)` when the track becomes active so `<MobilePlayerOverlay>` reads the same lyrics.
- `MediaToggle` + `YoutubeEmbedSlot` at `apps/web/src/components/tracks/media-toggle.tsx`, `.../youtube-embed-slot.tsx` — mutually-exclusive Listen / Watch tabs; picking Watch calls `usePlayerStore.pause()` before mounting `<iframe src=youtube-nocookie>`.
- `LyricsDisplay` at `apps/web/src/components/tracks/lyrics-display.tsx` — tabs across `ar | ur | en | transliteration`, RTL scoped via `<ArabicText/>` / `<UrduText/>`; preference persisted to `localStorage['nawhas-lyrics-language']`.

**Delta:**
- **Hero dropped entirely.** Legacy ships a Vibrant-tinted full-bleed hero with 96/128/192px bordered artwork, Roboto Slab bold 2.4rem title, and a ~60px absolute action bar. Rebuild renders a plain `<header>` row with sans-stack `text-3xl font-bold`, no artwork, no tinted background. Recorded in `tokens.md` typography.
- **Right rail dropped.** Legacy's `md="4"` column (Video card + "More From This Album" numbered sibling list with active-row tint, pre-fetched via `TrackIncludes`) has no rebuild equivalent — sibling-track navigation requires round-tripping back to `/albums/[slug]`. YouTube moves into the main column as a Listen/Watch `<MediaToggle>` rather than a persistent side card.
- **Action cluster reshaped.** Legacy bar: [Play | Stop] [Add to Queue | Added] `<edit-draft-lyrics/>` `<favorite-track-button/>` [print] + moderator `<edit-track-dialog/>`. Rebuild: `<SaveButton/>` + `<LikeButton/>` + a single play/pause tile. Missing: add-to-queue, snackbar + undo, print (+ `window.beforeprint` hook, print is a roadmap non-goal), inline edit (moved to `/contribute/edit/track`).
- **Audio-lyrics coupling diverges.** Legacy's `<lyrics-renderer>` instantiates a `LyricsHighlighter` reading `store.state.player` when this track is playing and emits `highlight:changed` to apply `.lyrics__group--highlighted` on the active timestamp group; the overlay variant additionally auto-scrolls the active group into view. Rebuild's `<LyricsDisplay/>` has **no timestamp highlighting and no auto-scroll** — it is a static tabbed reader. The Track page does call `usePlayerStore.setCurrentLyrics(lyrics)` so `<MobilePlayerOverlay>` renders the same `<LyricsDisplay/>` in the mobile player, but that second surface is equally static. **deferred: visual verify** whether lyrics timestamp data even lands in the rebuild's lyrics schema.
- **Language switching is rebuild-only.** Legacy stores a single `track.lyrics` document per track (JSON v1 or plain text) — no language tabs anywhere on `TrackPage.vue`. Rebuild exposes Arabic / Urdu / English / Romanized tabs when multiple `LyricDTO` rows exist, Arabic-first default, `localStorage` persistence across tracks.

→ detail deferred to Phase 2.3 spec for Track

### Library — legacy `/library`, `/library/home`, `/library/tracks`; rebuild `/library/tracks`, `/history`

**Legacy route files:** `nuxt/pages/library/LibraryLandingPage.vue` (`/library`), `nuxt/pages/library/LibraryHomePage.vue` (`/library/home`), `nuxt/pages/library/LibraryTracksPage.vue` (`/library/tracks`).
**Legacy layout wrapper:** global `nuxt/layouts/default.vue` (app bar + footer).
**Rebuild route files:** `apps/web/app/(protected)/library/tracks/page.tsx`, `apps/web/app/(protected)/history/page.tsx` (both under the `(protected)` group layout which enforces the auth redirect).

**Purpose:** let a signed-in listener manage their saved tracks and review recently played tracks.

**Legacy skeleton:**
```
+--------------------------------------------------------------+
| /library (anon)  full-bleed gradient hero, centered:         |
|   [icon] "Welcome to your library" [sub-heading]  [Get Started]
|   — middleware redirects auth'd users to /library/home       |
+--------------------------------------------------------------+
| /library/home (auth)  <LibraryHeader/>                       |
|   section "Recently Saved Nawhas" (heart icon)               |
|     3-col <TrackCard/> grid (6 items) + [View All] button    |
|     skeleton grid / <SavedTracksEmptyState/> fallbacks       |
+--------------------------------------------------------------+
| /library/tracks (auth)  <LibraryHeader/>                     |
|   section "Saved Nawhas" with [Play All] action              |
|     <v-card> wrapping <TrackList metadata display-avatar>    |
|     <v-pagination circle> (20 per page, ?page= URL-bound)    |
+--------------------------------------------------------------+
```

**Legacy key components:** `<LibraryHeader/>`, `<TrackCard/>` (colored variant on home), `<TrackList/>`, `<SkeletonCardGrid/>` + `<TrackCardSkeleton/>`, `<SavedTracksEmptyState/>`, `<v-pagination circle>`.

**Legacy interactions:** anon `/library` calls `store.commit('auth/PROMPT_USER', { reason: TrackSaved })` to open the register dialog and watches `$store.state.auth.user` to replace-navigate to `/library/home` once signed in; both auth'd pages watch `$store.state.library.trackIds` to re-fetch when the user saves/unsaves a track elsewhere in the app; `/library/tracks` dispatches `player/PLAY_ALBUM` with the playable subset (those with `related.audio`).

**Rebuild skeleton:**
```
+--------------------------------------------------------------+
| /library/tracks  <Container> py-10                           |
|   <header>  h1 "My Library" + subtitle                       |
|   <LibraryTracksList initialItems initialCursor/>            |
|     · SSR first 20 rows, cursor-paginated <LoadMore/>        |
|     · row = track meta + <SaveButton/> (optimistic unsave)   |
|     · "Play All" server action hydrates the player queue     |
+--------------------------------------------------------------+
| /history  <Container> py-10                                  |
|   <header>  h1 "Listening History" + subtitle                |
|   <HistoryList initialItems initialCursor/>  (load-more,     |
|     "Clear history" action)                                  |
+--------------------------------------------------------------+
```

**Rebuild key components:** `<Container/>`, `<LibraryTracksList/>` client component (with embedded `<LoadMore/>`, `<SaveButton/>`, play-all server action), `<HistoryList/>` (same load-more pattern + `clearHistory` action). Both pages are `dynamic = 'force-dynamic'` SSR via tRPC `library.list` / `history.list` callers.

**Delta:**
- **Anon landing gone.** Legacy `/library` is the marketing gate for anon users; the rebuild has no equivalent — `(protected)` layout redirects unauthenticated visitors to `/login?callbackUrl=/library/tracks` instead of showing a hero. **deferred: product decision** whether to re-introduce a marketing landing.
- **Saved-tracks dashboard gone.** Legacy `/library/home` is a curated 6-item grid dashboard with a "View All" CTA; the rebuild skips straight to the paginated list at `/library/tracks`. No `<TrackCard/>`-grid equivalent for library.
- **History is rebuild-only.** Legacy has no listening-history surface at all; the rebuild's `/history` is new behaviour (backed by `history.list`).
- **Pagination model differs.** Legacy uses numbered `<v-pagination>` with `?page=` routing (20/page); the rebuild uses cursor-based `<LoadMore/>` (20/page, accumulating list). No deep-linkable page numbers.
- **Empty-state + play-all preserved.** Rebuild keeps the "no saved tracks" empty state (inside `<LibraryTracksList/>`) and the "Play All" action; the legacy's "first playable track as start" detail collapses to a single server action in the rebuild.

### Search — legacy: no route (dialog component only); rebuild: `/search`

**Legacy route file:** none — `nuxt/components/search/GlobalSearch.vue` is an inline expanding-overlay component instantiated in the home hero (`hero` prop) and the app bar.
**Legacy layout wrapper:** N/A (the component rides along with whatever page hosts it).
**Rebuild route file:** `apps/web/app/search/page.tsx` + `apps/web/src/components/search/search-results-content.tsx`; header uses `apps/web/src/components/search/search-bar.tsx` (desktop) and `mobile-search-overlay.tsx` (mobile).

**Purpose:** find reciters, albums, or tracks by free-text query across the catalogue.

**Legacy skeleton:**
```
+--------------------------------------------------------------+
| <GlobalSearch hero>  400px (600px hero) pill over the page   |
|   [search icon] [text input: "Search for nawhas…"] [×]       |
|   v-expand-transition dropdown (max-h: 100vh-100px):         |
|     <IndexResults collection=reciters>   <ReciterResult/> … |
|     <IndexResults collection=tracks  highlight="lyrics…">   |
|     <IndexResults collection=albums>     <AlbumResult/>      |
|     footer hint "Showing results for "<q>""                  |
|   click-outside / route-change / Esc → collapse              |
+--------------------------------------------------------------+
```

**Legacy key components:** `<GlobalSearch/>`, `<IndexResults/>` (Vue-Instantsearch wrapper around `$search`, the Algolia client), `<ReciterResult/>`, `<TrackResult/>`, `<AlbumResult/>`, `v-click-outside` directive.

**Legacy interactions:** debounced Algolia lookups via `$search` on each keystroke, three parallel collections (`reciters`, `tracks`, `albums`) with per-field highlights (`name`; `title, reciter, lyrics, year` + `lyrics:20` crop; `title, year, reciter`); hero variant (home) is 600px white pill, app-bar variant is 400px and goes full-screen fixed on mobile (`sm-and-down`).

**Rebuild skeleton:**
```
+--------------------------------------------------------------+
| /search?q=&type=&page=    <Container> py-10                  |
|   h1 "Results for "<q>""  (or empty-state prompt if !q)      |
|   <SearchResultsContent query results typeCounts            |
|                         currentType currentPage/>           |
|     · tab strip: All | Reciters (N) | Albums (N) | Tracks (N)|
|     · result rows with <mark>-highlighted snippets, Arabic/  |
|       Urdu cells get dir="rtl" + lang                        |
|     · server-side pagination via Link to ?page=n             |
+--------------------------------------------------------------+
  (and in the header, independently:)
  <SearchBar/> desktop combobox w/ 200ms-debounced autocomplete
  <MobileSearchOverlay/> full-screen overlay on small viewports
```

**Rebuild key components:** `<SearchResultsContent/>` (results + tabs + pagination), `<SearchBar/>` (desktop header combobox with `useSearchAutocomplete` hook, WCAG 2.1 AA combobox/listbox/option ARIA), `<MobileSearchOverlay/>` (mobile overlay), `<HighlightedText/>` helper for Typesense `<mark>` snippets.

**Delta:**
- **Dialog → page.** Legacy search is exclusively an overlay dropdown attached to a text field; the rebuild promotes it to a first-class, SEO-aware, shareable `/search` route (though set `noIndex: true` so crawlers don't index query pages) while keeping a quick-lookup autocomplete in the header.
- **Tab-filtered results.** Rebuild's page has All / Reciters / Albums / Tracks tabs with per-type counts, server-fetched in parallel (`Promise.all` of four `caller.search.query` calls); legacy shows all three collections stacked in the dropdown with no filter.
- **Backend swap.** Legacy uses Algolia (`$search` Instantsearch client); rebuild uses Typesense via tRPC `search.query` (per `docs/design/layouts.md` prior sections). Highlight payload + snippet/crop fields re-specified in the Typesense schema.
- **Hero search input gone.** Legacy home has a hero-variant `<GlobalSearch hero>` pill; rebuild's home hero has no inline search (users use the header `<SearchBar/>` or navigate to `/search`). **deferred: visual verify** whether a hero search belongs in the rebuild's home spec.
- **Mobile behaviour re-shaped.** Legacy mobile search is an icon-button that expands to full-screen fixed position within the same component; rebuild splits this into a dedicated `<MobileSearchOverlay/>` component. Behaviour is equivalent; implementation is distinct.

### Auth — legacy: dialog only; rebuild: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/check-email`

**Legacy route files:** none for log-in / sign-up — both are Vuex-triggered dialogs rendered by `nuxt/components/auth/AuthDialog.vue` with form bodies in `LoginForm.vue` / `RegisterForm.vue` (+ social-login buttons). One real page: `nuxt/pages/auth/PasswordResetPage.vue` at `/auth/password/reset/:token`.
**Legacy layout wrapper:** dialogs overlay the current page; `PasswordResetPage.vue` uses the global default layout.
**Rebuild route files:** `apps/web/app/login/page.tsx`, `apps/web/app/check-email/page.tsx`, and `apps/web/app/(auth)/{register,forgot-password,reset-password,verify-email}/page.tsx`. The `(auth)` group has a `layout.tsx` wrapping children in `<AuthPageShell/>`; `/login` and `/check-email` each render `<AuthPageShell/>` directly.

**Purpose:** let a visitor sign in, create an account, recover a forgotten password, or confirm a verification/reset email.

**Legacy skeleton:**
```
+--------------------------------------------------------------+
| <AuthDialog> Vuetify modal, triggered by                     |
|   store.commit('auth/PROMPT_USER', { type, reason })         |
|   slots: title | message | form body | actions | social      |
|   forms: LoginForm / RegisterForm / PasswordResetRequestForm |
|   inline link switches dialog type (login ↔ register ↔ reset)|
+--------------------------------------------------------------+
| /auth/password/reset/:token  centered <PasswordResetForm/>   |
|   asyncData validates token → 404s on bad token              |
+--------------------------------------------------------------+
```

**Legacy key components:** `<AuthDialog/>`, `<LoginForm/>`, `<RegisterForm/>`, `<PasswordResetForm/>`, `<SocialLoginButton provider="google|facebook"/>`; Vuex `auth` module (`PROMPT_USER`, `login`, `register` actions, `reason: AuthReason.TrackSaved|...` surfacing contextual copy).

**Rebuild skeleton (shared `<AuthPageShell/>`):**
```
+--------------------------------------------------------------+
| <AuthPageShell>  flex min-h-screen centered,                 |
|   bg-gray-50 dark:bg-gray-950, max-w-md card                 |
|   page children: h1 + form + links                           |
+--------------------------------------------------------------+
```

Per-route purpose:
- `/login` — email + password sign-in via `signIn.email`; reads `?callbackUrl=`; renders `<SocialButtons/>` from `getEnabledSocialProviders()`; on success `window.location.replace(callbackUrl ?? '/')` to bypass router race with session-cookie.
- `/(auth)/register` — name + email + password sign-up.
- `/(auth)/forgot-password` — request a password-reset email.
- `/(auth)/reset-password?token=…` — enter new password; empty token → `redirect('/forgot-password')`; `error=INVALID_TOKEN|TOKEN_EXPIRED` renders an error card with "Request new link" CTA.
- `/(auth)/verify-email?error=…` — green success card by default; `error=TOKEN_EXPIRED|...` renders a red error card with "Resend" link to `/check-email`.
- `/check-email?email=…` — confirmation card instructing the user to check their inbox after registration or reset request.

**Delta:**
- **Dialog → dedicated routes.** Legacy auth is entirely modal (save-prompt, comment-prompt, edit-prompt all raise dialogs); rebuild makes all six flows first-class routes with their own URLs, metadata, and deep-link support. Auth-required actions redirect to `/login?callbackUrl=…` rather than open a dialog in-place.
- **Only real page parity: reset.** Legacy `/auth/password/reset/:token` (single path param, validates on page load, 404s on bad token) maps to rebuild `/reset-password?token=…` (query string, error re-rendered in-page rather than routed to the 404 page).
- **Explicit verify-email + check-email flows.** Legacy has no dedicated verify-email or "check your inbox" pages — flow is implicit in dialogs + email links. Rebuild treats both as first-class routes.
- **Auth copy decoupled from reason.** Legacy's `AuthReason` enum surfaces contextual copy in the dialog ("you need to sign in to save a track"); rebuild's routes show generic headings and rely on `callbackUrl` alone. **deferred: visual verify** whether the rebuild exposes intent-specific copy anywhere.
- **Social providers gated server-side.** Legacy hard-codes Google + Facebook `<SocialLoginButton/>` in both forms; rebuild passes `getEnabledSocialProviders()` from the server, so a provider can be disabled via env without touching JSX.

### About — legacy `/about`; rebuild: no equivalent yet

**Legacy route file:** `nuxt/pages/AboutPage.vue`.
**Legacy layout wrapper:** global default layout.
**Rebuild route file:** none.

**Purpose:** tell the story of Nawhas.com (history, credits, contribute pitch).

**Legacy skeleton:**
```
+--------------------------------------------------------------+
| <HeroBanner bg=shrine.jpg>  <HeroQuote author="Imam Al-Ridha"|
|   (a.s.)">…</HeroQuote>                                      |
+--------------------------------------------------------------+
| <v-container app__section>  h5 "The Journey"                 |
|   <v-timeline>  1997 / 2003 / 2017 / 2020 items              |
|     (dense single-column on md-and-down)                     |
+--------------------------------------------------------------+
| <v-container app__section>  h5 "Credits"                     |
|   3-col grid of outlined credit cards (avatar + name +       |
|     caption + bulleted contributions + ext-link buttons)     |
+--------------------------------------------------------------+
| <HeroBanner bg=azadari-sunset.jpg opacity=.76>  dark section |
|   h5 "Contribute" + pitch paragraphs + [Github] button       |
+--------------------------------------------------------------+
```

**Legacy key components:** `<HeroBanner/>`, `<HeroQuote/>`, `<v-timeline>` (Vuetify), credit `<v-card outlined>`, static content from a `computed` method (no API).

**Legacy interactions:** none — fully static content; two CTAs (`Website` per contributor, `Github` at bottom) are plain external links.

**Rebuild skeleton:** none — route does not exist.

**Rebuild key components:** none.

**Delta:**
- **Rebuild gap.** No `/about` route or equivalent marketing surface exists in the rebuild. All legacy content (hero quote, four-item timeline, three credit cards, Contribute CTA) is unreplicated.
- **Content vs. skin.** Legacy page's content blocks (timeline entries + credits) are intrinsic to the page — re-porting means carrying the strings forward, not just building a shell.
- **Contribute CTA on the legacy About page is a `contribute pitch + github link` only.** The rebuild replaces this with the functional `/contribute/*` writer flow (see next section), so the legacy's "we're working on a feature that will let you contribute" paragraph is obsolete even if the About page is ported. **deferred: product decision** whether to rebuild `/about` in Phase 3 or skip.

### Contribute + Mod — legacy: role-gated `/moderator/*` (excluded per roadmap); rebuild: public `/contribute/*` and role-gated `/mod/*` (both rebuild-only)

**Legacy route files:** none in scope — Phase 1 roadmap non-goals exclude all `/moderator/*` pages. Legacy content edits on public pages were inline moderator-only dialogs (`<edit-track-dialog>`, `<edit-draft-lyrics>` on TrackPage, etc.).
**Rebuild route files:**
- `apps/web/app/contribute/{layout,page}.tsx` + `reciter/new`, `album/new`, `track/new`, `edit/reciter/[slug]`, `edit/album/[reciterSlug]/[albumSlug]`, `edit/track/[reciterSlug]/[albumSlug]/[trackSlug]` pages.
- `apps/web/app/mod/{layout,page}.tsx` + `queue`, `users`, `audit`, `submissions/[id]`.

**Purpose:** let any signed-in user with the `contributor` or `moderator` role submit new/edit content (`/contribute/*`), and let `moderator`-role users review the queue, manage users, and read the audit log (`/mod/*`).

**Rebuild `/contribute/*` skeleton:**
```
+--------------------------------------------------------------+
| layout.tsx  session lookup via headers() + auth.api          |
|   · no session → redirect('/login?callbackUrl=…')            |
|   · role ∉ {contributor, moderator} → inline "Contributor    |
|     Access Required" panel (full-height centered) w/ "How to"|
|   · authorized → render children                             |
+--------------------------------------------------------------+
| /contribute  max-w-2xl landing page                          |
|   h1 + "Add new content" 3-col tile grid (Reciter / Album /  |
|     Track) + "Your contributions" link to /profile/contrib…  |
+--------------------------------------------------------------+
| /contribute/<entity>/new          <EntityForm action=create> |
| /contribute/edit/<entity>/[…slug] <EntityForm action=update> |
+--------------------------------------------------------------+
```

**Rebuild `/mod/*` skeleton:**
```
+--------------------------------------------------------------+
| layout.tsx  · redirect('/login…') if anon                    |
|             · redirect('/') if role ≠ 'moderator'            |
|   flex min-h-screen:                                         |
|     <nav w-56 border-r>  "MODERATION" label                  |
|       links: Overview / Queue / Users / Audit Log            |
|     <main flex-1 p-6>  children                              |
+--------------------------------------------------------------+
| /mod            Overview — pending-count stat card + recent  |
|                 audit-log timeline (last 10 entries)         |
| /mod/queue      paginated submissions list (<LoadMoreQueue>, |
|                 <SubmissionRow>)                             |
| /mod/submissions/[id]  single-submission review              |
| /mod/users      user list with role admin                    |
| /mod/audit      full audit-log pagination                    |
+--------------------------------------------------------------+
```

**Rebuild key components:** `<AuthPageShell/>` not used here (these surfaces live on the regular chrome + a sidebar for `/mod/*`); contribute uses `<ReciterForm/>`, `<AlbumForm/>`, `<TrackForm/>` (shared between `create` and `update` actions via a discriminated `action` prop); mod uses `<LoadMoreQueue/>`, `<SubmissionRow/>`, plus a moderation sidebar inlined into the layout.

**Delta:** rebuild-only — no reconciliation needed. Noteworthy:
- **Inline dialog → full page.** The legacy moderator edit-in-place dialogs on Reciter / Album / Track pages become standalone `/contribute/edit/<entity>/[…]` routes. Track-page and reciter-page deltas above already flagged the removal of the inline edit surface.
- **Two-tier access.** Rebuild distinguishes `contributor` (can submit for review) from `moderator` (can approve + access `/mod/*`); legacy had a single moderator role that edited content directly.
- **Moderation queue is new.** Legacy had no submission-review queue because contributions went through PRs against the repo (see legacy About page CTA). Rebuild's `/mod/queue` + `/mod/audit` codify the review loop on-platform.
- **Session guards are layout-level and server-rendered.** Both `/contribute/layout.tsx` and `/mod/layout.tsx` call `auth.api.getSession` from `headers()` and redirect server-side; no client flash. `/contribute` renders an inline "apply for access" panel instead of redirecting when the user is signed in but lacks the role.
