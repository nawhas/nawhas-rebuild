import { hashToIndex } from '../lib/hash';

export interface ReciterAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  /**
   * When true, fills the parent container instead of using the size token's
   * fixed dimensions. The parent wrapper is responsible for setting
   * width/height. In fluid mode, the initials font-size scales with the
   * container (40% of width) so it stays proportionate at any size.
   */
  fluid?: boolean;
}

const GRADIENTS = [
  'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
  'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
  'linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)',
  'linear-gradient(135deg, #9333ea 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  'linear-gradient(135deg, #ca8a04 0%, #713f12 100%)',
  'linear-gradient(135deg, #db2777 0%, #831843 100%)',
  'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
  'linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%)',
  'linear-gradient(135deg, #0891b2 0%, #164e63 100%)',
  'linear-gradient(135deg, #0d9488 0%, #134e4a 100%)',
  'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
  'linear-gradient(135deg, #e11d48 0%, #831843 100%)',
  'linear-gradient(135deg, #65a30d 0%, #3f6212 100%)',
  'linear-gradient(135deg, #d946ef 0%, #6b21a8 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #0284c7 0%, #0c2d6b 100%)',
  'linear-gradient(135deg, #ec4899 0%, #9f1239 100%)',
] as const;

const SIZES = {
  sm: { width: '32px', height: '32px', fontSize: '11px' },
  md: { width: '56px', height: '56px', fontSize: '16px' },
  lg: { width: '96px', height: '96px', fontSize: '28px' },
} as const;

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function ReciterAvatar({
  name,
  avatarUrl,
  size = 'md',
  fluid = false,
}: ReciterAvatarProps): React.JSX.Element {
  const dims = SIZES[size];

  const widthValue = fluid ? '100%' : dims.width;
  const heightValue = fluid ? '100%' : dims.height;
  // In fluid mode the parent drives sizing, so initials should scale
  // with the container rather than being pinned to the size token's px.
  // 40% of width is roughly proportional to the fixed-size ratios
  // (e.g. md: 16px on a 56px circle ≈ 28%; lg: 28px on 96px ≈ 29%).
  // 40% reads slightly bolder, which works better at small grid sizes.
  const fontSizeValue = fluid ? '40%' : dims.fontSize;

  if (avatarUrl) {
    return (
      // Intentional <img>: avatarUrl may be off-domain S3/MinIO; next/image would require per-host remotePatterns config.
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: widthValue,
          height: heightValue,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    );
  }

  const variantIndex = hashToIndex(name, GRADIENTS.length);
  return (
    <div
      data-avatar-variant={`av-${variantIndex + 1}`}
      role="img"
      aria-label={name}
      style={{
        width: widthValue,
        height: heightValue,
        borderRadius: '50%',
        background: GRADIENTS[variantIndex],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: fontSizeValue,
        fontWeight: 600,
      }}
    >
      {deriveInitials(name)}
    </div>
  );
}
