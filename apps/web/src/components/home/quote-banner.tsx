/**
 * Home-page editorial pull-quote banner — POC restoration (Phase 2.6).
 *
 * Visual: tinted accent-glow background, centered italic semibold quote, dim
 * attribution underneath. Matches POC layout (64px vertical padding,
 * 16px border-radius, max 600px content width).
 *
 * The quote text is hardcoded for now; rotating / i18n-backed copy is
 * tracked as a Phase 2.6 follow-up in the rebuild roadmap.
 *
 * Server Component — pure presentation, no interactivity.
 */
export function QuoteBanner(): React.JSX.Element {
  return (
    <section
      aria-label="Editorial quote"
      className="rounded-2xl bg-[var(--accent-glow)] px-10 text-center"
      style={{ paddingTop: '64px', paddingBottom: '64px' }}
    >
      <blockquote
        className="mx-auto max-w-[600px] italic text-[var(--text)]"
        style={{ fontSize: '24px', fontWeight: 600, lineHeight: 1.6 }}
      >
        &ldquo;The beauty of nawha lies not just in the recitation, but in the
        spiritual connection it creates with our heritage.&rdquo;
      </blockquote>
      <p className="mt-4 text-sm text-[var(--text-dim)]">
        &mdash; Recitation Community
      </p>
    </section>
  );
}
