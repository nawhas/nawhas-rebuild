import { z } from 'zod';
import { typesenseClient } from '@/lib/typesense/client';
import { COLLECTIONS } from '@/lib/typesense/collections';
import { router, publicProcedure } from '../trpc/trpc';
import type {
  AutocompleteDTO,
  SearchResultDTO,
  SearchHitDTO,
  SearchHighlightDTO,
} from '@nawhas/types';

// ---------------------------------------------------------------------------
// Internal document types — mirror the Typesense collection schemas exactly.
// Used only inside this router; public types live in @nawhas/types.
// ---------------------------------------------------------------------------

interface ReciterDoc {
  id: string;
  name: string;
  slug: string;
}

interface AlbumDoc {
  id: string;
  title: string;
  slug: string;
  reciterId: string;
  reciterName: string;
  year?: number;
  artworkUrl?: string;
}

interface TrackDoc {
  id: string;
  title: string;
  slug: string;
  trackNumber?: number;
  albumId: string;
  albumTitle: string;
  albumSlug: string;
  reciterId: string;
  reciterName: string;
  reciterSlug: string;
  // Lyrics fields synced dynamically; not always present.
  lyrics_ar?: string;
  lyrics_ur?: string;
  [key: string]: string | number | undefined;
}

// Fields searched on tracks — title/album/reciter plus all lyrics fields
// (Arabic, Urdu, transliteration, wildcard for any other language).
const TRACK_QUERY_BY =
  'title,albumTitle,reciterName,lyrics_ar,lyrics_ur,lyrics_.*';

// Below this many results Typesense attempts typo-correction;
// 1 = always try typos even when a match exists (important for Arabic/Urdu).
const TYPO_TOKENS_THRESHOLD = 1;

// ---------------------------------------------------------------------------
// Highlight extraction helper
// ---------------------------------------------------------------------------

/**
 * Normalises the `highlights` array from a Typesense hit into our flat DTO.
 * Filters out entries without a usable snippet.
 */
function extractHighlights(
  highlights:
    | Array<{ field: string | number | symbol; snippet?: string }>
    | undefined,
): SearchHighlightDTO[] {
  if (!highlights) return [];
  return highlights
    .filter((h): h is { field: string; snippet: string } =>
      typeof h.field === 'string' && h.snippet != null,
    )
    .map((h) => ({ field: h.field, snippet: h.snippet }));
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const searchRouter = router({
  /**
   * Autocomplete: multi-search across reciters, albums, and tracks in a single
   * Typesense round-trip. Returns top 3 reciters, 3 albums, and 5 tracks.
   *
   * The admin API key is never sent to the browser — all queries run
   * server-side inside this tRPC procedure.
   */
  autocomplete: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ input }): Promise<AutocompleteDTO> => {
      const results = await typesenseClient.multiSearch.perform<
        [ReciterDoc, AlbumDoc, TrackDoc]
      >(
        {
          searches: [
            {
              collection: COLLECTIONS.reciters,
              q: input.q,
              query_by: 'name',
              per_page: 3,
            },
            {
              collection: COLLECTIONS.albums,
              q: input.q,
              query_by: 'title,reciterName',
              per_page: 3,
            },
            {
              collection: COLLECTIONS.tracks,
              q: input.q,
              query_by: TRACK_QUERY_BY,
              typo_tokens_threshold: TYPO_TOKENS_THRESHOLD,
              per_page: 5,
            },
          ],
        },
        {},
      );

      const [recitersResult, albumsResult, tracksResult] = results.results;

      return {
        reciters: (recitersResult.hits ?? []).map((hit) => ({
          id: hit.document.id,
          name: hit.document.name,
          slug: hit.document.slug,
          highlights: extractHighlights(hit.highlights),
        })),

        albums: (albumsResult.hits ?? []).map((hit) => ({
          id: hit.document.id,
          title: hit.document.title,
          slug: hit.document.slug,
          reciterId: hit.document.reciterId,
          reciterName: hit.document.reciterName,
          year: hit.document.year ?? null,
          artworkUrl: hit.document.artworkUrl ?? null,
          highlights: extractHighlights(hit.highlights),
        })),

        tracks: (tracksResult.hits ?? []).map((hit) => ({
          id: hit.document.id,
          title: hit.document.title,
          slug: hit.document.slug,
          trackNumber: hit.document.trackNumber ?? null,
          albumId: hit.document.albumId,
          albumTitle: hit.document.albumTitle,
          albumSlug: hit.document.albumSlug,
          reciterId: hit.document.reciterId,
          reciterName: hit.document.reciterName,
          reciterSlug: hit.document.reciterSlug,
          highlights: extractHighlights(hit.highlights),
        })),
      };
    }),

  /**
   * Full paginated search with optional type filter.
   *
   * - type = 'reciters' | 'albums' | 'tracks': queries that collection only.
   * - type = 'all' (default): multi-search across all three collections; the
   *   per-page budget is divided equally and results are grouped by type.
   */
  query: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(100),
        type: z
          .enum(['all', 'reciters', 'albums', 'tracks'])
          .optional()
          .default('all'),
        page: z.number().int().min(1).optional().default(1),
        perPage: z.number().int().min(1).max(50).optional().default(20),
      }),
    )
    .query(async ({ input }): Promise<SearchResultDTO> => {
      const { q, type, page, perPage } = input;

      // -- Single-collection paths ------------------------------------------

      if (type === 'reciters') {
        const result = await typesenseClient
          .collections<ReciterDoc>(COLLECTIONS.reciters)
          .documents()
          .search({ q, query_by: 'name', page, per_page: perPage });

        const hits: SearchHitDTO[] = (result.hits ?? []).map((hit) => ({
          type: 'reciter' as const,
          item: { id: hit.document.id, name: hit.document.name, slug: hit.document.slug },
          highlights: extractHighlights(hit.highlights),
        }));

        return {
          hits,
          found: result.found,
          page: result.page,
          totalPages: Math.ceil(result.found / perPage),
          perPage,
        };
      }

      if (type === 'albums') {
        const result = await typesenseClient
          .collections<AlbumDoc>(COLLECTIONS.albums)
          .documents()
          .search({ q, query_by: 'title,reciterName', page, per_page: perPage });

        const hits: SearchHitDTO[] = (result.hits ?? []).map((hit) => ({
          type: 'album' as const,
          item: {
            id: hit.document.id,
            title: hit.document.title,
            slug: hit.document.slug,
            reciterId: hit.document.reciterId,
            reciterName: hit.document.reciterName,
            year: hit.document.year ?? null,
            artworkUrl: hit.document.artworkUrl ?? null,
          },
          highlights: extractHighlights(hit.highlights),
        }));

        return {
          hits,
          found: result.found,
          page: result.page,
          totalPages: Math.ceil(result.found / perPage),
          perPage,
        };
      }

      if (type === 'tracks') {
        const result = await typesenseClient
          .collections<TrackDoc>(COLLECTIONS.tracks)
          .documents()
          .search({
            q,
            query_by: TRACK_QUERY_BY,
            typo_tokens_threshold: TYPO_TOKENS_THRESHOLD,
            page,
            per_page: perPage,
          });

        const hits: SearchHitDTO[] = (result.hits ?? []).map((hit) => ({
          type: 'track' as const,
          item: {
            id: hit.document.id,
            title: hit.document.title,
            slug: hit.document.slug,
            trackNumber: hit.document.trackNumber ?? null,
            albumId: hit.document.albumId,
            albumTitle: hit.document.albumTitle,
            albumSlug: hit.document.albumSlug,
            reciterId: hit.document.reciterId,
            reciterName: hit.document.reciterName,
            reciterSlug: hit.document.reciterSlug,
          },
          highlights: extractHighlights(hit.highlights),
        }));

        return {
          hits,
          found: result.found,
          page: result.page,
          totalPages: Math.ceil(result.found / perPage),
          perPage,
        };
      }

      // -- type === 'all': multi-search across all three collections ----------
      // Divide perPage evenly; any remainder goes to tracks (highest cardinality).
      const perCollection = Math.floor(perPage / 3);
      const tracksPerPage = perPage - perCollection * 2;

      const multiResults = await typesenseClient.multiSearch.perform<
        [ReciterDoc, AlbumDoc, TrackDoc]
      >(
        {
          searches: [
            {
              collection: COLLECTIONS.reciters,
              q,
              query_by: 'name',
              page,
              per_page: perCollection,
            },
            {
              collection: COLLECTIONS.albums,
              q,
              query_by: 'title,reciterName',
              page,
              per_page: perCollection,
            },
            {
              collection: COLLECTIONS.tracks,
              q,
              query_by: TRACK_QUERY_BY,
              typo_tokens_threshold: TYPO_TOKENS_THRESHOLD,
              page,
              per_page: tracksPerPage,
            },
          ],
        },
        {},
      );

      const [rResult, aResult, tResult] = multiResults.results;

      const hits: SearchHitDTO[] = [
        ...(rResult.hits ?? []).map((hit) => ({
          type: 'reciter' as const,
          item: { id: hit.document.id, name: hit.document.name, slug: hit.document.slug },
          highlights: extractHighlights(hit.highlights),
        })),
        ...(aResult.hits ?? []).map((hit) => ({
          type: 'album' as const,
          item: {
            id: hit.document.id,
            title: hit.document.title,
            slug: hit.document.slug,
            reciterId: hit.document.reciterId,
            reciterName: hit.document.reciterName,
            year: hit.document.year ?? null,
            artworkUrl: hit.document.artworkUrl ?? null,
          },
          highlights: extractHighlights(hit.highlights),
        })),
        ...(tResult.hits ?? []).map((hit) => ({
          type: 'track' as const,
          item: {
            id: hit.document.id,
            title: hit.document.title,
            slug: hit.document.slug,
            trackNumber: hit.document.trackNumber ?? null,
            albumId: hit.document.albumId,
            albumTitle: hit.document.albumTitle,
            albumSlug: hit.document.albumSlug,
            reciterId: hit.document.reciterId,
            reciterName: hit.document.reciterName,
            reciterSlug: hit.document.reciterSlug,
          },
          highlights: extractHighlights(hit.highlights),
        })),
      ];

      const found = (rResult.found ?? 0) + (aResult.found ?? 0) + (tResult.found ?? 0);

      return {
        hits,
        found,
        page,
        totalPages: Math.ceil(found / perPage),
        perPage,
      };
    }),
});
