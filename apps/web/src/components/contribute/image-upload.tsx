'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface ImageUploadProps {
  /** Current image URL (for pre-fill on edit). Null = no image. */
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  /** Accessible label for the upload button when no image is set. */
  label: string;
}

/**
 * Click-to-upload image widget used across contribute forms.
 * Posts multipart to /api/uploads/image and stores the returned URL.
 */
export function ImageUpload({ value, onChange, disabled, label }: ImageUploadProps): React.JSX.Element {
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
      const res = await fetch('/api/uploads/image', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t('genericFailure'));
      }
      const body = (await res.json()) as { url: string };
      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericFailure'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)]">
        {value ? (
          <Image
            src={value}
            alt=""
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-faint)]">
            {t('noImage')}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {uploading ? t('uploading') : value ? t('replace') : label}
        </button>
        {value && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => onChange(null)}
            className="rounded-[8px] px-4 py-2 text-sm font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--input-bg)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
          >
            {t('remove')}
          </button>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-[var(--color-error-500)]">
            {error}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
