# Data Model

The database is PostgreSQL 16, accessed via Drizzle ORM. Schema files live in `packages/db/src/schema/`.

## Entity Relationships

```
reciters
   │
   └── albums (one-to-many, cascade delete)
          │
          └── tracks (one-to-many, cascade delete)
                 │
                 └── lyrics (one-to-many, cascade delete)
                       one row per language per track
```

Better-Auth manages its own tables (`user`, `session`, `account`, `verification`) independently of the domain model.

## Tables

### `reciters`

Profiles for nawha reciters.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default random | |
| `name` | text | NOT NULL | Display name |
| `slug` | text | NOT NULL, UNIQUE | URL-safe identifier |
| `typesenseSyncedAt` | timestamptz | nullable | Last Typesense sync timestamp |
| `createdAt` | timestamptz | NOT NULL, default now() | |
| `updatedAt` | timestamptz | NOT NULL, default now() | |

### `albums`

Albums belonging to a reciter.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default random | |
| `title` | text | NOT NULL | |
| `slug` | text | NOT NULL | URL-safe, unique within reciter |
| `reciterId` | UUID | FK → reciters.id, cascade delete | |
| `year` | integer | nullable | Release year |
| `artworkUrl` | text | nullable | MinIO/S3 public URL |
| `typesenseSyncedAt` | timestamptz | nullable | |
| `createdAt` | timestamptz | NOT NULL, default now() | |
| `updatedAt` | timestamptz | NOT NULL, default now() | |

**Unique constraint:** `(reciterId, slug)` — slugs are unique per reciter, not globally.  
**Index:** `reciterId`

### `tracks`

Individual nawha recordings within an album.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default random | |
| `title` | text | NOT NULL | |
| `slug` | text | NOT NULL | URL-safe, unique within album |
| `albumId` | UUID | FK → albums.id, cascade delete | |
| `trackNumber` | integer | nullable | Position in album |
| `audioUrl` | text | nullable | MinIO/S3 public URL for the MP3 |
| `youtubeId` | text | nullable | YouTube video ID (e.g. `dQw4w9WgXcQ`) |
| `duration` | integer | nullable | Duration in seconds |
| `typesenseSyncedAt` | timestamptz | nullable | |
| `createdAt` | timestamptz | NOT NULL, default now() | |
| `updatedAt` | timestamptz | NOT NULL, default now() | |

**Unique constraint:** `(albumId, slug)`  
**Index:** `albumId`

### `lyrics`

Lyrics text for a track, one row per language.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK, default random | |
| `trackId` | UUID | FK → tracks.id, cascade delete | |
| `language` | text | NOT NULL | ISO 639-1 code or `transliteration` |
| `text` | text | NOT NULL | Full lyrics content |
| `createdAt` | timestamptz | NOT NULL, default now() | |
| `updatedAt` | timestamptz | NOT NULL, default now() | |

**Unique constraint:** `(trackId, language)` — one row per language per track.  
**Index:** `trackId`

**Supported language values:** `ar` (Arabic), `ur` (Urdu), `en` (English), `fr` (French), `transliteration`

### Better-Auth tables

Better-Auth manages these tables via its own adapter. Do not modify them manually.

| Table | Purpose |
|-------|---------|
| `user` | Registered user accounts |
| `session` | Active sessions (HTTP-only cookie token) |
| `account` | OAuth provider links (future) |
| `verification` | Email verification tokens |

These tables use camelCase column names and timestamps without timezone, as required by the Better-Auth schema contract.

## URL Structure

The app uses a three-level URL hierarchy derived from slugs:

```
/reciters/{reciter.slug}
/reciters/{reciter.slug}/{album.slug}
/reciters/{reciter.slug}/{album.slug}/{track.slug}
```

Slugs are unique at each level: reciter slugs globally, album slugs per reciter, track slugs per album.

## Drizzle ORM

### Writing queries

Import the database client and schema:

```typescript
import { db } from '@nawhas/db';
import { reciters, albums, tracks } from '@nawhas/db/schema';
import { eq, and } from 'drizzle-orm';

// Fetch a track with its album and reciter
const track = await db.query.tracks.findFirst({
  where: and(eq(tracks.slug, trackSlug), eq(albums.slug, albumSlug)),
  with: {
    album: {
      with: { reciter: true },
    },
    lyrics: true,
  },
});
```

### Migrations

After editing schema files in `packages/db/src/schema/`:

```bash
# Generate the migration SQL
pnpm --filter @nawhas/db db:generate

# Review the generated file in packages/db/src/migrations/
# Then apply it
./dev db:migrate
```

The Drizzle config reads the compiled schema (`dist/schema/index.js`), so run `pnpm --filter @nawhas/db build` first if the types haven't been compiled yet.

### Drizzle Studio (local DB browser)

```bash
pnpm --filter @nawhas/db db:studio
```

Opens a browser-based schema and data explorer at `https://local.drizzle.studio`.

## Seeding

The seed script (`packages/db/src/seed.ts`) creates fixture reciters, albums, tracks, and lyrics, uploads placeholder audio/image files to MinIO, and runs a full Typesense re-index.

```bash
./dev db:seed    # seed + index
./dev db:reset   # drop all data, re-migrate, seed + index
```

Seed data uses deterministic slugs so the seeded URLs are stable across resets.
