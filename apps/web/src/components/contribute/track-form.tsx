'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createTrackSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';

type FormValues = {
  title: string;
  albumId: string;
  slug?: string | undefined;
  trackNumber?: string | undefined;
  audioUrl?: string | undefined;
  youtubeId?: string | undefined;
  duration?: string | undefined;
};
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
  const t = useTranslations('contribute');
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

  const schema = z.object({
    title: z.string().min(1, t('form.titleRequired')),
    albumId: z.uuid(t('form.albumUuidInvalid')),
    slug: z.string().min(1).optional().or(z.literal('')),
    trackNumber: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), t('form.trackNumberInvalid')),
    audioUrl: z.url(t('form.urlInvalid')).optional().or(z.literal('')),
    youtubeId: z.string().optional().or(z.literal('')),
    duration: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), t('form.durationInvalidSeconds')),
  });

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
        setServerError(err instanceof Error ? err.message : t('form.genericFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField id="title" label={t('track.titleLabel')} required error={errors.title}>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          placeholder={t('track.titlePlaceholder')}
          error={errors.title}
        />
      </FormField>

      <FormField
        id="albumId"
        label={t('track.albumIdLabel')}
        required
        error={errors.albumId}
        hint={t('track.albumIdHint')}
      >
        <Input
          id="albumId"
          type="text"
          value={albumId}
          onChange={(e) => setAlbumId(e.target.value)}
          disabled={isPending}
          placeholder={t('track.albumIdPlaceholder')}
          error={errors.albumId}
        />
      </FormField>

      <FormField id="slug" label={t('form.slugLabel')} error={errors.slug} hint={t('form.slugHintBlankAutogen')}>
        <Input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isPending}
          placeholder={t('track.slugPlaceholder')}
          error={errors.slug}
        />
      </FormField>

      <FormField id="trackNumber" label={t('track.trackNumberLabel')} error={errors.trackNumber}>
        <Input
          id="trackNumber"
          type="number"
          value={trackNumber}
          onChange={(e) => setTrackNumber(e.target.value)}
          disabled={isPending}
          placeholder={t('track.trackNumberPlaceholder')}
          min={1}
          error={errors.trackNumber}
        />
      </FormField>

      <FormField id="audioUrl" label={t('track.audioUrlLabel')} error={errors.audioUrl}>
        <Input
          id="audioUrl"
          type="url"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          disabled={isPending}
          placeholder={t('track.audioUrlPlaceholder')}
          error={errors.audioUrl}
        />
      </FormField>

      <FormField id="youtubeId" label={t('track.youtubeIdLabel')} error={errors.youtubeId} hint={t('track.youtubeIdHint')}>
        <Input
          id="youtubeId"
          type="text"
          value={youtubeId}
          onChange={(e) => setYoutubeId(e.target.value)}
          disabled={isPending}
          placeholder={t('track.youtubeIdPlaceholder')}
          maxLength={11}
          error={errors.youtubeId}
        />
      </FormField>

      <FormField id="duration" label={t('track.durationLabel')} error={errors.duration}>
        <Input
          id="duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={isPending}
          placeholder={t('track.durationPlaceholder')}
          min={1}
          error={errors.duration}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">{serverError}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
}
