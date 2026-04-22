'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createTrackSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  albumId: z.uuid('Must be a valid album ID (UUID)'),
  slug: z.string().min(1).optional().or(z.literal('')),
  trackNumber: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), 'Must be a positive integer'),
  audioUrl: z.url('Must be a valid URL').optional().or(z.literal('')),
  youtubeId: z.string().optional().or(z.literal('')),
  duration: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), 'Must be a positive number of seconds'),
});

type FormValues = z.infer<typeof schema>;
type Errors = Partial<Record<keyof FormValues, string>>;

interface TrackFormProps {
  targetId?: string;
  initialValues?: {
    title: string;
    albumId: string;
    slug?: string;
    trackNumber?: number;
    audioUrl?: string;
    youtubeId?: string;
    duration?: number;
  };
  action: 'create' | 'edit';
  defaultAlbumId?: string;
  onSuccess?: () => void;
}

/**
 * Submission form for track create/edit.
 */
export function TrackForm({
  targetId,
  initialValues,
  action,
  defaultAlbumId,
  onSuccess,
}: TrackFormProps): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [albumId, setAlbumId] = useState(initialValues?.albumId ?? defaultAlbumId ?? '');
  const [slug, setSlug] = useState(initialValues?.slug ?? '');
  const [trackNumber, setTrackNumber] = useState(initialValues?.trackNumber?.toString() ?? '');
  const [audioUrl, setAudioUrl] = useState(initialValues?.audioUrl ?? '');
  const [youtubeId, setYoutubeId] = useState(initialValues?.youtubeId ?? '');
  const [duration, setDuration] = useState(initialValues?.duration?.toString() ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate(): boolean {
    const result = schema.safeParse({
      title,
      albumId,
      slug: slug || undefined,
      trackNumber: trackNumber || undefined,
      audioUrl: audioUrl || undefined,
      youtubeId: youtubeId || undefined,
      duration: duration || undefined,
    });
    if (!result.success) {
      const fieldErrors: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Errors;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);
    startTransition(async () => {
      try {
        await createTrackSubmission(
          action,
          {
            title,
            albumId,
            ...(slug ? { slug } : {}),
            ...(trackNumber ? { trackNumber: parseInt(trackNumber) } : {}),
            ...(audioUrl ? { audioUrl } : {}),
            ...(youtubeId ? { youtubeId } : {}),
            ...(duration ? { duration: parseInt(duration) } : {}),
          },
          targetId,
        );
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/profile/contributions');
        }
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField id="title" label="Title" required error={errors.title}>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          placeholder="e.g. Ya Hussain"
          error={errors.title}
        />
      </FormField>

      <FormField
        id="albumId"
        label="Album ID"
        required
        error={errors.albumId}
        hint="The UUID of the album this track belongs to."
      >
        <Input
          id="albumId"
          type="text"
          value={albumId}
          onChange={(e) => setAlbumId(e.target.value)}
          disabled={isPending}
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
          error={errors.albumId}
        />
      </FormField>

      <FormField id="slug" label="Slug" error={errors.slug} hint="Leave blank to auto-generate.">
        <Input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isPending}
          placeholder="e.g. ya-hussain"
          error={errors.slug}
        />
      </FormField>

      <FormField id="trackNumber" label="Track number" error={errors.trackNumber}>
        <Input
          id="trackNumber"
          type="number"
          value={trackNumber}
          onChange={(e) => setTrackNumber(e.target.value)}
          disabled={isPending}
          placeholder="e.g. 1"
          min={1}
          error={errors.trackNumber}
        />
      </FormField>

      <FormField id="audioUrl" label="Audio URL" error={errors.audioUrl}>
        <Input
          id="audioUrl"
          type="url"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          disabled={isPending}
          placeholder="https://..."
          error={errors.audioUrl}
        />
      </FormField>

      <FormField id="youtubeId" label="YouTube ID" error={errors.youtubeId} hint="The 11-character video ID from the YouTube URL.">
        <Input
          id="youtubeId"
          type="text"
          value={youtubeId}
          onChange={(e) => setYoutubeId(e.target.value)}
          disabled={isPending}
          placeholder="e.g. dQw4w9WgXcQ"
          maxLength={11}
          error={errors.youtubeId}
        />
      </FormField>

      <FormField id="duration" label="Duration (seconds)" error={errors.duration}>
        <Input
          id="duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={isPending}
          placeholder="e.g. 240"
          min={1}
          error={errors.duration}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit for review'}
      </Button>
    </form>
  );
}
