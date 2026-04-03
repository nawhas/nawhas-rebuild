interface YoutubeEmbedSlotProps {
  youtubeId: string;
  /** Accessible title for the iframe — describe the video content. */
  title?: string;
}

/**
 * Renders a responsive YouTube embed via youtube-nocookie.com.
 * Only mount this component when youtubeId is confirmed non-null.
 *
 * Server Component — no client interactivity needed for an iframe embed.
 */
export function YoutubeEmbedSlot({
  youtubeId,
  title = 'YouTube video player',
}: YoutubeEmbedSlotProps): React.JSX.Element {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
