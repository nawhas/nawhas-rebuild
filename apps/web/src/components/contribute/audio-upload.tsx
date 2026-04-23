'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';

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
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? t('uploading') : value ? t('replaceAudio') : label}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => onChange({ url: null, duration: null })}
          >
            {t('remove')}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-error-600 dark:text-error-400">
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
