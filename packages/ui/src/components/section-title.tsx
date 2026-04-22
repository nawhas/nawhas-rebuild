import * as React from 'react';
import { cn } from '../lib/utils.js';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level. Defaults to h2 (semantically correct for a page section under the page h1). */
  as?: HeadingTag;
}

/**
 * Section heading used across Home / Reciter / Album pages for labels
 * like "Top Nawhas", "Recently Saved Nawhas", etc. Matches legacy's
 * `.section__title` (1.4rem + Vuetify h5 map + 12px margin-bottom)
 * documented in Phase 2.1 tokens audit.
 */
export function SectionTitle({
  as: Tag = 'h2',
  className,
  children,
  ...rest
}: SectionTitleProps): React.JSX.Element {
  return (
    <Tag
      {...rest}
      className={cn(
        'text-[1.4rem] font-normal leading-8 tracking-normal mb-3 text-foreground',
        className
      )}
    >
      {children}
    </Tag>
  );
}
