import { useTranslations } from 'next-intl';
import { hashToIndex } from '../lib/hash';

export interface CoverArtProps {
  slug: string;
  artworkUrl?: string | null;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  /**
   * When true, fills the parent container instead of using the size token's
   * fixed dimensions. Use when the cover art needs to be responsive (e.g.
   * inside a CSS Grid cell). The parent wrapper is responsible for setting
   * width/height/aspect ratio.
   *
   * In fluid mode the giant Fraunces label overlay is omitted — it was a
   * design accent for full-size album hero use and is illegible at small
   * grid-cell sizes.
   */
  fluid?: boolean;
}

const GRADIENTS = [
  'linear-gradient(135deg, #3a1a1a 0%, #1a0a0a 100%)',
  'linear-gradient(135deg, #2a1a3a 0%, #0a0a1a 100%)',
  'linear-gradient(135deg, #1a2a3a 0%, #0a0a1a 100%)',
  'linear-gradient(135deg, #3a2a1a 0%, #1a0a0a 100%)',
  'linear-gradient(135deg, #2a1a2a 0%, #0a0a1a 100%)',
  'linear-gradient(135deg, #1a3a2a 0%, #0a1a0a 100%)',
  'linear-gradient(135deg, #3a1a2a 0%, #1a0a1a 100%)',
  'linear-gradient(135deg, #2a3a1a 0%, #0a1a0a 100%)',
  'linear-gradient(135deg, #1a3a3a 0%, #0a1a1a 100%)',
  'linear-gradient(135deg, #3a3a1a 0%, #1a1a0a 100%)',
] as const;

const SIZES = {
  sm: { width: '120px', height: '120px', fontSize: '36px' },
  md: { width: '240px', height: '240px', fontSize: '80px' },
  lg: { width: '360px', height: '360px', fontSize: '160px' },
} as const;

export function CoverArt({
  slug,
  artworkUrl,
  label,
  size = 'md',
  fluid = false,
}: CoverArtProps): React.JSX.Element {
  const t = useTranslations('coverArt');
  const dims = SIZES[size];
  const altText = label ? t('albumAlt', { label }) : t('placeholderLabel');

  const widthValue = fluid ? '100%' : dims.width;
  const heightValue = fluid ? '100%' : dims.height;

  if (artworkUrl) {
    return (
      // Intentional <img>: artworkUrl may be off-domain S3/MinIO; next/image would require per-host remotePatterns config.
      <img
        src={artworkUrl}
        alt={altText}
        data-size={size}
        loading="lazy"
        decoding="async"
        style={{
          width: widthValue,
          height: heightValue,
          borderRadius: '16px',
          objectFit: 'cover',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}
      />
    );
  }

  const variantIndex = hashToIndex(slug, GRADIENTS.length);
  return (
    <div
      data-cover-variant={`cov-${variantIndex + 1}`}
      data-size={size}
      role="img"
      aria-label={altText}
      style={{
        width: widthValue,
        height: heightValue,
        borderRadius: '16px',
        background: GRADIENTS[variantIndex],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 60%)',
        }}
      />
      {label && !fluid && (
        <div
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-fraunces), serif',
            fontSize: dims.fontSize,
            color: 'rgba(255,255,255,0.15)',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '20px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
