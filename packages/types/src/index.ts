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
  role: string;
}

export interface SessionDTO {
  user: UserDTO;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// User Library
// ---------------------------------------------------------------------------

export interface SavedTrackDTO {
  trackId: string;
  savedAt: string; // ISO
  track: TrackDTO;
}

export interface ListenHistoryEntryDTO {
  id: string;
  trackId: string;
  playedAt: string; // ISO
  track: TrackDTO;
}

// ---------------------------------------------------------------------------
// Home / Featured
// ---------------------------------------------------------------------------

export interface FeaturedDTO {
  reciters: ReciterDTO[];
  albums: AlbumDTO[];
  tracks: TrackDTO[];
}

// ---------------------------------------------------------------------------
// Account / Notification Preferences
// ---------------------------------------------------------------------------

export interface NotificationPrefsDTO {
  email: {
    newAlbums: boolean;
    weeklyDigest: boolean;
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchHighlightDTO {
  field: string;
  snippet: string;
}

/** Reciter as stored in Typesense — lightweight, no timestamps. */
export interface ReciterSearchItemDTO {
  id: string;
  name: string;
  slug: string;
}

/** Album as stored in Typesense — includes denormalized reciter name. */
export interface AlbumSearchItemDTO {
  id: string;
  title: string;
  slug: string;
  reciterId: string;
  reciterName: string;
  year: number | null;
  artworkUrl: string | null;
}

/** Track as stored in Typesense — includes denormalized album and reciter data. */
export interface TrackSearchItemDTO {
  id: string;
  title: string;
  slug: string;
  trackNumber: number | null;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  reciterId: string;
  reciterName: string;
  reciterSlug: string;
}

/** A single search hit with type discriminator and highlight snippets. */
export type SearchHitDTO =
  | { type: 'reciter'; item: ReciterSearchItemDTO; highlights: SearchHighlightDTO[] }
  | { type: 'album'; item: AlbumSearchItemDTO; highlights: SearchHighlightDTO[] }
  | { type: 'track'; item: TrackSearchItemDTO; highlights: SearchHighlightDTO[] };

/** Paginated result set returned by search.query. */
export interface SearchResultDTO {
  hits: SearchHitDTO[];
  found: number;
  page: number;
  totalPages: number;
  perPage: number;
}

/** Grouped autocomplete response with per-item highlight snippets. */
export interface AutocompleteDTO {
  reciters: Array<ReciterSearchItemDTO & { highlights: SearchHighlightDTO[] }>;
  albums: Array<AlbumSearchItemDTO & { highlights: SearchHighlightDTO[] }>;
  tracks: Array<TrackSearchItemDTO & { highlights: SearchHighlightDTO[] }>;
}

// ---------------------------------------------------------------------------
// Community Contributions — Submissions & Moderation
// ---------------------------------------------------------------------------

export type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type SubmissionType = 'reciter' | 'album' | 'track';
export type SubmissionAction = 'create' | 'edit';
export type ReviewAction = 'approved' | 'rejected' | 'changes_requested';

/** Reciter fields submitted for creation or edit. */
export interface ReciterSubmissionData {
  name: string;
  slug?: string;
}

/** Album fields submitted for creation or edit. */
export interface AlbumSubmissionData {
  title: string;
  reciterId: string;
  slug?: string;
  year?: number;
  artworkUrl?: string;
}

/** Track fields submitted for creation or edit. */
export interface TrackSubmissionData {
  title: string;
  albumId: string;
  slug?: string;
  trackNumber?: number;
  audioUrl?: string;
  youtubeId?: string;
  duration?: number;
}

export type SubmissionData = ReciterSubmissionData | AlbumSubmissionData | TrackSubmissionData;

export interface SubmissionDTO {
  id: string;
  type: SubmissionType;
  action: SubmissionAction;
  targetId: string | null;
  data: SubmissionData;
  status: SubmissionStatus;
  submittedByUserId: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogDTO {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}
