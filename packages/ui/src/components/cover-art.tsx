import { useTranslations } from 'next-intl';

export interface CoverArtProps {
  slug: string;
  artworkUrl?: string | null;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
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

function pickVariant(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h % GRADIENTS.length;
}

export function CoverArt({ slug, artworkUrl, label, size = 'md' }: CoverArtProps): React.JSX.Element {
  const t = useTranslations('coverArt');
  const dims = SIZES[size];
  const altText = label ? t('albumAlt', { label }) : t('placeholderLabel');

  if (artworkUrl) {
    return (
      <img
        src={artworkUrl}
        alt={altText}
        data-size={size}
        style={{
          width: dims.width,
          height: dims.height,
          borderRadius: '16px',
          objectFit: 'cover',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}
      />
    );
  }

  const variantIndex = pickVariant(slug);
  return (
    <div
      data-cover-variant={`cov-${variantIndex + 1}`}
      data-size={size}
      role="img"
      aria-label={altText}
      style={{
        width: dims.width,
        height: dims.height,
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
      {label && (
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
