interface ArabicTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * RTL content block for Arabic text.
 *
 * Typography: the `lang="ar"` attribute resolves to a system serif via the
 * `[lang="ar"]` selector in `globals.css` (Fraunces lacks Arabic glyph
 * coverage, so we deliberately defer to the platform serif). Size and
 * line-height are tuned for tashkeel visibility.
 *
 * Server Component — no interactivity required.
 */
export function ArabicText({ children, className }: ArabicTextProps): React.JSX.Element {
  return (
    <div
      dir="rtl"
      lang="ar"
      className={['text-[1.125rem] leading-[1.8] text-[var(--text)] whitespace-pre-wrap', className ?? '']
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  );
}
