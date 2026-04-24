'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export interface WaveformProps {
  slug: string;
  durationSec?: number;
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function Waveform({
  slug,
  durationSec = 0,
  currentPercent = 0,
  onSeek,
}: WaveformProps): React.JSX.Element {
  const t = useTranslations('waveform');
  const bars = useMemo(() => buildBars(slug), [slug]);
  const activeBar = Math.min(BAR_COUNT - 1, Math.floor((currentPercent / 100) * BAR_COUNT));

  return (
    <div className="pb-12">
      <div
        role="group"
        aria-label={t('ariaLabel')}
        className="flex items-center gap-[2px] h-[72px] mb-4 cursor-pointer"
      >
        {bars.map((height, idx) => {
          const isActive = idx === activeBar;
          const percent = Math.round((idx / BAR_COUNT) * 100);
          return (
            <button
              key={idx}
              type="button"
              data-waveform-bar
              data-active={isActive ? 'true' : 'false'}
              aria-label={t('barLabel', { percent })}
              onClick={() => onSeek?.(percent)}
              className="flex-1 rounded-[2px] border-0 transition-colors"
              style={{
                background: isActive ? 'var(--accent-soft)' : 'var(--border)',
                minHeight: '6px',
                height: `${height}%`,
                padding: 0,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-[var(--text-faint)]">
        <span>0:00</span>
        <span>{formatDuration(durationSec)}</span>
      </div>
    </div>
  );
}
