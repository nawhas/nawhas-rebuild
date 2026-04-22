'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { resubmitSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import type { SubmissionDTO, ReciterSubmissionData, AlbumSubmissionData, TrackSubmissionData } from '@nawhas/types';

type Errors = Record<string, string>;

interface ResubmitFormProps {
  submission: SubmissionDTO;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Inline edit-and-resubmit form for changes_requested submissions.
 * Renders the appropriate field set based on submission.type.
 */
export function ResubmitForm({ submission, onSuccess, onCancel }: ResubmitFormProps): React.JSX.Element {
  if (submission.type === 'reciter') {
    return <ReciterResubmitFields submission={submission} onSuccess={onSuccess} onCancel={onCancel} />;
  }
  if (submission.type === 'album') {
    return <AlbumResubmitFields submission={submission} onSuccess={onSuccess} onCancel={onCancel} />;
  }
  return <TrackResubmitFields submission={submission} onSuccess={onSuccess} onCancel={onCancel} />;
}

// ---------------------------------------------------------------------------
// Reciter
// ---------------------------------------------------------------------------

function ReciterResubmitFields({ submission, onSuccess, onCancel }: ResubmitFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const data = submission.data as ReciterSubmissionData;
  const [name, setName] = useState(data.name);
  const [slug, setSlug] = useState(data.slug ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const schema = z.object({
    name: z.string().min(1, t('form.nameRequired')),
    slug: z.string().min(1).optional().or(z.literal('')),
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const result = schema.safeParse({ name, slug: slug || undefined });
    if (!result.success) {
      const errs: Errors = {};
      for (const issue of result.error.issues) { errs[String(issue.path[0])] = issue.message; }
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError(null);
    startTransition(async () => {
      try {
        await resubmitSubmission(submission.id, 'reciter', { name, slug: slug || undefined });
        onSuccess();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : t('form.resubmitFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
      <p className="text-xs font-medium text-orange-700 dark:text-orange-300">{t('form.resubmitHeading')}</p>
      <FormField id="name" label={t('reciter.nameLabel')} required error={errors.name}>
        <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} error={errors.name} />
      </FormField>
      <FormField id={`rs-slug-${submission.id}`} label={t('form.slugLabel')} error={errors.slug}>
        <Input id={`rs-slug-${submission.id}`} type="text" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isPending} error={errors.slug} />
      </FormField>
      {serverError && <p role="alert" className="text-xs text-destructive">{serverError}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t('form.submitting') : t('form.submit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          {t('form.cancel')}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Album
// ---------------------------------------------------------------------------

function AlbumResubmitFields({ submission, onSuccess, onCancel }: ResubmitFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const data = submission.data as AlbumSubmissionData;
  const [title, setTitle] = useState(data.title);
  const [reciterId, setReciterId] = useState(data.reciterId);
  const [slug, setSlug] = useState(data.slug ?? '');
  const [year, setYear] = useState(data.year?.toString() ?? '');
  const [artworkUrl, setArtworkUrl] = useState(data.artworkUrl ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const schema = z.object({
    title: z.string().min(1, t('form.titleRequired')),
    reciterId: z.uuid(t('form.reciterUuidInvalid')),
    slug: z.string().min(1).optional().or(z.literal('')),
    year: z
      .string()
      .optional()
      .refine(
        (v) => !v || (/^\d{4}$/.test(v) && parseInt(v) >= 1900 && parseInt(v) <= new Date().getFullYear()),
        t('form.yearInvalid'),
      ),
    artworkUrl: z.url(t('form.urlInvalid')).optional().or(z.literal('')),
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const result = schema.safeParse({ title, reciterId, slug: slug || undefined, year: year || undefined, artworkUrl: artworkUrl || undefined });
    if (!result.success) {
      const errs: Errors = {};
      for (const issue of result.error.issues) { errs[String(issue.path[0])] = issue.message; }
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError(null);
    startTransition(async () => {
      try {
        await resubmitSubmission(submission.id, 'album', { title, reciterId, slug: slug || undefined, year: year ? parseInt(year) : undefined, artworkUrl: artworkUrl || undefined });
        onSuccess();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : t('form.resubmitFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
      <p className="text-xs font-medium text-orange-700 dark:text-orange-300">{t('form.resubmitHeading')}</p>
      <FormField id={`ra-title-${submission.id}`} label={t('album.titleLabel')} required error={errors.title}>
        <Input id={`ra-title-${submission.id}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} error={errors.title} />
      </FormField>
      <FormField id={`ra-rid-${submission.id}`} label={t('album.reciterIdLabel')} required error={errors.reciterId}>
        <Input id={`ra-rid-${submission.id}`} type="text" value={reciterId} onChange={(e) => setReciterId(e.target.value)} disabled={isPending} error={errors.reciterId} />
      </FormField>
      <FormField id={`ra-slug-${submission.id}`} label={t('form.slugLabel')} error={errors.slug}>
        <Input id={`ra-slug-${submission.id}`} type="text" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isPending} error={errors.slug} />
      </FormField>
      <FormField id={`ra-year-${submission.id}`} label={t('album.yearLabel')} error={errors.year}>
        <Input id={`ra-year-${submission.id}`} type="number" value={year} onChange={(e) => setYear(e.target.value)} disabled={isPending} min={1900} error={errors.year} />
      </FormField>
      <FormField id={`ra-art-${submission.id}`} label={t('album.artworkUrlLabel')} error={errors.artworkUrl}>
        <Input id={`ra-art-${submission.id}`} type="url" value={artworkUrl} onChange={(e) => setArtworkUrl(e.target.value)} disabled={isPending} error={errors.artworkUrl} />
      </FormField>
      {serverError && <p role="alert" className="text-xs text-destructive">{serverError}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t('form.submitting') : t('form.resubmit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          {t('form.cancel')}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

function TrackResubmitFields({ submission, onSuccess, onCancel }: ResubmitFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const data = submission.data as TrackSubmissionData;
  const [title, setTitle] = useState(data.title);
  const [albumId, setAlbumId] = useState(data.albumId);
  const [slug, setSlug] = useState(data.slug ?? '');
  const [trackNumber, setTrackNumber] = useState(data.trackNumber?.toString() ?? '');
  const [audioUrl, setAudioUrl] = useState(data.audioUrl ?? '');
  const [youtubeId, setYoutubeId] = useState(data.youtubeId ?? '');
  const [duration, setDuration] = useState(data.duration?.toString() ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const schema = z.object({
    title: z.string().min(1, t('form.titleRequired')),
    albumId: z.uuid(t('form.albumUuidInvalid')),
    slug: z.string().min(1).optional().or(z.literal('')),
    trackNumber: z.string().optional().refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), t('form.trackNumberInvalid')),
    audioUrl: z.url(t('form.urlInvalid')).optional().or(z.literal('')),
    youtubeId: z.string().optional().or(z.literal('')),
    duration: z.string().optional().refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), t('form.durationInvalid')),
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const result = schema.safeParse({ title, albumId, slug: slug || undefined, trackNumber: trackNumber || undefined, audioUrl: audioUrl || undefined, youtubeId: youtubeId || undefined, duration: duration || undefined });
    if (!result.success) {
      const errs: Errors = {};
      for (const issue of result.error.issues) { errs[String(issue.path[0])] = issue.message; }
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError(null);
    startTransition(async () => {
      try {
        await resubmitSubmission(submission.id, 'track', { title, albumId, slug: slug || undefined, trackNumber: trackNumber ? parseInt(trackNumber) : undefined, audioUrl: audioUrl || undefined, youtubeId: youtubeId || undefined, duration: duration ? parseInt(duration) : undefined });
        onSuccess();
      } catch (err) {
        setServerError(err instanceof Error ? err.message : t('form.resubmitFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
      <p className="text-xs font-medium text-orange-700 dark:text-orange-300">{t('form.resubmitHeading')}</p>
      <FormField id={`rt-title-${submission.id}`} label={t('track.titleLabel')} required error={errors.title}>
        <Input id={`rt-title-${submission.id}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} error={errors.title} />
      </FormField>
      <FormField id={`rt-aid-${submission.id}`} label={t('track.albumIdLabel')} required error={errors.albumId}>
        <Input id={`rt-aid-${submission.id}`} type="text" value={albumId} onChange={(e) => setAlbumId(e.target.value)} disabled={isPending} error={errors.albumId} />
      </FormField>
      <FormField id={`rt-slug-${submission.id}`} label={t('form.slugLabel')} error={errors.slug}>
        <Input id={`rt-slug-${submission.id}`} type="text" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isPending} error={errors.slug} />
      </FormField>
      <FormField id={`rt-tn-${submission.id}`} label={t('track.trackNumberLabel')} error={errors.trackNumber}>
        <Input id={`rt-tn-${submission.id}`} type="number" value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} disabled={isPending} min={1} error={errors.trackNumber} />
      </FormField>
      <FormField id={`rt-au-${submission.id}`} label={t('track.audioUrlLabel')} error={errors.audioUrl}>
        <Input id={`rt-au-${submission.id}`} type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} disabled={isPending} error={errors.audioUrl} />
      </FormField>
      <FormField id={`rt-yt-${submission.id}`} label={t('track.youtubeIdLabel')} error={errors.youtubeId}>
        <Input id={`rt-yt-${submission.id}`} type="text" value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} disabled={isPending} maxLength={11} error={errors.youtubeId} />
      </FormField>
      <FormField id={`rt-dur-${submission.id}`} label={t('track.durationShortLabel')} error={errors.duration}>
        <Input id={`rt-dur-${submission.id}`} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={isPending} min={1} error={errors.duration} />
      </FormField>
      {serverError && <p role="alert" className="text-xs text-destructive">{serverError}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t('form.submitting') : t('form.resubmit')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          {t('form.cancel')}
        </Button>
      </div>
    </form>
  );
}
