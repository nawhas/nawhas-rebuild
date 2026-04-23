'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createTrackSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import { AudioUpload } from '@/components/contribute/audio-upload';
import { ParentPicker, type ParentOption } from '@/components/contribute/parent-picker';
import { SlugPreview } from '@/components/contribute/slug-preview';
import { LyricsTabs, type LyricsMap } from '@/components/contribute/lyrics-tabs';
import { useDraftAutosave } from '@/components/contribute/use-draft-autosave';
import { useUnsavedChangesGuard } from '@/components/contribute/use-unsaved-changes-guard';

type FormValues = {
  title: string;
  album: ParentOption | null;
  trackNumber: string;
  audioUrl: string | null;
  youtubeId: string;
  duration: string;
  lyrics: LyricsMap;
};

type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  title: '',
  album: null,
  trackNumber: '',
  audioUrl: null,
  youtubeId: '',
  duration: '',
  lyrics: {},
};

interface TrackFormProps {
  targetId?: string;
  initialValues?: Partial<FormValues>;
  action: 'create' | 'edit';
  defaultAlbum?: ParentOption;
  onSuccess?: () => void;
}

export function TrackForm({
  targetId,
  initialValues,
  action,
  defaultAlbum,
  onSuccess,
}: TrackFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const router = useRouter();

  const startValues: FormValues = {
    ...EMPTY,
    ...(defaultAlbum ? { album: defaultAlbum } : {}),
    ...initialValues,
  };

  const [values, setValues] = useState<FormValues>(startValues);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftKey = `contribute:track:${action}:${targetId ?? 'new'}`;
  const draft = useDraftAutosave<FormValues>(draftKey);
  const [draftRestored, setDraftRestored] = useState(false);

  if (values !== startValues) draft.save(values);

  const isDirty = JSON.stringify(values) !== JSON.stringify(startValues);
  useUnsavedChangesGuard(isDirty);

  const schema = z.object({
    title: z.string().min(1, t('form.titleRequired')),
    album: z
      .object({ id: z.string().uuid(), label: z.string() })
      .nullable()
      .refine((v) => v !== null, t('track.albumRequired')),
    trackNumber: z
      .string()
      .optional()
      .refine(
        (v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0),
        t('form.trackNumberInvalid'),
      ),
    audioUrl: z.string().url().nullable().optional(),
    youtubeId: z.string().max(11).optional().or(z.literal('')),
    duration: z
      .string()
      .optional()
      .refine(
        (v) => !v || (/^\d+$/.test(v) && parseInt(v) > 0),
        t('form.durationInvalidSeconds'),
      ),
    lyrics: z.record(z.string(), z.string()).optional(),
  });

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const parse = schema.safeParse(values);
    if (!parse.success) {
      const fieldErrors: Errors = {};
      for (const issue of parse.error.issues) {
        fieldErrors[issue.path[0] as keyof Errors] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setServerError(null);

    // Only include languages with non-empty content on CREATE.
    // On EDIT, keep empty strings — they signal "delete this language" on apply.
    const cleanLyrics: LyricsMap = {};
    for (const [k, v] of Object.entries(values.lyrics)) {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed.length > 0 || action === 'edit') {
          cleanLyrics[k as keyof LyricsMap] = v;
        }
      }
    }

    const data = {
      title: values.title,
      albumId: values.album!.id,
      ...(values.trackNumber ? { trackNumber: parseInt(values.trackNumber) } : {}),
      ...(values.audioUrl ? { audioUrl: values.audioUrl } : {}),
      ...(values.youtubeId ? { youtubeId: values.youtubeId } : {}),
      ...(values.duration ? { duration: parseInt(values.duration) } : {}),
      ...(Object.keys(cleanLyrics).length > 0 ? { lyrics: cleanLyrics } : {}),
    };
    startTransition(async () => {
      try {
        await createTrackSubmission(action, data, targetId);
        draft.clear();
        if (onSuccess) onSuccess();
        else router.push('/profile/contributions');
      } catch (err) {
        setServerError(err instanceof Error ? err.message : t('form.genericFailure'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {draft.draft && !draftRestored && (
        <div
          role="status"
          className="rounded-md border border-info-200 bg-info-50 px-4 py-3 dark:border-info-800 dark:bg-info-950"
        >
          <p className="text-sm text-info-900 dark:text-info-100">
            {t('draft.restorePrompt', {
              days: Math.floor((draft.ageMs ?? 0) / 86_400_000),
            })}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setValues(draft.draft!);
                setDraftRestored(true);
              }}
            >
              {t('draft.restore')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                draft.clear();
                setDraftRestored(true);
              }}
            >
              {t('draft.discard')}
            </Button>
          </div>
        </div>
      )}

      <FormField
        id="album"
        label={t('track.albumLabel')}
        required
        error={errors.album}
        hint={t('track.albumHint')}
      >
        <ParentPicker
          id="album"
          kind="album"
          value={values.album}
          onChange={(opt) => set('album', opt)}
          disabled={isPending}
          {...(errors.album ? { error: errors.album } : {})}
        />
      </FormField>

      <FormField id="title" label={t('track.titleLabel')} required error={errors.title}>
        <Input
          id="title"
          type="text"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          disabled={isPending}
          placeholder={t('track.titlePlaceholder')}
          error={errors.title}
        />
        {action === 'create' && values.album && (
          <SlugPreview source={values.title} template="/tracks/{slug}" />
        )}
      </FormField>

      <FormField
        id="trackNumber"
        label={t('track.trackNumberLabel')}
        error={errors.trackNumber}
      >
        <Input
          id="trackNumber"
          type="number"
          value={values.trackNumber}
          onChange={(e) => set('trackNumber', e.target.value)}
          disabled={isPending}
          placeholder={t('track.trackNumberPlaceholder')}
          min={1}
          error={errors.trackNumber}
        />
      </FormField>

      <FormField id="audioUrl" label={t('track.audioLabel')} hint={t('track.audioHint')}>
        <AudioUpload
          value={values.audioUrl}
          onChange={({ url, duration }) => {
            set('audioUrl', url);
            if (duration !== null && !values.duration) {
              set('duration', String(duration));
            }
          }}
          disabled={isPending}
          label={t('track.audioUpload')}
        />
      </FormField>

      <FormField
        id="youtubeId"
        label={t('track.youtubeIdLabel')}
        error={errors.youtubeId}
        hint={t('track.youtubeIdHint')}
      >
        <Input
          id="youtubeId"
          type="text"
          value={values.youtubeId}
          onChange={(e) => set('youtubeId', e.target.value)}
          disabled={isPending}
          placeholder={t('track.youtubeIdPlaceholder')}
          maxLength={11}
          error={errors.youtubeId}
        />
      </FormField>

      <FormField
        id="duration"
        label={t('track.durationLabel')}
        error={errors.duration}
        hint={t('track.durationHint')}
      >
        <Input
          id="duration"
          type="number"
          value={values.duration}
          onChange={(e) => set('duration', e.target.value)}
          disabled={isPending}
          placeholder={t('track.durationPlaceholder')}
          min={1}
          error={errors.duration}
        />
      </FormField>

      <FormField id="lyrics" label={t('track.lyricsLabel')} hint={t('track.lyricsHint')}>
        <LyricsTabs
          value={values.lyrics}
          onChange={(next) => set('lyrics', next)}
          disabled={isPending}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
}
