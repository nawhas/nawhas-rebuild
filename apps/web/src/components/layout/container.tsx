import type { HTMLAttributes } from 'react';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width of the container.
   * - sm: max-w-screen-sm (640px)
   * - md: max-w-screen-md (768px)
   * - lg: max-w-screen-lg (1024px)
   * - xl: max-w-screen-xl (1280px) — default
   * - full: no max-width cap
   */
  size?: ContainerSize;
  children: React.ReactNode;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  full: 'max-w-full',
};

/**
 * Centers content horizontally with consistent horizontal padding.
 * Mobile-first: 16px padding on mobile, scaling up to 32px at md and above.
 *
 * Server Component — no interactivity required.
 */
export function Container({
  size = 'xl',
  className = '',
  children,
  ...props
}: ContainerProps): React.JSX.Element {
  return (
    <div
      className={`mx-auto w-full px-4 md:px-8 ${sizeClasses[size]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
