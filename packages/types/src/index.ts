// Shared DTOs and interfaces for the Nawhas platform.
// All types used across packages and apps should be defined here.

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PaginationInput {
  limit?: number;
  cursor?: string;
}

// ---------------------------------------------------------------------------
// Lyrics
// ---------------------------------------------------------------------------

export interface LyricDTO {
  id: string;
  trackId: string;
  language: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Reciters
// ---------------------------------------------------------------------------

export interface ReciterDTO {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReciterWithAlbumsDTO extends ReciterDTO {
  albums: AlbumDTO[];
}

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export interface AlbumDTO {
  id: string;
  title: string;
  slug: string;
  reciterId: string;
  year: number | null;
  artworkUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlbumWithTracksDTO extends AlbumDTO {
  tracks: TrackDTO[];
}

/**
 * Extended album DTO used on the album detail page, including ordered tracks
 * and the reciter's name and slug (pre-fetched via JOIN to avoid an extra query).
 */
export interface AlbumDetailDTO extends AlbumWithTracksDTO {
  reciterName: string;
  reciterSlug: string;
}

/**
 * Extended album DTO used in listing pages where reciter name and track count
 * are pre-fetched via a JOIN to avoid N+1 queries.
 */
export interface AlbumListItemDTO extends AlbumDTO {
  reciterName: string;
  reciterSlug: string;
  trackCount: number;
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export interface TrackDTO {
  id: string;
  title: string;
  slug: string;
  albumId: string;
  trackNumber: number | null;
  audioUrl: string | null;
  youtubeId: string | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackWithRelationsDTO extends TrackDTO {
  reciter: ReciterDTO;
  album: AlbumDTO;
  lyrics: LyricDTO[];
}

// ---------------------------------------------------------------------------
// Auth / Users
// ---------------------------------------------------------------------------

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface SessionDTO {
  user: UserDTO;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Home / Featured
// ---------------------------------------------------------------------------

export interface FeaturedDTO {
  reciters: ReciterDTO[];
  albums: AlbumDTO[];
  tracks: TrackDTO[];
}
