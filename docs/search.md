# Search (Typesense)

Nawhas.com uses [Typesense](https://typesense.org/) for full-text search. Typesense is self-hosted, open-source, and has first-class support for Arabic and Urdu via ICU tokenisation.

## Collections

Three collections are maintained, mirroring the core domain entities:

### `reciters`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID from PostgreSQL |
| `name` | string | Indexed, search field |
| `slug` | string | Not indexed |

Search fields: `name`

### `albums`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID from PostgreSQL |
| `title` | string | Indexed, search field |
| `slug` | string | Not indexed |
| `reciterId` | string | Facet field |
| `reciterName` | string | Indexed, search field |
| `year` | int32 | Facet field, optional |
| `artworkUrl` | string | Not indexed, optional |

Search fields: `title`, `reciterName`

### `tracks`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID from PostgreSQL |
| `title` | string | Indexed, search field |
| `slug` | string | Not indexed |
| `trackNumber` | int32 | Optional |
| `albumId` | string | Facet field |
| `albumTitle` | string | Indexed, search field |
| `albumSlug` | string | Not indexed |
| `reciterId` | string | Facet field |
| `reciterName` | string | Indexed, search field |
| `reciterSlug` | string | Not indexed |
| `lyrics_ar` | string | Arabic lyrics — ICU tokenisation + diacritic removal, optional |
| `lyrics_ur` | string | Urdu lyrics — ICU tokenisation + diacritic removal, optional |
| `lyrics_*` | string | Dynamic: `lyrics_en`, `lyrics_fr`, `lyrics_transliteration`, etc. |

Search fields: `title`, `albumTitle`, `reciterName`, `lyrics_ar`, `lyrics_ur`, `lyrics_en`, `lyrics_fr`, `lyrics_transliteration`

**Typo tolerance:** Always on (threshold 1) — critical for Arabic/Urdu queries.

**Dynamic lyrics fields:** New language codes in the `lyrics` table appear automatically as `lyrics_<language>` in Typesense. No schema changes needed.

## Architecture

```
PostgreSQL (source of truth)
       │
       ├── syncReciter(id)  →  Typesense reciters collection
       ├── syncAlbum(id)    →  Typesense albums collection
       └── syncTrack(id)    →  Typesense tracks collection
                                    (enriched: album + reciter + all lyrics)
```

**Key files:**
- `apps/web/src/lib/typesense/collections.ts` — collection schema definitions
- `apps/web/src/lib/typesense/sync.ts` — incremental sync functions
- `apps/web/src/lib/typesense/client.ts` — Typesense client (server-side only)
- `packages/db/src/search-index.ts` — full re-index script
- `apps/web/src/server/routers/search.ts` — tRPC search procedures

## Sync Strategy

### Incremental sync

When a reciter, album, or track is created or updated, call the corresponding sync function:

```typescript
import { syncReciter, syncAlbum, syncTrack } from '@/lib/typesense/sync';

// After creating/updating a track
await syncTrack(track.id);
```

Each function:
1. Fetches the full entity from PostgreSQL (with related data joined)
2. Upserts the document to Typesense
3. Updates the `typesenseSyncedAt` timestamp on the PostgreSQL row

### Full re-index

To rebuild all three collections from scratch (replaces all documents):

```bash
./dev db:seed              # dev: seed + re-index
# OR production:
./dev exec web pnpm --filter @nawhas/db db:search-index
```

`db:search-index` is idempotent and safe to run at any time. It:
1. Clears each collection
2. Batch-imports all reciters, albums, and tracks from PostgreSQL
3. Back-fills `typesenseSyncedAt` for every row

## tRPC Search Procedures

### `search.autocomplete`

Fast autocomplete — single Typesense multi-search call across all three collections.

**Input:** `{ q: string }` (1–100 characters)

**Returns:**
```typescript
{
  reciters: Array<{ id, name, slug, highlights }>,  // top 3
  albums:   Array<{ id, title, slug, reciterId, reciterName, year?, artworkUrl?, highlights }>, // top 3
  tracks:   Array<{ id, title, slug, albumId, albumTitle, reciterId, reciterName, highlights }>, // top 5
}
```

### `search.query`

Paginated full search with optional type filter.

**Input:**
```typescript
{
  q:       string,                             // 1–100 characters
  type:    'all' | 'reciters' | 'albums' | 'tracks', // default: 'all'
  page:    number,                             // default: 1
  perPage: number,                             // 1–50, default: 20
}
```

**Returns:**
```typescript
{
  hits:       Array<SearchHitDTO>,  // type, item data, highlights
  found:      number,               // total matching documents
  page:       number,
  totalPages: number,
  perPage:    number,
}
```

When `type: 'all'`, `perPage` is split equally across the three collections (remainder goes to tracks).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TYPESENSE_HOST` | Typesense server hostname |
| `TYPESENSE_PORT` | Port (8108 for HTTP, 443 for HTTPS) |
| `TYPESENSE_PROTOCOL` | `http` or `https` |
| `TYPESENSE_API_KEY` | Admin key — server-side only, never sent to the browser |
| `TYPESENSE_SEARCH_API_KEY` | Read-only search key — safe for browser use |

## Adding a New Searchable Entity

1. **Define the Typesense collection schema** in `apps/web/src/lib/typesense/collections.ts`
2. **Create a sync function** in `apps/web/src/lib/typesense/sync.ts` following the pattern of `syncTrack()`
3. **Call the sync function** from the tRPC mutation that creates/updates the entity
4. **Add the entity to `runSearchIndex()`** in `packages/db/src/search-index.ts` for the full re-index path
5. **Update the search router** (`apps/web/src/server/routers/search.ts`) to include the new collection in `autocomplete` and `query`

## Local Development

The Typesense admin dashboard is not included in the default Docker setup, but you can query the API directly:

```bash
# List collections
curl http://localhost:8108/collections \
  -H "X-TYPESENSE-API-KEY: nawhas-typesense-key"

# Search tracks
curl "http://localhost:8108/collections/tracks/documents/search?q=hussain&query_by=title" \
  -H "X-TYPESENSE-API-KEY: nawhas-typesense-key"
```

The dev API key is `nawhas-typesense-key` (set in `docker-compose.yml`).
