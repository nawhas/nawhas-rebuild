import { PlayerBarSpacer } from '@/components/player/PlayerBarSpacer';

interface PageLayoutProps {
  /** Site header (navigation bar). */
  header: React.ReactNode;
  /** Page-specific main content. */
  children: React.ReactNode;
  /**
   * Site footer content. Rendered inside `<footer role="contentinfo">`,
   * so the passed node should NOT itself be a <footer> element (avoids
   * nested landmarks).
   */
  footer: React.ReactNode;
}

/**
 * Standard page wrapper that provides a three-slot layout:
 * header → main → footer.
 *
 * Uses a CSS flex-column layout so the footer always sticks to the
 * bottom of the viewport on short pages (min-h-screen + flex-grow on main).
 *
 * Server Component — no interactivity required.
 */
export function PageLayout({
  header,
  children,
  footer,
}: PageLayoutProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <header role="banner">{header}</header>
      <main id="main-content" role="main" className="flex-1">
        {children}
        <PlayerBarSpacer />
      </main>
      <footer role="contentinfo">{footer}</footer>
    </div>
  );
}
