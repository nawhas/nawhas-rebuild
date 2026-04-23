import * as React from 'react';
import { cn } from '../lib/utils.js';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level. Defaults to h2 (semantically correct for a page section under the page h1). */
  as?: HeadingTag;
}

/**
 * Section heading used across Home / Reciter / Album pages for labels
 * like "Top Nawhas", "Recently Saved Nawhas", etc.
 *
 * The size/weight here have drifted from Phase 2.1's `.section__title`
 * reference (1.4rem / weight 400, matching legacy Vuetify h5). In the
 * rebuild that renders as a thin label that loses the content-grouping
 * affordance — the 2026-04-23 staging audit flagged it as competing
 * poorly with the serif hero. Bumped to text-2xl + semibold so it reads
 * unambiguously as a section heading while still sitting a step below
 * the page h1.
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
        'mb-4 text-2xl font-semibold tracking-tight text-foreground',
        className
      )}
    >
      {children}
    </Tag>
  );
}
