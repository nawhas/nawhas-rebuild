interface UrduTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * RTL content block for Urdu text.
 * Uses Noto Nastaliq Urdu (Nastaliq calligraphic style) with extra line-height
 * to prevent nuqta clipping and ensure diacritics are fully visible.
 *
 * Server Component — no interactivity required.
 */
export function UrduText({ children, className }: UrduTextProps): React.JSX.Element {
  return (
    <div
      dir="rtl"
      lang="ur"
      className={['font-urdu text-[1.125rem] leading-[2.0] text-neutral-800 whitespace-pre-wrap', className ?? '']
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  );
}
