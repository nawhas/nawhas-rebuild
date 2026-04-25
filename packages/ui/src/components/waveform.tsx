'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { cn } from '../lib/utils.js';
import { formatDuration } from '../lib/format-duration.js';

export interface WaveformProps {
  slug: string;
  durationSec?: number | undefined;
  currentPercent?: number;
  onSeek?: (percent: number) => void;
}

const BAR_COUNT = 64;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildBars(slug: string): number[] {
  const bars: number[] = [];
  let seed = 0;
  for (let i = 0; i < BAR_COUNT; i++) {
    seed = (seed + slug.charCodeAt(i % slug.length)) % 1000;
    bars.push(Math.max(6, seededRandom(seed) * 100));
  }
  return bars;
}

export function Waveform({
  slug,
  durationSec,
  currentPercent = 0,
  onSeek,
}: WaveformProps): React.JSX.Element {
  const t = useTranslations('waveform');
  const bars = useMemo(() => buildBars(slug), [slug]);
  const activeBar = Math.min(BAR_COUNT - 1, Math.floor((currentPercent / 100) * BAR_COUNT));
  const isInteractive = typeof onSeek === 'function';

  return (
    <div className="pb-12">
      <div
        role="group"
        aria-label={isInteractive ? t('ariaLabel') : t('decorativeAriaLabel')}
        className={cn(
          'flex items-center gap-[2px] h-[72px] mb-4',
          isInteractive && 'cursor-pointer',
        )}
      >
        {bars.map((height, idx) => {
          const isActive = idx === activeBar;
          const percent = Math.round((idx / BAR_COUNT) * 100);
          const sharedProps = {
            'data-waveform-bar': true,
            'data-active': isActive ? 'true' : 'false',
            className: 'flex-1 rounded-[2px] border-0 transition-colors',
            style: {
              background: isActive ? 'var(--accent-soft)' : 'var(--border)',
              minHeight: '6px',
              height: `${height}%`,
              padding: 0,
            },
          } as const;
          if (isInteractive) {
            return (
              <button
                key={idx}
                type="button"
                {...sharedProps}
                aria-label={t('barLabel', { percent })}
                onClick={() => onSeek?.(percent)}
              />
            );
          }
          return <div key={idx} {...sharedProps} />;
        })}
      </div>
      <div className="flex justify-between text-xs text-[var(--text-faint)]">
        <span>0:00</span>
        <span>{formatDuration(durationSec)}</span>
      </div>
    </div>
  );
}
