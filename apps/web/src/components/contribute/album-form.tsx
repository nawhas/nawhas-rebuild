'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {draft.draft && !draftRestored && (
        <div
          role="status"
          className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
        >
          <p className="text-sm text-[var(--text)]">
            {t('draft.restorePrompt', {
              days: Math.floor((draft.ageMs ?? 0) / 86_400_000),
            })}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setValues(draft.draft!);
                setDraftRestored(true);
              }}
              className="rounded-[8px] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              {t('draft.restore')}
            </button>
            <button
              type="button"
              onClick={() => {
                draft.clear();
                setDraftRestored(true);
              }}
              className="rounded-[8px] px-4 py-2 text-sm font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--input-bg)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              {t('draft.discard')}
            </button>
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
          className="w-full resize-y rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
        />
        <p className="mt-1 text-[13px] text-[var(--text-faint)]">
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
        <p role="alert" className="text-[13px] text-[var(--color-error-500)]">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-[8px] bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {isPending ? t('form.submitting') : t('form.submit')}
        </button>
      </div>
    </form>
  );
}
