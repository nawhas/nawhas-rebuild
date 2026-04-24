/**
 * Stable string-to-index hash. Used to deterministically pick a variant
 * (e.g. one of N gradient backgrounds) from a string seed like a slug or name.
 *
 * Same input always returns the same output across page loads and process
 * runs. NOT cryptographically secure — purely for visual variant selection.
 */
export function hashToIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % modulo;
}
