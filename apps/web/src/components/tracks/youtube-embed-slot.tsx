interface YoutubeEmbedSlotProps {
  youtubeId: string;
}

/**
 * Renders a responsive YouTube embed via youtube-nocookie.com.
 * Only mount this component when youtubeId is confirmed non-null.
 *
 * Server Component — no client interactivity needed for an iframe embed.
 */
export function YoutubeEmbedSlot({ youtubeId }: YoutubeEmbedSlotProps): React.JSX.Element {
  return (
    <section aria-labelledby="video-heading" className="mt-8">
      <h2 id="video-heading" className="mb-4 text-xl font-semibold text-gray-900">
        Video
      </h2>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </section>
  );
}
