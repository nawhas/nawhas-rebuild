import type { CSSProperties } from 'react';

/**
 * Deterministic theme-aware placeholder palette.
 *
 * Used wherever a card/avatar slot would otherwise render a flat gray
 * `bg-muted` box (no artwork, no photo). We hash the item's slug into
 * one of ten pastel/tinted palette entries so a grid of placeholders
 * looks varied instead of uniformly gray, and each placeholder carries
 * both a light-mode and dark-mode variant so it stays readable when the
 * page theme flips.
 *
 * Why this lives outside Tailwind's `@theme`: we intentionally keep the
 * semantic-token palette (primary/accent/info/…) narrow — adding ten
 * decorative ramps there would pollute it. Instead we emit four CSS
 * custom properties inline (`--ph-bg-light` / `--ph-bg-dark` /
 * `--ph-fg-light` / `--ph-fg-dark`) and read them via Tailwind's
 * `bg-[var(--ph-bg-light)] dark:bg-[var(--ph-bg-dark)]` arbitrary-value
 * syntax at the call site (`PLACEHOLDER_CLASSES` below). Tailwind sees
 * the fixed class string at build time and emits the utilities; the
 * actual colour values are resolved from the inline `style` prop at
 * render time.
 */

interface PaletteEntry {
  bgLight: string;
  bgDark: string;
  fgLight: string;
  fgDark: string;
}

// Paired light (100)/dark (950) ramp anchors so both bg and fg have
// enough contrast against the pairing — fgLight stays legible on
// bgLight, fgDark stays legible on bgDark.
const PALETTE: PaletteEntry[] = [
  { bgLight: '#fee2e2', bgDark: '#450a0a', fgLight: '#7f1d1d', fgDark: '#fecaca' }, // red
  { bgLight: '#ffedd5', bgDark: '#431407', fgLight: '#7c2d12', fgDark: '#fed7aa' }, // orange
  { bgLight: '#fef3c7', bgDark: '#451a03', fgLight: '#78350f', fgDark: '#fde68a' }, // amber
  { bgLight: '#d1fae5', bgDark: '#052e16', fgLight: '#064e3b', fgDark: '#a7f3d0' }, // emerald
  { bgLight: '#ccfbf1', bgDark: '#042f2e', fgLight: '#134e4a', fgDark: '#99f6e4' }, // teal
  { bgLight: '#cffafe', bgDark: '#083344', fgLight: '#155e75', fgDark: '#a5f3fc' }, // cyan
  { bgLight: '#dbeafe', bgDark: '#172554', fgLight: '#1e3a8a', fgDark: '#bfdbfe' }, // blue
  { bgLight: '#e0e7ff', bgDark: '#1e1b4b', fgLight: '#312e81', fgDark: '#c7d2fe' }, // indigo
  { bgLight: '#f3e8ff', bgDark: '#3b0764', fgLight: '#4c1d95', fgDark: '#ddd6fe' }, // violet
  { bgLight: '#fce7f3', bgDark: '#500724', fgLight: '#831843', fgDark: '#fbcfe8' }, // pink
];

/** Djb2-ish string hash. Small, stable, good enough for spreading across a 10-entry palette. */
function hashSeed(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
  }
  return h >>> 0;
}

function entryFor(seed: string): PaletteEntry {
  const entry = PALETTE[hashSeed(seed) % PALETTE.length];
  // PALETTE is a non-empty module constant — the modulo is always in range.
  return entry!;
}

/**
 * Inline style to apply to the placeholder element. Sets the four CSS
 * custom properties that `PLACEHOLDER_CLASSES` reads. Pair with
 * `PLACEHOLDER_CLASSES` on the same element.
 */
export function getPlaceholderStyle(seed: string): CSSProperties {
  const { bgLight, bgDark, fgLight, fgDark } = entryFor(seed);
  return {
    '--ph-bg-light': bgLight,
    '--ph-bg-dark': bgDark,
    '--ph-fg-light': fgLight,
    '--ph-fg-dark': fgDark,
  } as CSSProperties;
}

/**
 * Tailwind class string that reads the CSS vars set by
 * `getPlaceholderStyle` and flips bg + fg based on the `.dark` theme
 * class. Apply alongside any layout classes you need on the slot.
 */
export const PLACEHOLDER_CLASSES =
  'bg-[var(--ph-bg-light)] text-[var(--ph-fg-light)] dark:bg-[var(--ph-bg-dark)] dark:text-[var(--ph-fg-dark)]';
