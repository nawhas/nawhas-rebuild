'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface AvatarUploadProps {
  /** Current avatar URL — null renders initials placeholder. */
  imageUrl: string | null;
  /** User's display name — used to derive initials for the placeholder. */
  name: string;
  /** Called after a successful upload with the new image URL. */
  onUploaded: (newUrl: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Avatar display with a click-to-upload affordance.
 *
 * Uploads to POST /api/avatar/upload (multipart, field=file).
 * Shows an overlay on hover. Error message rendered inline.
 */
export function AvatarUpload({ imageUrl, name, onUploaded }: AvatarUploadProps): React.JSX.Element {
  const t = useTranslations('profile');
  const [currentUrl, setCurrentUrl] = useState<string | null>(imageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/avatar/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Upload failed');
      }

      const user = (await res.json()) as { image: string | null };
      if (user.image) {
        setCurrentUrl(user.image);
        onUploaded(user.image);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={t('avatarChangeLabel')}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-24 w-24 overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-60"
      >
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={`${name}'s avatar`}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gray-200 text-2xl font-semibold text-gray-600">
            {getInitials(name)}
          </span>
        )}

        {/* Hover overlay */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
        >
          {uploading ? (
            <span className="text-xs font-medium text-white">{t('avatarUploadingLabel')}</span>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          )}
        </span>
      </button>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />
    </div>
  );
}
