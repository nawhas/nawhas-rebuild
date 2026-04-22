interface ArabicTextProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * RTL content block for Arabic text.
 * Uses Noto Naskh Arabic font with appropriate size and line-height for tashkeel visibility.
 *
 * Server Component — no interactivity required.
 */
export function ArabicText({ children, className }: ArabicTextProps): React.JSX.Element {
  return (
    <div
      dir="rtl"
      lang="ar"
      className={['font-arabic text-[1.125rem] leading-[1.8] text-foreground whitespace-pre-wrap', className ?? '']
        .join(' ')
        .trim()}
    >
      {children}
    </div>
  );
}
