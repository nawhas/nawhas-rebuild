'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

function SunIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  );
}

function MoonIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  );
}

const NEXT_THEME: Record<string, string> = {
  light: 'dark',
  dark: 'light',
};

/**
 * Keyboard-accessible theme toggle button — cycles light ↔ dark.
 *
 * Uses `theme` (not `resolvedTheme`) so the cycle is testable and the
 * aria-label always reflects the stored preference. System mode is
 * intentionally not offered (POC design system defaults dark).
 *
 * Client Component — requires useTheme() from next-themes.
 * Uses a `mounted` guard to avoid hydration mismatch (server has no theme state).
 */
export function ThemeToggle(): React.JSX.Element {
  const t = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render placeholder with identical dimensions to avoid layout shift
    return (
      <button
        type="button"
        disabled
        aria-label={t('toggleThemeLabel')}
        className="rounded-[6px] p-2 text-[var(--text-dim)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      >
        <span className="block h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  const currentTheme = theme ?? 'dark';

  const ARIA_LABEL_MAP: Record<string, string> = {
    light: t('switchToDark'),
    dark: t('switchToLight'),
  };

  const ariaLabel = ARIA_LABEL_MAP[currentTheme] ?? t('switchToDark');

  function handleClick(): void {
    setTheme(NEXT_THEME[currentTheme] ?? 'dark');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className="rounded-[6px] p-2 text-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
    >
      {currentTheme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
