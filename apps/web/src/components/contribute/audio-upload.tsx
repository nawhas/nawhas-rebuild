'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface AudioUploadProps {
  value: string | null;
  /** Called with the uploaded URL and the probed duration (seconds, may be null). */
  onChange: (result: { url: string | null; duration: number | null }) => void;
  disabled?: boolean;
  label: string;
}

/**
 * Audio upload with preview and auto-probed duration readback.
 * Posts multipart to /api/uploads/audio.
 */
export function AudioUpload({ value, onChange, disabled, label }: AudioUploadProps): React.JSX.Element {
  const t = useTranslations('contribute.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/audio', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t('genericFailure'));
      }
      const body = (await res.json()) as { url: string; duration: number | null };
      onChange({ url: body.url, duration: body.duration });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericFailure'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value && (
        <audio controls src={value} className="w-full">
          <track kind="captions" />
        </audio>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {uploading ? t('uploading') : value ? t('replaceAudio') : label}
        </button>
        {value && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => onChange({ url: null, duration: null })}
            className="rounded-[8px] px-4 py-2 text-sm font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--input-bg)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
          >
            {t('remove')}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-error-500)]">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}
