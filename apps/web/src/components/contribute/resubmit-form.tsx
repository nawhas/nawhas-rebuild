'use client';

import { useState, useTransition } from 'react';
import { z } from 'zod';
import { resubmitSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import type { SubmissionDTO, ReciterSubmissionData, AlbumSubmissionData, TrackSubmissionData } from '@nawhas/types';

// ---------------------------------------------------------------------------
// Per-type schemas (mirrors submission router input schemas)
// ---------------------------------------------------------------------------

const reciterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).optional().or(z.literal('')),
});

const albumSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  reciterId: z.string().uuid('Must be a valid reciter ID (UUID)'),
  slug: z.string().min(1).optional().or(z.literal('')),
  year: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d{4}$/.test(v) && parseInt(v) >= 1900 && parseInt(v) <= new Date().getFullYear()), 'Must be a 4-digit year'),
  artworkUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

const trackSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  albumId: z.string().uuid('Must be a valid album ID (UUID)'),
  slug: z.string().min(1).optional().or(z.literal('')),
  trackNumber: z.string().optional().refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), 'Must be a positive integer'),
  audioUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  youtubeId: z.string().optional().or(z.literal('')),
  duration: z.string().optional().refine((v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0), 'Must be a positive number'),
});

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
  const data = submission.data as ReciterSubmissionData;
  const [name, setName] = useState(data.name);
  const [slug, setSlug] = useState(data.slug ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const result = reciterSchema.safeParse({ name, slug: slug || undefined });
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
        setServerError(err instanceof Error ? err.message : 'Resubmit failed.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
      <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Edit and resubmit</p>
      <FormField id="name" label="Name" required error={errors.name}>
        <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} error={errors.name} />
      </FormField>
      <FormField id={`rs-slug-${submission.id}`} label="Slug" error={errors.slug}>
        <Input id={`rs-slug-${submission.id}`} type="text" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isPending} error={errors.slug} />
      </FormField>
      {serverError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{serverError}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-1">
          {isPending ? 'Submitting…' : 'Submit for review'}
        </button>
        <button type="button" onClick={onCancel} disabled={isPending} className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:underline disabled:opacity-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Album
// ---------------------------------------------------------------------------

function AlbumResubmitFields({ submission, onSuccess, onCancel }: ResubmitFormProps): React.JSX.Element {
  const data = submission.data as AlbumSubmissionData;
  const [title, setTitle] = useState(data.title);
  const [reciterId, setReciterId] = useState(data.reciterId);
  const [slug, setSlug] = useState(data.slug ?? '');
  const [year, setYear] = useState(data.year?.toString() ?? '');
  const [artworkUrl, setArtworkUrl] = useState(data.artworkUrl ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const result = albumSchema.safeParse({ title, reciterId, slug: slug || undefined, year: year || undefined, artworkUrl: artworkUrl || undefined });
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
        setServerError(err instanceof Error ? err.message : 'Resubmit failed.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
      <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Edit and resubmit</p>
      <FormField id={`ra-title-${submission.id}`} label="Title" required error={errors.title}>
        <Input id={`ra-title-${submission.id}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} error={errors.title} />
      </FormField>
      <FormField id={`ra-rid-${submission.id}`} label="Reciter ID" required error={errors.reciterId}>
        <Input id={`ra-rid-${submission.id}`} type="text" value={reciterId} onChange={(e) => setReciterId(e.target.value)} disabled={isPending} error={errors.reciterId} />
      </FormField>
      <FormField id={`ra-slug-${submission.id}`} label="Slug" error={errors.slug}>
        <Input id={`ra-slug-${submission.id}`} type="text" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isPending} error={errors.slug} />
      </FormField>
      <FormField id={`ra-year-${submission.id}`} label="Year" error={errors.year}>
        <Input id={`ra-year-${submission.id}`} type="number" value={year} onChange={(e) => setYear(e.target.value)} disabled={isPending} min={1900} error={errors.year} />
      </FormField>
      <FormField id={`ra-art-${submission.id}`} label="Artwork URL" error={errors.artworkUrl}>
        <Input id={`ra-art-${submission.id}`} type="url" value={artworkUrl} onChange={(e) => setArtworkUrl(e.target.value)} disabled={isPending} error={errors.artworkUrl} />
      </FormField>
      {serverError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{serverError}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-1">
          {isPending ? 'Submitting…' : 'Resubmit'}
        </button>
        <button type="button" onClick={onCancel} disabled={isPending} className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:underline disabled:opacity-50">Cancel</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Track
// ---------------------------------------------------------------------------

function TrackResubmitFields({ submission, onSuccess, onCancel }: ResubmitFormProps): React.JSX.Element {
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

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const result = trackSchema.safeParse({ title, albumId, slug: slug || undefined, trackNumber: trackNumber || undefined, audioUrl: audioUrl || undefined, youtubeId: youtubeId || undefined, duration: duration || undefined });
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
        setServerError(err instanceof Error ? err.message : 'Resubmit failed.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
      <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Edit and resubmit</p>
      <FormField id={`rt-title-${submission.id}`} label="Title" required error={errors.title}>
        <Input id={`rt-title-${submission.id}`} type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} error={errors.title} />
      </FormField>
      <FormField id={`rt-aid-${submission.id}`} label="Album ID" required error={errors.albumId}>
        <Input id={`rt-aid-${submission.id}`} type="text" value={albumId} onChange={(e) => setAlbumId(e.target.value)} disabled={isPending} error={errors.albumId} />
      </FormField>
      <FormField id={`rt-slug-${submission.id}`} label="Slug" error={errors.slug}>
        <Input id={`rt-slug-${submission.id}`} type="text" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isPending} error={errors.slug} />
      </FormField>
      <FormField id={`rt-tn-${submission.id}`} label="Track number" error={errors.trackNumber}>
        <Input id={`rt-tn-${submission.id}`} type="number" value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} disabled={isPending} min={1} error={errors.trackNumber} />
      </FormField>
      <FormField id={`rt-au-${submission.id}`} label="Audio URL" error={errors.audioUrl}>
        <Input id={`rt-au-${submission.id}`} type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} disabled={isPending} error={errors.audioUrl} />
      </FormField>
      <FormField id={`rt-yt-${submission.id}`} label="YouTube ID" error={errors.youtubeId}>
        <Input id={`rt-yt-${submission.id}`} type="text" value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} disabled={isPending} maxLength={11} error={errors.youtubeId} />
      </FormField>
      <FormField id={`rt-dur-${submission.id}`} label="Duration (s)" error={errors.duration}>
        <Input id={`rt-dur-${submission.id}`} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={isPending} min={1} error={errors.duration} />
      </FormField>
      {serverError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{serverError}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-1">
          {isPending ? 'Submitting…' : 'Resubmit'}
        </button>
        <button type="button" onClick={onCancel} disabled={isPending} className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:underline disabled:opacity-50">Cancel</button>
      </div>
    </form>
  );
}
