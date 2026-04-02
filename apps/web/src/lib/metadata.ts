import type { Metadata } from 'next';

interface PageMetadataOptions {
  title: string;
  description?: string;
  /** Absolute URL to the OG image */
  image?: string;
  noIndex?: boolean;
}

/**
 * Build a Next.js Metadata object for a page.
 * The root layout already sets metadataBase, so relative image URLs work too.
 */
export function buildMetadata({
  title,
  description,
  image,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const metadata: Metadata = {
    title,
    ...(description !== undefined && { description }),
    ...(noIndex && { robots: { index: false, follow: false } }),
  };

  metadata.openGraph = {
    title,
    ...(description !== undefined && { description }),
    ...(image !== undefined && { images: [{ url: image }] }),
  };

  metadata.twitter = {
    card: image !== undefined ? 'summary_large_image' : 'summary',
    title,
    ...(description !== undefined && { description }),
    ...(image !== undefined && { images: [image] }),
  };

  return metadata;
}
