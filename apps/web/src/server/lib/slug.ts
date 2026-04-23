/**
 * Canonical slugify used by contribute/moderation. Lowercase, dashes for
 * whitespace/underscores, strip everything else non-word, trim boundary dashes.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns `candidate` if no string in `existing` matches it exactly,
 * otherwise returns `candidate-N` with the lowest integer N >= 2 such that
 * `candidate-N` is not in `existing`.
 * Only slugs of the exact form `candidate` or `candidate-<digits>` count as taken.
 */
export function findFreeSlug(candidate: string, existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has(candidate)) return candidate;
  for (let i = 2; ; i++) {
    const attempt = `${candidate}-${i}`;
    if (!taken.has(attempt)) return attempt;
  }
}
