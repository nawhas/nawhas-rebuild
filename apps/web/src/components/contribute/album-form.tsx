'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createAlbumSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import { ImageUpload } from '@/components/contribute/image-upload';
import { ParentPicker, type ParentOption } from '@/components/contribute/parent-picker';
import { SlugPreview } from '@/components/contribute/slug-preview';
import { useDraftAutosave } from '@/components/contribute/use-draft-autosave';
import { useUnsavedChangesGuard } from '@/components/contribute/use-unsaved-changes-guard';

type FormValues = {
  title: string;
  reciter: ParentOption | null;
  year: string;
  description: string;
  artworkUrl: string | null;
};

type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  title: '',
  reciter: null,
  year: '',
  description: '',
  artworkUrl: null,
};

interface AlbumFormProps {
  targetId?: string;
  initialValues?: Partial<FormValues>;
  action: 'create' | 'edit';
  /** Pre-fill reciter when navigating from a reciter page. */
  defaultReciter?: ParentOption;
  onSuccess?: () => void;
}

export function AlbumForm({
  targetId,
  initialValues,
  action,
  defaultReciter,
  onSuccess,
}: AlbumFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const router = useRouter();

  const startValues: FormValues = {
    ...EMPTY,
    ...(defaultReciter ? { reciter: defaultReciter } : {}),
    ...initialValues,
  };

  const [values, setValues] = useState<FormValues>(startValues);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftKey = `contribute:album:${action}:${targetId ?? 'new'}`;
  const draft = useDraftAutosave<FormValues>(draftKey);
  const [draftRestored, setDraftRestored] = useState(false);

  if (values !== startValues) draft.save(values);

  const isDirty = JSON.stringify(values) !== JSON.stringify(startValues);
  useUnsavedChangesGuard(isDirty);

  const schema = z.object({
    title: z.string().min(1, t('form.titleRequired')),
    reciter: z
      .object({ id: z.string().uuid(), label: z.string() })
      .nullable()
      .refine((v) => v !== null, t('album.reciterRequired')),
    year: z
      .string()
      .optional()
      .refine(
        (v) =>
          !v ||
          (/^\d{4}$/.test(v) &&
            parseInt(v) >= 1900 &&
            parseInt(v) <= new Date().getFullYear()),
        t('form.yearInvalid'),
      ),
    description: z
      .string()
      .max(1000, t('form.descriptionTooLong'))
      .optional()
      .or(z.literal('')),
    artworkUrl: z.string().url().nullable().optional(),
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
    const data = {
      title: values.title,
      reciterId: values.reciter!.id,
      ...(values.year ? { year: parseInt(values.year) } : {}),
      ...(values.description ? { description: values.description } : {}),
      ...(values.artworkUrl ? { artworkUrl: values.artworkUrl } : {}),
    };
    startTransition(async () => {
      try {
        await createAlbumSubmission(action, data, targetId);
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
        id="reciter"
        label={t('album.reciterLabel')}
        required
        error={errors.reciter}
        hint={t('album.reciterHint')}
      >
        <ParentPicker
          id="reciter"
          kind="reciter"
          value={values.reciter}
          onChange={(opt) => set('reciter', opt)}
          disabled={isPending}
          {...(errors.reciter ? { error: errors.reciter } : {})}
        />
      </FormField>

      <FormField id="title" label={t('album.titleLabel')} required error={errors.title}>
        <Input
          id="title"
          type="text"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          disabled={isPending}
          placeholder={t('album.titlePlaceholder')}
          error={errors.title}
        />
        {action === 'create' && values.reciter && (
          <SlugPreview source={values.title} template="/albums/{slug}" />
        )}
      </FormField>

      <FormField id="year" label={t('album.yearLabel')} error={errors.year}>
        <Input
          id="year"
          type="number"
          value={values.year}
          onChange={(e) => set('year', e.target.value)}
          disabled={isPending}
          placeholder={t('album.yearPlaceholder')}
          min={1900}
          max={new Date().getFullYear()}
          error={errors.year}
        />
      </FormField>

      <FormField
        id="description"
        label={t('album.descriptionLabel')}
        error={errors.description}
        hint={t('album.descriptionHint')}
      >
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          disabled={isPending}
          maxLength={1000}
          rows={4}
          placeholder={t('album.descriptionPlaceholder')}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t('form.charCount', { count: values.description.length, max: 1000 })}
        </p>
      </FormField>

      <FormField id="artworkUrl" label={t('album.artworkLabel')} hint={t('album.artworkHint')}>
        <ImageUpload
          value={values.artworkUrl}
          onChange={(url) => set('artworkUrl', url)}
          disabled={isPending}
          label={t('album.artworkUpload')}
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
