'use client';

import NextImage from 'next/image';
import type { ImageProps } from 'next/image';

type AppImageProps = Omit<ImageProps, 'alt'> & {
  /** Alt text is required. Pass an empty string only for purely decorative images. */
  alt: string;
};

/**
 * Typed wrapper around next/image with mobile-first default sizes.
 * Use this component instead of next/image directly so that sizes,
 * lazy loading, and remote pattern checks stay consistent app-wide.
 */
export function AppImage({ sizes, ...props }: AppImageProps): React.JSX.Element {
  return (
    <NextImage
      sizes={sizes ?? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
      {...props}
    />
  );
}
