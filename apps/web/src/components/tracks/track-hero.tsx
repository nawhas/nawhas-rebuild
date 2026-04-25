import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CoverArt } from '@nawhas/ui';
import type { TrackWithRelationsDTO } from '@nawhas/types';
import { TrackDetailPlayButton } from '@/components/player/track-detail-play-button';
import { SaveButton } from '@/components/SaveButton';

interface TrackHeroProps {
  track: TrackWithRelationsDTO;
}

/**
 * Track-detail hero — POC 2-column layout.
 *
 * Layout:
 *   [ 360px cover ]  [ eyebrow / 72px serif title / reciter pill / play+save+edit+more ]
 *
 * Background: red radial-glow centered behind the cover.
 *
 * Server Component — composes Client Components (SaveButton,
 * TrackDetailPlayButton) but doesn't itself need interactivity.
 */
export async function TrackHero({ track }: TrackHeroProps): Promise<React.JSX.Element> {
  const t = await getTranslations('trackDetail');

  const reciterInitials = computeInitials(track.reciter.name);
  const editHref = `/contribute/edit/track/${track.reciter.slug}/${track.album.slug}/${track.slug}`;

  return (
    <header className="relative isolate py-6">
      {/* Red radial glow positioned behind the cover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 -z-10 h-[500px] w-[500px]"
        style={{
          background:
            'radial-gradient(circle, var(--accent-glow) 0%, transparent 60%)',
        }}
      />

      <div className="grid grid-cols-1 items-end gap-12 md:grid-cols-[360px_1fr]">
        {/* Cover */}
        <div className="aspect-square w-full max-w-[360px]">
          <CoverArt
            slug={track.slug}
            artworkUrl={track.album.artworkUrl}
            label={track.title.slice(0, 3).toUpperCase()}
            fluid
          />
        </div>

        {/* Title block */}
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.15em] text-[var(--text-dim)]">
            {t('eyebrow')}
          </p>
          <h1 className="mb-6 font-serif font-normal leading-none tracking-[-0.03em] text-[var(--text)] text-[clamp(40px,6vw,72px)]">
            {track.title}
          </h1>

          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-dim)]">
            <Link
              href={`/reciters/${track.reciter.slug}`}
              className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-1 pr-3.5 text-[13px] text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white"
              >
                {reciterInitials}
              </span>
              {track.reciter.name}
            </Link>
            {track.album.year != null && (
              <>
                <span aria-hidden="true" className="text-[var(--text-faint)]">·</span>
                <span>{track.album.year}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TrackDetailPlayButton
              track={track}
              lyrics={track.lyrics}
              variant="hero"
            />

            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-dim)]">
              <SaveButton trackId={track.id} className="text-[var(--text-dim)] hover:text-[var(--accent)]" />
            </span>

            <Link
              href={editHref}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <PencilIcon />
              {t('suggestEdit')}
            </Link>

            {/* Stub overflow — placeholder for share / report / queue actions */}
            <button
              type="button"
              aria-label={t('moreOptions')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <span aria-hidden="true">&hellip;</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function PencilIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
