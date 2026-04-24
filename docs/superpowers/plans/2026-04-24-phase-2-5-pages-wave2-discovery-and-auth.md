# Phase 2.5 — Pages, Wave 2 (Discovery + Auth Surfaces) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin three Phase 2.5 routes — saved-tracks library, Typesense-backed search, and the six `(auth)/*` pages — to POC tokens and primitives. Each row lands as one PR-sized commit on `phase-2.5-poc-reskin`.

**Architecture:** Same Approach A pattern as Wave 1 — token migration (cheatsheet) + Phase B primitive adoption + visual vocabulary doc compliance. Wave 2 is smaller than Wave 1 (3 rows vs. 6) because the auth bundle's 6 pages share a single `<AuthPageShell>` template + 5 nearly-identical form components, all restyled in one row.

**Tech Stack:** Next 16 / React 19 / Tailwind 4 / TypeScript 6 / `next-intl` / Better-Auth / Typesense / `@nawhas/ui` (Footer, CoverArt, ReciterAvatar, TrackRow, Waveform, hashToIndex). All Phase A + B + Wave 1 substrate already shipped on the branch (HEAD `e7777df`).

**Spec:** [`docs/superpowers/specs/2026-04-24-poc-design-port-design.md`](../specs/2026-04-24-poc-design-port-design.md), section "Pages" rows 7, 8, 9.

**Visual vocabulary:** [`docs/design/visual-vocabulary.md`](../../design/visual-vocabulary.md) — authoritative for the auth surfaces (which the POC didn't cover). Specifically the "Auth surfaces" section.

**Wave 1 cheatsheet:** see [`docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave1-public-entities.md`](./2026-04-24-phase-2-5-pages-wave1-public-entities.md), section "The token migration cheatsheet". Same substitutions apply here.

**Branch:** `phase-2.5-poc-reskin`. Wave 2 commits land on top of `e7777df`.

**Wave 3 (later plan):** contribute/*, mod/*, profile/settings/history, error/not-found/loading boundaries.

---

## File structure

| Layer | File | Wave 2 scope |
|---|---|---|
| Page shells | `apps/web/app/(protected)/library/tracks/page.tsx` | Heading restyle |
| | `apps/web/app/search/page.tsx` | Heading restyle + empty-state restyle |
| | `apps/web/app/login/page.tsx`, `apps/web/app/(auth)/{register,forgot-password,reset-password,verify-email}/page.tsx`, `apps/web/app/check-email/page.tsx` | No code changes (thin wrappers around `<AuthPageShell>` + form components — restyle propagates through) |
| Library | `apps/web/src/components/library/library-tracks-list.tsx` | Token migration on the inline `LibraryTrackRow`, empty-state, heading |
| Search | `apps/web/src/components/search/search-results-content.tsx` | Token migration; replace `getPlaceholderStyle` + `AppImage` paths with `<CoverArt>` / `<ReciterAvatar>` from `@nawhas/ui`; restyle Tabs trigger/content; restyle `<HighlightedText>` mark color tokens |
| Auth | `apps/web/src/components/auth/auth-page-shell.tsx` | Card surface + heading typography per visual vocabulary |
| | `apps/web/src/components/auth/login-form.tsx`, `register-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, `check-email-card.tsx` | Token migration (form labels, error text, switch-flow links, helper text); replace `<Card>` shadcn primitive with raw POC card surface where appropriate; preserve all Better-Auth wiring + form state |
| | `apps/web/src/components/auth/social-buttons.tsx` | Token migration |
| Tests | `apps/web/src/components/library/__tests__/` (none today), `apps/web/src/components/search/__tests__/` (existing; update selectors), `apps/web/src/components/auth/__tests__/` (existing; update selectors) | Update where assertions target removed elements / class strings; add focused test for any new visible behavior (e.g. empty-state copy) |
| i18n | `apps/web/messages/en.json` | Add new keys ONLY for new visible strings (most should already exist) |

**What does NOT change in Wave 2:**
- Better-Auth wiring (signIn, signUp, sendVerificationEmail, etc.). Forms keep all current state management + error handling.
- Typesense query logic, `caller.search.query` shape, search-result DTOs.
- Library `caller.library.list` server action, `playAlbum` Zustand action.
- AuthReason contextual-copy logic in AuthPageShell (intentional: 2.1 audit's resolved decision; preserve verbatim).
- `<HighlightedText>`'s `dangerouslySetInnerHTML` (it's the documented Typesense snippet path; only the `<mark>` color tokens get migrated).
- `<Tabs>`, `<Card>`, `<Input>`, `<Button>` shadcn primitives (auto-restyle via Phase A token cascade — only consumer overrides change).

---

## Pre-flight

### Task 0.1: Verify branch state

- [ ] **Step 1: Confirm branch + base + Phase B exports**

```bash
cd /home/asif/dev/nawhas/nawhas-rebuild
git status
git log --oneline -3
grep -E "^export.*(Footer|CoverArt|ReciterAvatar|TrackRow|Waveform|hashToIndex)" packages/ui/src/index.ts
```

Expected: on `phase-2.5-poc-reskin`, working tree clean (or only untracked `docs/design/.audit-notes.md` + Windows lighthouse temp dirs from prior session), HEAD at `e7777df` (Wave 1's primary-button a11y fix). All 6 Phase B exports present.

- [ ] **Step 2: Confirm baseline tests + types pass**

```bash
./dev qa
```

Expected: typecheck + lint + ~489 unit tests green.

---

## Row 7 — Library / saved tracks (`/library/tracks`)

**Files touched:**
- `apps/web/app/(protected)/library/tracks/page.tsx` — heading restyle.
- `apps/web/src/components/library/library-tracks-list.tsx` — token migration on `LibraryTrackRow` inline component, empty-state, heading.

**Goal:** Saved-tracks list adopts POC tokens. Each row remains a custom shape (not the canonical `<TrackRow>` because the library row has different affordances — only title, duration, save heart) but visually consistent with the rest of the POC system. Empty state follows the visual vocabulary doc's "Empty state" pattern.

### Task 7.1: Restyle the page shell

**Files:** `apps/web/app/(protected)/library/tracks/page.tsx`.

- [ ] **Step 1: Replace the heading block**

Find lines 50-53:

```tsx
<header className="mb-8">
  <h1 className="text-3xl font-bold text-foreground">{t('pageTitle')}</h1>
  <p className="mt-1 text-sm text-muted-foreground">{t('pageSubtitle')}</p>
</header>
```

Replace with:

```tsx
<header className="mb-8">
  <h1 className="font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)]">{t('pageTitle')}</h1>
  <p className="mt-1 text-sm text-[var(--text-dim)]">{t('pageSubtitle')}</p>
</header>
```

(Matches Wave 1's entity-page heading typography.)

### Task 7.2: Restyle library-tracks-list

**Files:** `apps/web/src/components/library/library-tracks-list.tsx`.

- [ ] **Step 1: Replace the empty state**

Find the empty-state block (lines 80-95):

```tsx
if (items.length === 0) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MusicNoteIcon />
      </div>
      <SectionTitle className="mb-2 text-lg font-semibold">{t('emptyTitle')}</SectionTitle>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('emptyDescription')}
      </p>
      <Button asChild>
        <Link href="/albums">{t('browseAlbums')}</Link>
      </Button>
    </div>
  );
}
```

Replace with:

```tsx
if (items.length === 0) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-dim)]">
        <MusicNoteIcon />
      </div>
      <h2 className="mb-2 font-serif text-2xl font-medium text-[var(--text)]">{t('emptyTitle')}</h2>
      <p className="mb-6 text-sm text-[var(--text-dim)]">
        {t('emptyDescription')}
      </p>
      <Link
        href="/albums"
        className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-soft)] transition-colors"
      >
        {t('browseAlbums')}
      </Link>
    </div>
  );
}
```

Notes:
- Replaces `<SectionTitle>` shadcn primitive with raw `<h2>` for POC serif typography (same pattern Wave 1 Row 3 used for ReciterDiscography).
- Replaces shadcn `<Button asChild><Link>` with a raw `<Link>` styled per POC accent CTA (visual-vocabulary "CTAs" → primary). Button primitive isn't broken — this just inlines the styling for explicit POC token use.

- [ ] **Step 2: Drop the `Button`, `SectionTitle` imports if unused after Step 1**

After replacing the empty state, `Button` and `SectionTitle` may still be imported elsewhere in the file. Check usage with grep:

```bash
grep -n "Button\|SectionTitle" apps/web/src/components/library/library-tracks-list.tsx
```

If `Button` is still used (e.g. for the Play All button at line 104), keep its import. If not, drop it. Same for `SectionTitle`.

The Play All button at line 104 still uses `<Button>`. Keep it for now — it'll auto-restyle via Phase A's shadcn token cascade. Don't replace with raw POC-styled `<button>` unless the styling diverges visibly (it shouldn't).

- [ ] **Step 3: Restyle the Play All section + track count text**

Find the Play All section header (lines 99-113):

```tsx
{/* Play All button */}
<div className="mb-6 flex items-center justify-between">
  <p className="text-sm text-muted-foreground">
    {items.length === 1 ? t('trackCountSingular', { count: items.length }) : t('trackCountPlural', { count: items.length })}
  </p>
  <Button
    type="button"
    onClick={handlePlayAll}
    disabled={isPlayingAll}
    aria-busy={isPlayingAll}
  >
    <PlayAllIcon />
    {isPlayingAll ? t('playAllLoading') : t('playAll')}
  </Button>
</div>
```

Replace with:

```tsx
{/* Play All button */}
<div className="mb-6 flex items-center justify-between">
  <p className="text-sm text-[var(--text-dim)]">
    {items.length === 1 ? t('trackCountSingular', { count: items.length }) : t('trackCountPlural', { count: items.length })}
  </p>
  <Button
    type="button"
    onClick={handlePlayAll}
    disabled={isPlayingAll}
    aria-busy={isPlayingAll}
  >
    <PlayAllIcon />
    {isPlayingAll ? t('playAllLoading') : t('playAll')}
  </Button>
</div>
```

(Token swap on the count `<p>` only. Button keeps shadcn primitive — restyles automatically via the `--color-primary` cascade.)

- [ ] **Step 4: Restyle the `<ol>` list container**

Find the `<ol>` block (lines 116-127):

```tsx
<ol
  aria-label={items.length === 1 ? t('savedTracksListLabel', { count: items.length }) : t('savedTracksListLabelPlural', { count: items.length })}
  className="divide-y divide-border rounded-lg border border-border bg-card"
>
  {items.map((item) => (
    <LibraryTrackRow
      key={item.trackId}
      item={item}
      onUnsave={(trackId) => setItems((prev) => prev.filter((i) => i.trackId !== trackId))}
    />
  ))}
</ol>
```

Replace with:

```tsx
<ol
  aria-label={items.length === 1 ? t('savedTracksListLabel', { count: items.length }) : t('savedTracksListLabelPlural', { count: items.length })}
  className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]"
>
  {items.map((item) => (
    <LibraryTrackRow
      key={item.trackId}
      item={item}
      onUnsave={(trackId) => setItems((prev) => prev.filter((i) => i.trackId !== trackId))}
    />
  ))}
</ol>
```

Cheatsheet swaps + `rounded-lg` → `rounded-2xl` to match POC card radius.

- [ ] **Step 5: Restyle the inline `LibraryTrackRow` component**

Find the `LibraryTrackRow` function (around line 148-177). Replace its body:

```tsx
function LibraryTrackRow({ item, onUnsave }: LibraryTrackRowProps): React.JSX.Element {
  const { track } = item;

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-dim)]">
        <MusicNoteIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text)]">{track.title}</p>
      </div>

      {track.duration != null && (
        <span className="shrink-0 text-xs tabular-nums text-[var(--text-faint)]" aria-hidden="true">
          {formatDuration(track.duration)}
        </span>
      )}

      <SaveButton
        trackId={track.id}
        initialSaved={true}
        onSavedChange={(saved) => {
          if (!saved) onUnsave(track.id);
        }}
        className="hover:bg-[var(--surface)]"
      />
    </li>
  );
}
```

Notes:
- `hover:bg-muted/50` → `hover:bg-[var(--surface)]` (drop the alpha — POC's `--surface` is already a subtle surface).
- All other tokens follow the cheatsheet.
- SaveButton is unchanged in shape; only its hover override updates.

- [ ] **Step 6: Run library tests**

```bash
./dev test --filter library
```

Expected: any existing library tests pass. If selectors target removed elements (e.g. the old `divide-border` class), update assertions to the new token strings.

### Task 7.3: Commit Row 7

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/app/\(protected\)/library/tracks/page.tsx \
        apps/web/src/components/library/library-tracks-list.tsx \
        apps/web/src/components/library/__tests__/ 2>/dev/null

git commit -m "$(cat <<'EOF'
feat(library): re-skin /library/tracks to POC system

Phase 2.5 Wave 2 row 7. Restyles the saved-tracks library to POC
tokens:

- Page heading: font-serif Fraunces 2.5rem font-medium per POC
  entity-page typography (was text-3xl font-bold).
- Empty state: serif h2 + accent CTA Link wrapping (was shadcn
  Button asChild). Matches the visual-vocabulary "Empty state"
  pattern.
- Track count text + ordered list chrome: cheatsheet token swaps;
  rounded-lg → rounded-2xl to match POC card radius.
- LibraryTrackRow: inline rows now use --surface / --text-dim /
  --text-faint per the cheatsheet. SaveButton hover updated to
  POC --surface.

Track row format (small icon + title + duration + save heart) kept
distinct from the canonical TrackRow primitive — the library list
has different affordances (no reciter, no plays, optimistic-unsave
heart) than album-detail's TrackRow context.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave2-discovery-and-auth.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Row 8 — Search (`/search`)

**Files touched:**
- `apps/web/app/search/page.tsx` — heading + empty-state restyle.
- `apps/web/src/components/search/search-results-content.tsx` — token migration; replace gradient placeholder + `AppImage` paths with `<CoverArt>` / `<ReciterAvatar>` from `@nawhas/ui`; restyle Tabs trigger styling; restyle `<HighlightedText>` mark color tokens.

**Goal:** Search results page consumes POC tokens and Phase B primitives. The Tabs primitive structure (all/reciters/albums/tracks) is preserved. The Typesense highlight rendering is preserved (mark tags inside the snippet) — only the `<mark>` color tokens migrate. Per the spec section "Pages" row 8, the filter bar UX is borrowed from POC's `/library` treatment, but in this rebuild that means: keep the existing tabs + pagination as the filter mechanism; no new filter bar component is introduced.

### Task 8.1: Restyle search page shell

**Files:** `apps/web/app/search/page.tsx`.

- [ ] **Step 1: Replace the empty-query branch (lines 82-93)**

```tsx
if (!query) {
  return (
    <div className="py-10">
      <Container>
        <h1 className="mb-2 text-2xl font-bold text-foreground">{t('heading')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('emptyQueryPrompt')}
        </p>
      </Container>
    </div>
  );
}
```

With:

```tsx
if (!query) {
  return (
    <div className="py-10">
      <Container>
        <h1 className="mb-2 font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)]">{t('heading')}</h1>
        <p className="mt-2 text-[var(--text-dim)]">
          {t('emptyQueryPrompt')}
        </p>
      </Container>
    </div>
  );
}
```

- [ ] **Step 2: Replace the results heading (lines 116-121)**

```tsx
<h1 className="mb-6 text-2xl font-bold text-foreground">
  {t.rich('resultsHeading', {
    query,
    italic: (chunks) => <span className="italic text-muted-foreground">&ldquo;{chunks}&rdquo;</span>,
  })}
</h1>
```

With:

```tsx
<h1 className="mb-6 font-serif text-[2.5rem] font-medium tracking-tight text-[var(--text)]">
  {t.rich('resultsHeading', {
    query,
    italic: (chunks) => <span className="italic text-[var(--text-dim)]">&ldquo;{chunks}&rdquo;</span>,
  })}
</h1>
```

### Task 8.2: Restyle search-results-content

**Files:** `apps/web/src/components/search/search-results-content.tsx`.

This is the largest file in Wave 2 (646 lines). Breaks into Tabs trigger styling, type-specific row templates (reciter / album / track), and `<HighlightedText>` token swap. Read the file first to identify each section.

- [ ] **Step 1: Restyle `<HighlightedText>` mark color tokens**

Find the className on the `<span>` inside `<HighlightedText>` (around line 65-66):

```tsx
className="[&_mark]:rounded-sm [&_mark]:bg-warning-200 [&_mark]:px-0.5 [&_mark]:text-warning-950 dark:[&_mark]:bg-warning-800 dark:[&_mark]:text-warning-50"
```

This is fine as-is — `--color-warning-*` tokens were re-anchored on POC `#f59e0b` in Phase A and the dark/light mark colors are appropriate. **No change needed**, but verify by inspecting the rendered DOM during smoke that highlighted text reads cleanly in both themes.

If the mark color reads too saturated against POC's neutral `--bg`, consider tightening to `--accent-glow` for the bg in dark mode. Not done in this row — flag as Wave 3 polish if real-world testing surfaces an issue.

- [ ] **Step 2: Restyle the Tabs container + trigger styling**

Find the `<Tabs>` block (typically near the top of the rendered output, around line 100-130). Read the actual class strings on `<TabsList>` and `<TabsTrigger>`. Apply the same restyle pattern Wave 1 Row 6 used on `<LyricsDisplay>`:

```tsx
<TabsList className="border-b border-[var(--border)] bg-transparent">
  {/* triggers */}
</TabsList>
```

For each `<TabsTrigger>`:

```tsx
<TabsTrigger
  value="all"
  className="border-b-2 border-transparent bg-transparent px-4 py-2 text-sm text-[var(--text-dim)] transition-colors hover:text-[var(--text)] data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--accent)]"
>
  {t('tabs.all')} ({totalCount})
</TabsTrigger>
```

(Adapt to the actual existing trigger structure. The pattern: transparent bg, border-bottom for active state in `--accent`, text color shifts dim → text on hover, dim → accent on active. Same shape as `<LyricsDisplay>` from Wave 1 Row 6.)

- [ ] **Step 3: Restyle the reciter result row**

Find the reciter result render block. Replace any `getPlaceholderStyle` + tinted-div with `<ReciterAvatar>` from `@nawhas/ui`:

Before (typical pattern):

```tsx
<div
  style={getPlaceholderStyle(reciter.slug)}
  className={`flex h-12 w-12 items-center justify-center rounded-full ${PLACEHOLDER_CLASSES}`}
>
  {initials}
</div>
```

After:

```tsx
import { ReciterAvatar } from '@nawhas/ui';

// in JSX:
<div className="h-12 w-12">
  <ReciterAvatar
    name={reciter.name}
    size="sm"
    fluid
  />
</div>
```

(Use `size="sm"` since the search-result row avatar is smaller than profile-page avatars; with `fluid` mode the wrapper drives the actual 48×48.)

Token-migrate the surrounding row chrome:
- `bg-card` → `bg-[var(--card-bg)]`
- `border-border` → `border-[var(--border)]`
- `text-foreground` → `text-[var(--text)]`
- `text-muted-foreground` → `text-[var(--text-dim)]`
- Hover state: `hover:bg-[var(--surface)]` for row background, `hover:text-[var(--accent)]` for the entity title link.

- [ ] **Step 4: Restyle the album result row**

Find the album result render block. Replace the `AppImage` + placeholder dual-path with `<CoverArt>` from `@nawhas/ui`:

Before (typical pattern):

```tsx
<div
  style={album.artworkUrl ? undefined : getPlaceholderStyle(album.slug)}
  className={`relative h-12 w-12 shrink-0 overflow-hidden rounded ${album.artworkUrl ? 'bg-muted' : PLACEHOLDER_CLASSES}`}
>
  {album.artworkUrl ? (
    <AppImage src={album.artworkUrl} alt={`${album.title} album cover`} fill ... />
  ) : (
    <SVG-placeholder />
  )}
</div>
```

After:

```tsx
import { CoverArt } from '@nawhas/ui';

// in JSX:
<div className="h-12 w-12 shrink-0">
  <CoverArt
    slug={album.slug}
    artworkUrl={album.artworkUrl}
    label={album.title}
    size="sm"
    fluid
  />
</div>
```

Apply cheatsheet to the surrounding row chrome same as the reciter row.

- [ ] **Step 5: Restyle the track result row**

Track results have artwork (album cover) + title + reciter + lyrics highlight snippet. Apply same pattern as Step 4 for the artwork (use `<CoverArt>` from album), and apply cheatsheet swaps to:
- Title link: `text-[var(--text)] hover:text-[var(--accent)]`
- Reciter link: `text-[var(--text-dim)] hover:text-[var(--text)]`
- Lyrics snippet container: `text-[var(--text-faint)]` with the `<HighlightedText>` rendering inside (mark colors per Step 1).

Read the actual file to see the exact JSX structure; the patterns above are the migration targets, not literal templates.

- [ ] **Step 6: Restyle the pagination block**

Search uses URL-based pagination (Link to `?page=N`). Find the pagination links. Apply cheatsheet:
- Active page: `bg-[var(--accent)] text-white`
- Other pages: `bg-[var(--card-bg)] text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)]`
- Disabled prev/next: `text-[var(--text-faint)] cursor-not-allowed`

- [ ] **Step 7: Drop unused imports**

After Steps 3-5 replace `getPlaceholderStyle`/`PLACEHOLDER_CLASSES`/`AppImage` with Phase B primitives, delete the imports if no other consumers remain in this file:

```bash
grep -n "getPlaceholderStyle\|PLACEHOLDER_CLASSES\|AppImage" apps/web/src/components/search/search-results-content.tsx
```

If no hits remain, delete those imports. The placeholder util `apps/web/src/lib/placeholder-color.ts` may still have other consumers — don't delete the util itself.

- [ ] **Step 8: Run search tests**

```bash
./dev test --filter search
```

Expected: existing search component tests pass. If selectors target removed structural elements (e.g. `<AppImage>` test), update assertions.

### Task 8.3: Commit Row 8

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/app/search/page.tsx \
        apps/web/src/components/search/search-results-content.tsx \
        apps/web/src/components/search/__tests__/ 2>/dev/null

git commit -m "$(cat <<'EOF'
feat(search): re-skin /search to POC system

Phase 2.5 Wave 2 row 8. Restyles the search results page to POC
tokens and adopts Phase B primitives:

- Page headings (empty + results): font-serif Fraunces 2.5rem
  font-medium per POC entity-page typography.
- Tabs (all/reciters/albums/tracks): transparent triggers with
  --accent border-b on active state, --text-dim → --text on hover.
  Same pattern as Wave 1 Row 6 lyrics-display.
- Reciter result rows: <ReciterAvatar fluid size="sm"> in 48px
  wrapper replaces the manual gradient initials placeholder.
- Album + track result rows: <CoverArt fluid size="sm"> in 48px
  wrapper replaces the AppImage + tinted SVG dual-path.
- Pagination: --accent active page, --card-bg pages with
  --surface hover, --text-faint disabled state.
- Cheatsheet token swaps throughout (text-foreground → text-[var(--text)],
  bg-card → bg-[var(--card-bg)], etc.).
- HighlightedText mark colors preserved (warning-200/950 light,
  warning-800/50 dark) — POC accent-glow alternative deferred.

Typesense query, search-result DTOs, and the dangerouslySetInnerHTML
snippet rendering all preserved.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave2-discovery-and-auth.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Row 9 — Auth bundle (`(auth)/*` + `/login` + `/check-email`)

**Files touched:**
- `apps/web/src/components/auth/auth-page-shell.tsx` — card surface + heading typography per visual vocabulary.
- `apps/web/src/components/auth/login-form.tsx` — token migration, raw POC card surface in place of shadcn `<Card>`.
- `apps/web/src/components/auth/register-form.tsx` — same pattern.
- `apps/web/src/components/auth/forgot-password-form.tsx` — same.
- `apps/web/src/components/auth/reset-password-form.tsx` — same.
- `apps/web/src/components/auth/check-email-card.tsx` — same.
- `apps/web/src/components/auth/social-buttons.tsx` — token migration on the OAuth provider buttons.
- Page shells (`apps/web/app/login/page.tsx`, `apps/web/app/(auth)/{register,forgot-password,reset-password,verify-email}/page.tsx`, `apps/web/app/check-email/page.tsx`) — usually no change. Verify by reading; if any inline JSX exists outside the form components, restyle it.

**Goal:** All 6 auth surfaces share `<AuthPageShell>` (centered card, contextual AuthReason copy when `?reason=...` query param present) and a per-flow form component. Restyle the shell + form components to POC tokens per the visual vocabulary doc's "Auth surfaces" section.

### Task 9.1: Restyle AuthPageShell

**Files:** `apps/web/src/components/auth/auth-page-shell.tsx`.

- [ ] **Step 1: Replace the file body**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isAuthReason } from '@/lib/auth-reason';

/**
 * Layout wrapper for the /login, /register, /forgot-password, /reset-password,
 * /verify-email, and /check-email pages.
 *
 * When the URL carries a `?reason=save|like|library|contribute|comment` query
 * param, renders a contextual heading + subtext above the form so users see
 * the reason they were bounced to sign in (e.g. "Sign in to save this track").
 * When no reason is present, acts as a pure centering wrapper and the form
 * renders its own heading unchanged.
 *
 * Client Component — reads the query param via useSearchParams().
 */
export function AuthPageShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const params = useSearchParams();
  const reasonParam = params?.get('reason') ?? null;
  const reason = isAuthReason(reasonParam) ? reasonParam : null;
  const t = useTranslations('auth.login');

  return (
    // Sit the card near the top rather than perfectly centred. pt-[12vh]
    // anchors the card ~12% from the top, so short forms still breathe but
    // the void above is gone; pb-12 keeps the footer link off the fold when
    // the virtual keyboard opens on mobile.
    <div className="flex min-h-screen flex-col items-center bg-[var(--bg)] px-4 pb-12 pt-[12vh]">
      <div className="w-full max-w-md">
        {reason ? (
          <div className="mb-6 text-center">
            <h1 className="mb-2 font-serif text-[1.75rem] font-medium text-[var(--text)]">
              {t(`reasonHeading.${reason}`)}
            </h1>
            <p className="text-sm text-[var(--text-dim)]">
              {t(`reasonSubtext.${reason}`)}
            </p>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
```

Changes:
- `bg-background` → `bg-[var(--bg)]`.
- AuthReason heading: `text-2xl font-semibold text-foreground` → `font-serif text-[1.75rem] font-medium text-[var(--text)]` (POC serif at 28px per visual vocabulary).
- AuthReason subtext: `text-muted-foreground` → `text-[var(--text-dim)]`.

### Task 9.2: Restyle login-form

**Files:** `apps/web/src/components/auth/login-form.tsx`.

This file is 118 lines. Read it first to see the full current shape. The restyle pattern is consistent — apply throughout:

- [ ] **Step 1: Replace `<Card>` shadcn primitive with raw POC card surface**

The current top of the JSX:

```tsx
<Card className="px-8 py-10">
  <h1 className="mb-6 text-2xl font-semibold text-foreground">{t('heading')}</h1>
  <form ...>
```

Replace with:

```tsx
<div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-8 py-10">
  <h1 className="mb-6 font-serif text-[1.75rem] font-medium text-[var(--text)]">{t('heading')}</h1>
  <form ...>
```

(The form's outer `</Card>` becomes `</div>`. Drop the `Card` import.)

- [ ] **Step 2: Restyle form labels + helper text + error messages**

Throughout the form, replace cheatsheet tokens:
- `text-foreground` (on labels) → `text-[var(--text)]`
- `text-muted-foreground` (on hint text, "forgot password" link) → `text-[var(--text-dim)]`
- Error message classes (look for `text-destructive` or `text-error-*`): `text-[var(--color-error-500)]`

- [ ] **Step 3: Restyle the "forgot password" + "switch flow" links**

The forgot-password link in the form:

```tsx
<Link
  href="/forgot-password"
  className="text-sm font-medium text-muted-foreground hover:text-foreground"
>
  {t('forgotPassword')}
</Link>
```

Becomes:

```tsx
<Link
  href="/forgot-password"
  className="text-sm font-medium text-[var(--text-dim)] hover:text-[var(--accent)]"
>
  {t('forgotPassword')}
</Link>
```

The "switch to register" link at the bottom of the form:

```tsx
<p className="mt-6 text-center text-sm text-muted-foreground">
  {t('noAccount')}{' '}
  <Link href="/register" className="font-medium text-foreground hover:underline">
    {t('signUpLink')}
  </Link>
</p>
```

Becomes:

```tsx
<p className="mt-6 text-center text-sm text-[var(--text-dim)]">
  {t('noAccount')}{' '}
  <Link href="/register" className="font-medium text-[var(--accent)] hover:underline">
    {t('signUpLink')}
  </Link>
</p>
```

- [ ] **Step 4: Submit CTA**

The submit button uses shadcn `<Button>` primitive — automatic restyle via `--color-primary` cascade. No per-form change needed unless the form passes a custom variant. Verify by reading.

- [ ] **Step 5: Run login-form tests**

```bash
./dev test --filter login-form
```

Update any assertions that target the removed `<Card>` element class strings.

### Task 9.3: Restyle register-form, forgot-password-form, reset-password-form, check-email-card

**Files:** `apps/web/src/components/auth/{register,forgot-password,reset-password,check-email-card}.tsx`.

Apply the same restyle pattern as login-form. Each file:

1. Replace outer `<Card>` with raw `<div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-8 py-10">`. Drop `Card` import.
2. Heading `<h1>` from `text-2xl font-semibold text-foreground` to `font-serif text-[1.75rem] font-medium text-[var(--text)]`.
3. All cheatsheet token swaps on labels, helper text, error messages, switch-flow links.
4. Switch-flow links use `text-[var(--accent)] hover:underline` (e.g. "Already have an account? Sign in" → register-form to login).

Each file is 90-160 lines. Read first, restyle in one pass, run tests for that file:

```bash
./dev test --filter register-form  # then forgot-password-form, etc.
```

### Task 9.4: Restyle social-buttons

**Files:** `apps/web/src/components/auth/social-buttons.tsx`.

This file (143 lines) renders OAuth provider buttons (Google, Apple, Facebook, Microsoft). Each button has provider-specific brand chrome (e.g. Google's white-bg + Google logo, Apple's black-bg + Apple logo). Per the spec, brand colors stay (Apple stays black, Google stays white-with-multicolor). The chrome around the button list — the "Or continue with" divider, button container — gets the cheatsheet treatment.

- [ ] **Step 1: Restyle the divider**

Find the "Or continue with" divider (typical pattern):

```tsx
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith')}</span>
  </div>
</div>
```

Replace with:

```tsx
<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t border-[var(--border)]" />
  </div>
  <div className="relative flex justify-center text-xs uppercase">
    <span className="bg-[var(--card-bg)] px-2 text-[var(--text-dim)]">{t('orContinueWith')}</span>
  </div>
</div>
```

(Adapt to the actual structure. The key swaps: `border-border` → `border-[var(--border)]`, `bg-card` → `bg-[var(--card-bg)]`, `text-muted-foreground` → `text-[var(--text-dim)]`.)

- [ ] **Step 2: Provider button chrome**

The buttons themselves keep brand colors per the spec ("Apple black, Google brand colors" — see Phase 2.3 audit notes). The button border/hover styling can adopt POC tokens:
- `border-input` → `border-[var(--border)]`
- `hover:bg-muted` → `hover:bg-[var(--surface)]`

Don't touch the brand-colored backgrounds (Google's white, Apple's black) or the brand SVG logos.

- [ ] **Step 3: Run social-buttons tests**

```bash
./dev test --filter social-buttons
```

### Task 9.5: Verify auth page shells

For each auth page shell file (login, register, forgot-password, reset-password, verify-email, check-email), open the file and confirm it's a thin wrapper around `<AuthPageShell>` + a form component. If any inline JSX renders outside the form (e.g. extra layout chrome), apply the cheatsheet to it.

Most are 30-50 lines and have no inline JSX outside `<AuthPageShell>{form}</AuthPageShell>`. No per-page changes required.

The `apps/web/app/(auth)/verify-email/page.tsx` is the exception — it likely renders its own messaging inline depending on the verification token state. Read it and restyle inline JSX per the cheatsheet.

### Task 9.6: Run all auth tests

```bash
./dev test --filter auth
```

Expected: 5+ test files exercise auth components. Update any assertions targeting the removed `<Card>` primitive or shadcn-tokened class strings. The Better-Auth integration tests should still pass — they don't care about visual classes.

### Task 9.7: Commit Row 9

- [ ] **Step 1: Stage and commit**

```bash
git add apps/web/src/components/auth/ \
        apps/web/app/login/page.tsx \
        apps/web/app/\(auth\)/ \
        apps/web/app/check-email/page.tsx 2>/dev/null

git commit -m "$(cat <<'EOF'
feat(auth): re-skin all 6 (auth)/* surfaces to POC system

Phase 2.5 Wave 2 row 9. Restyles the auth bundle (login, register,
forgot-password, reset-password, verify-email, check-email) to
POC tokens per the visual-vocabulary "Auth surfaces" section:

- AuthPageShell: --bg page background; AuthReason contextual heading
  switches to font-serif Fraunces 1.75rem font-medium per POC.
  Pure-centering wrapper layout preserved (12vh top anchor).
- LoginForm / RegisterForm / ForgotPasswordForm / ResetPasswordForm
  / CheckEmailCard: shadcn <Card> primitive replaced with raw POC
  card surface (rounded-2xl border --border bg --card-bg px-8 py-10).
  Heading typography matches AuthReason. Form labels in --text,
  helper text and switch-flow text in --text-dim, switch-flow links
  in --accent. Submit CTAs auto-restyle via shadcn Button + Phase A
  --color-primary cascade.
- SocialButtons: divider chrome + button border/hover migrated.
  Brand colors preserved (Apple black, Google white-with-multicolor)
  per Phase 2.3 audit's resolved decision.

Better-Auth wiring (signIn / signUp / sendVerificationEmail / etc.),
form state, error handling, and the AuthReason contextual-copy logic
all preserved verbatim. Page shells (login/register/forgot-password/
reset-password/verify-email/check-email) auto-pickup via component
composition; no per-page changes.

Refs: docs/superpowers/specs/2026-04-24-poc-design-port-design.md
      docs/superpowers/plans/2026-04-24-phase-2-5-pages-wave2-discovery-and-auth.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## End-of-Wave QA

### Task 10.1: Full QA + push

- [ ] **Step 1: Full unit test suite**

```bash
./dev qa
```

Expected: typecheck + lint + ~489+ tests green. Test count delta from Wave 2: small (most touched components didn't have or get unit tests; auth tests get assertion updates rather than additions).

- [ ] **Step 2: Run E2E**

```bash
./dev test:e2e --ci
```

Expected: the 21 failures still open from Wave 1 (search/contributor/moderation/user-library) may shift after Wave 2:
- /search restyle should fix some search.spec.ts failures (the ones gated on visual structure rather than data).
- /library/tracks restyle may affect user-library.spec.ts assertions — update if needed.
- Auth restyle may affect contributor-submissions email-verification flow if any test asserts on auth-form selectors.

If new regressions appear (Wave 2 broke a previously-passing test), fix in this row's commit or a fix-forward. If Group E failures persist (mailpit-related, etc.), they're still out of scope and remain on the follow-up task list.

- [ ] **Step 3: Push branch**

```bash
git push origin phase-2.5-poc-reskin
```

- [ ] **Step 4: Hand off to Wave 3**

Wave 3 (separate plan) covers:
- `/contribute`, `/contribute/{reciter,album,track}`, `/contribute/edit/*`
- `/mod`, `/mod/queue`, `/mod/submissions/[id]`, `/mod/audit`, `/mod/users`
- `(protected)/profile`, `(protected)/settings`, `(protected)/library/history`
- `error.tsx`, `not-found.tsx`, every `loading.tsx`

Once Wave 3 ships, the feature branch is reviewed against the spec's pre-merge gates and merged to `main` as a single merge commit.

---

## Self-review checklist

After implementing Wave 2:

1. **Spec coverage:** Are all 3 routes from spec rows 7-9 covered? (library/tracks ✓, search ✓, all 6 auth pages ✓)
2. **Token consistency:** No `text-foreground / text-muted-foreground / bg-muted / border-border / bg-card` remain in `apps/web/src/components/{library,search,auth}/`?
3. **Phase B primitive adoption:** `<CoverArt>` + `<ReciterAvatar>` consumed in search-results-content for entity rows?
4. **No new shadcn `<Card>`** in the auth components (replaced with raw POC card surfaces)?
5. **Tests still green:** Every commit on the branch passes `./dev qa`?
6. **No accidental scope creep:** No Wave 3 routes touched (contribute/mod/profile/settings/history/error)?
7. **Better-Auth wiring preserved:** All form-state hooks, signIn/signUp/etc. calls unchanged?
8. **AuthReason contextual copy preserved:** AuthPageShell still reads the `?reason=` query param and renders the contextual heading?

For the plan as a whole:

- **Placeholder scan:** No "TBD", no "TODO", no "implement later". Code blocks are complete in every code step.
- **Type consistency:** Phase B primitive prop names (`<CoverArt size="sm" fluid>`, `<ReciterAvatar size="sm" fluid>`) match what was established in Wave 1.
- **No imaginary symbols:** All imports either in `@nawhas/ui`, `@/components/...`, or existing app code.

## Notes on Wave 3

**Wave 3 — Contributor + moderator + protected + boundaries** will:
- Restyle the W1 contribute forms (preserve ParentPicker, ImageUpload, AudioUpload, SlugPreview, LyricsTabs primitive logic; only chrome migrates).
- Restyle the mod surfaces (queue, submission detail with field diffs, audit log, users).
- Restyle profile / settings / library/history.
- Restyle error.tsx, not-found.tsx, every loading.tsx.
- Audit-and-delete the legacy `placeholder-color.ts` util once no consumers remain.
- Pick up the deferred items from Wave 1's task #22 (re-adopt TrackRow in home/popular-tracks + top-nawhas-table; consolidate two-album-cards; extract formatDuration; etc.).

After Wave 3, the spec's pre-merge gates (Section 7 of the spec) are run against the branch and Phase 2.5 merges to `main` as a single merge commit per the rollback plan.
