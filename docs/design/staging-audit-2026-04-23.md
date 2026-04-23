# Staging visual audit — 2026-04-23

Scope: a visual-only audit of every public route on https://staging.nawhas.cititech.tech/ plus the anonymous view of every protected/auth route, in **both light and dark themes** at desktop (1440×900) and mobile (390×844). No fixes applied — this is a record of what's wrong, for triage.

Methodology: a headless-Chromium Playwright script (`/tmp/design-audit/audit.ts`) navigates each route, lets it hydrate, then takes a full-page screenshot. Themes are forced via Playwright's `colorScheme` + a `localStorage.theme` seed so `next-themes` picks them up. Full screenshots (88 of them) are at `/tmp/design-audit/screens/`; console errors and a theme-probe per screenshot are at `/tmp/design-audit/results.json`.

Theme plumbing itself is fine: `next-themes` flips `class="light"` / `class="dark"` on `<html>`, `body` background/foreground flip between slate-50 / slate-950 as expected. The problems are all in how components consume (or fail to consume) the resulting tokens.

---

## P0 — ship-blockers

### 1. Submit buttons on every auth form render with no label

Pages: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/check-email`, `/verify-email` — in both themes, both viewports.

Each form has a bordered rounded rectangle where the primary CTA should be, but no visible text. Visually indistinguishable from a read-only field. Screenshots: `login_*.png`, `register_*.png`, `forgot-password_*.png`, `reset-password_*.png`, `check-email_*.png`, `verify-email_*.png`.

This is the most visible single-screen bug in the app — a user who hits any auth surface cannot tell the primary action from a text input. Suspect: a variant of the shared `Button` whose background and text colors are both resolving to the card surface, or a disabled state being applied by default.

### 2. Track-detail page is almost entirely illegible in dark mode

Page: `/reciters/[slug]/albums/[albumSlug]/tracks/[trackSlug]` — dark × desktop and dark × mobile.

In `track-detail_dark_desktop.png` and `track-detail_dark_mobile.png`, the following content is rendered with a near-slate-900 foreground on a slate-950 background and is effectively invisible:

- Track title ("Ali Haider")
- Reciter name ("Shadman Raza")
- Album name ("Muharram 1439")
- "Lyrics" section heading
- Arabic lyrics body text (whole poem)

The only readable content is the muted metadata row (`· 2017 · Track 1 · 7:10`), the "Play this track" CTA pill, the Arabic/Romanized tab labels, and the Arabic tab's red underline. Effectively the whole page is blank for a dark-mode user.

Same root cause as issues #3 and #4 below, but calling it out separately because this is the page where the app delivers its core content (lyrics) and it's the page where the regression is worst.

---

## P1 — systemic theming issues (affect most pages)

### 3. Heading / body foreground color doesn't flip in dark mode

Visible on: `/` (section titles), `/reciters` (page title "Reciters"), `/reciters/[slug]` (reciter display name, "Discography" heading, "1 album" subtitle), `/albums` (album titles like "Muharram 1441"), `/albums/[slug]` (album title, "Tracks" heading, and every track title in the list), `/search?q=nohay` ("Results for" heading, "All" tab label, "Tracks" heading, the non-matching suffix of a result's title), `/this-route-does-not-exist-404` ("Page not found" heading), plus the track-detail page called out above.

Representative screenshots: `reciter-profile_dark_desktop.png`, `albums-list_dark_desktop.png`, `album-detail_dark_desktop.png`, `search-query_dark_desktop.png`, `notfound_dark_desktop.png`.

Pattern: anything styled as a heading (or relying on the default "foreground" color token) stays dark in dark mode. Muted/secondary text (counts, captions, meta strips) stays readable because it uses a mid-luminance slate that happens to be visible on both backgrounds. This looks like either a) a `text-foreground` / `text-slate-900` literal used on heading components instead of the semantic ramp, or b) a Tailwind `dark:` variant missing on a shared Heading component.

### 4. Cards never pick up the dark surface

Every "card" surface across the app — reciter cards on `/reciters` and home, the home "Popular Tracks" / "Top Nawhas" panels, the reset/login/register/forgot/check/verify form cards, the album hero card on `/albums/[slug]`, the search result row — stays white-ish in dark mode.

Representative screenshots: `reciters-list_dark_desktop.png`, `reciters-list_dark_mobile.png`, `home_dark_desktop.png`, `home_dark_mobile.png`, `search-query_dark_desktop.png`, `login_dark_desktop.png`.

Two side effects: a) the cards look like cutouts of light mode floating on a dark page; b) any content inside the card that uses dark-mode-aware text inherits the dark foreground of the parent theme but sits on the card's light background, so on some cards text is fine and on others it's very low-contrast (see the yellow `<mark>` search highlight, which only stays readable because its own yellow bg is forced).

### 5. Whole auth-route layout does not flip to dark

Pages: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/check-email`, `/verify-email`, and the anonymous redirects `/profile`, `/settings`, `/history`, `/library/tracks`, `/profile/contributions`, `/contribute`, `/mod` (all of which land on `/login?callbackUrl=...`).

The screenshot for `login_dark_desktop.png` (and all its siblings) renders a light page — even though the theme probe confirms `body` itself has `background-color: rgb(2,6,23)` and `<html>` has `class="dark"`. Something in the `(auth)` route group (or the login route's own layout) is drawing a light bg over the top of the body — most likely a hard-coded `bg-slate-50` / `bg-white` / `bg-background` wrapper whose token has drifted.

### 6. The mini-player dock never enters dark mode

The persistent player bar visible across almost every screenshot (bottom strip with the chevron, play head, `X`) renders white/light in dark mode on every page. Same cause class as #5 — the player's own surface is hard-coded rather than driven by the dark theme.

### 7. The home page launches with the full-screen "Now Playing" overlay open by default

Pages: `/` desktop and mobile. In the screenshots, what should be a content area below the hero is covered by an expanded player overlay (with a large placeholder album art, timestamps `0:00`/`0:00`, and prev/play/next controls). The overlay dismiss affordance (the `∨` in the top-left corner) is visible but the overlay itself is open on first paint.

Two possibilities: the player state from a previous session is being rehydrated, or the overlay's default state is "expanded". Either way, a first-time visitor arriving at `/` sees a broken-looking home page: the hero CTA is above the overlay, "Featured Reciters" is partially obscured by the expanding panel, and "Recent Albums" is only visible as faint placeholder rectangles at the top edge. Every single home-page screenshot (`home_{light,dark}_{desktop,mobile}.png`) has this problem.

---

## P2 — content / asset issues

### 8. Album and reciter images are not rendering anywhere

Every album grid tile on `/albums`, the album hero on `/albums/[slug]`, the discography thumbnail on `/reciters/[slug]`, the "Recent Albums" strip on `/` — all show the generic placeholder music-note icon on a light-gray card. Reciter avatars on `/reciters` and the featured reciters strip on `/` are just colored monograms ("MH", "NS", "AS"…). Either the image URLs aren't being produced/served or the `Image` component is falling back silently.

### 9. `/albums` fires 11 prefetches for routes that don't exist in the rebuild

Console on `/albums` (desktop, light) logs 11 server-responded 404s during idle-time prefetch. All target the **legacy nested URL shape** that the rebuild dropped: `/reciters/{reciter}/albums/{album}`. Examples (from `/tmp/design-audit/albums-failures.json`):

- `/reciters/mir-hasan-mir/albums/muharram-1443`
- `/reciters/shadman-raza/albums/muharram-1439`
- `/reciters/salma-batool/albums/muharram-1440`
- …and 8 more.

The rebuild's album route is flattened to `/albums/[slug]`, so these prefetches are hitting the Next.js catch-all 404. Something on the `/albums` page is emitting `Link`s or `router.prefetch` calls against the old URL shape. This breaks SEO/navigation: if those links are ever clicked (not just hovered) the user gets a 404 page for real. Two screenshot groups affected: desktop 11 errors, mobile 8 errors.

### 10. 404 "Go to home" button disappears in dark mode

Page: `/this-route-does-not-exist-404` dark × desktop/mobile. The "Go to home" primary button is dark-slate on a dark-slate page and reads as empty space; only "Browse reciters" (which keeps its white outline) is discoverable. Same root cause as #5 — a button variant that's hard-coded to `bg-slate-900` / `bg-neutral-900` instead of using the semantic primary token.

---

## P2 — layout / hierarchy quality

### 11. Section titles on `/` (desktop) are tiny and low-contrast

"Featured Reciters", "Recent Albums", "Popular Tracks", "Top Nawhas" all render at ~12px with a muted slate color — they feel like form labels rather than section headings, and compete poorly with the big serif hero above them. Mobile home suffers more because the narrower width makes the small label look even more like a throwaway caption. (Consider bumping to a proper h2/h3 token; this is listed under design quality, not a bug.)

### 12. Auth forms have a very large vertical dead zone

On desktop, `/login`, `/register`, and friends center a 450-px-wide card on an 800-px-tall viewport, leaving ~300px of blank space above the card and again below it. Feels like a page that forgot to render something. If an auth layout is intentionally minimal, a wordmark, tagline, or illustration in the empty space (or simply positioning the card higher) would give it weight.

### 13. "Play All" button on album detail is near-invisible in light mode

`/albums/[slug]` light × desktop: the "Play All" primary action below the album hero renders as a very low-contrast ghost pill against the already-light card. In dark mode the same button is a properly styled dark pill with a visible play triangle. Light-mode variant appears to be mis-mapped.

### 14. The global search `<mark>` highlight is the browser default yellow

`/search?q=nohay` shows matched text wrapped in a bright-yellow highlight (the UA default). It reads as "selected for copy" rather than as a styled match. In dark mode the yellow stays identical and is the only legible part of the row (because the card + text contrast above failed). Would benefit from a proper `bg-primary/20 text-foreground` token mapping.

### 15. Featured reciter avatars use the same muted slate for every initial

Both `/` and `/reciters` render avatar circles as a single flat `bg-slate-200` with `text-slate-500` monogram, identical for every reciter. They read as a placeholder pattern rather than an identity. Not a bug per se — but makes the reciter grid visually uniform to the point of disorientation, which compounds #8 (no photos).

---

## Per-page summary

For each public route, "✓" means no notable issue beyond the systemic ones above, "!" means at least one page-specific observation. All page-specific issues are already enumerated above.

| Route | L/desktop | D/desktop | L/mobile | D/mobile | Notes |
|-------|-----------|-----------|----------|----------|-------|
| `/` | ! (#7, #11) | ! (#3, #4, #6, #7, #8) | ! (#7, #11) | ! (#3, #4, #6, #7, #8) | home-page expanded-player overlay is the dominant issue |
| `/reciters` | ✓ (#15) | ! (#3, #4) | ✓ | ! (#3, #4) | |
| `/reciters/shadman-raza` | ✓ | ! (#3, #4) | ✓ | ! (#3, #4) | only 1 album — wasn't able to audit a long discography |
| `/albums` | ! (#8, #9) | ! (#3, #4, #8, #9) | ! (#8, #9) | ! (#3, #4, #8, #9) | broken prefetches are the biggest issue here |
| `/albums/muharram-1439` | ! (#8, #13) | ! (#3, #4, #8) | ! (#8, #13) | ! (#3, #4, #8) | |
| `/reciters/…/tracks/ali-haider` | ✓ | ! (#2) | ✓ | ! (#2) | **dark mode effectively blank** |
| `/search` (no query) | ✓ | ! (#3) | — | — | "Search" heading vanishes in dark mode |
| `/search?q=nohay` | ! (#14) | ! (#3, #4, #14) | — | — | |
| `/login` | ! (#1, #5, #12) | ! (#1, #5, #6, #12) | ! (#1, #5) | ! (#1, #5) | |
| `/register` | ! (#1, #5, #12) | ! (#1, #5, #6, #12) | ! (#1, #5) | ! (#1, #5) | |
| `/forgot-password` | ! (#1, #5) | ! (#1, #5, #6) | ! (#1, #5) | ! (#1, #5) | |
| `/reset-password?token=…` | ! (#1, #5) | ! (#1, #5, #6) | ! (#1, #5) | ! (#1, #5) | |
| `/check-email` | ! (#5) | ! (#5, #6) | ! (#5) | ! (#5) | no submit button to speak of, but inherits the layout issue |
| `/verify-email` | ! (#1, #5) | ! (#1, #5, #6) | ! (#1, #5) | ! (#1, #5) | |
| `/profile`, `/settings`, `/history`, `/library/tracks`, `/profile/contributions`, `/mod`, `/contribute` | — | — | — | — | all correctly redirect to `/login?callbackUrl=…`; inherits every login-page issue |
| `/this-route-does-not-exist-404` | ✓ | ! (#3, #10) | ✓ | ! (#3, #10) | |

---

## What I didn't (couldn't) audit

- Anything behind auth: the protected routes (`/profile`, `/settings`, `/library/tracks`, `/history`, `/contribute`, `/mod/**`) plus the authenticated-only branches of `/library` and `/profile/contributions`. All redirect to login when anon. Needs a test account + a second pass.
- Interactive states: hover, focus, focus-ring visibility, active tab selection, form error states, loading skeletons. Only the idle/default paint is captured.
- The YouTube-embed path of the player (the player on these screenshots is in its pre-selection state; no track is loaded, so the audio-vs-video affordances didn't render).
- Real Right-to-Left and Nastaliq typography — the Arabic lyrics did load on `/reciters/…/tracks/ali-haider` in light mode, so fonts are wired, but I only saw three lines of Arabic. A long-form track with romanization would be a better read.
- Print/responsive breakpoints between 390 and 1440 (tablet widths); the screenshots jump straight from phone to desktop.
- Real-device Safari (mobile only emulates iOS UA and viewport; it runs on Chromium).

---

## Suggested triage order

1. Unblock auth (#1 invisible submit buttons + #5 light auth pages in dark mode) — nothing else matters if people can't sign in.
2. Fix the home-page expanded-player overlay (#7) — it's the first thing a visitor sees.
3. Fix the heading/foreground token in dark mode (#3) — one change likely fixes every "invisible text" occurrence on public pages including the track-detail blank-page issue (#2).
4. Fix card backgrounds in dark mode (#4) and the mini-player dock (#6) — these are the "cards look like cutouts" issues; probably a shared `Card` primitive and the player shell.
5. Clean up the `/albums` prefetches (#9) before any SEO crawl hits them.
6. Everything else is design polish; no urgency.

Raw artifacts: `/tmp/design-audit/screens/*.png`, `/tmp/design-audit/results.json`, `/tmp/design-audit/albums-failures.json`, `/tmp/design-audit/extras.json`.
