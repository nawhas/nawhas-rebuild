'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { createReciterSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';
import { ImageUpload } from '@/components/contribute/image-upload';
import { SlugPreview } from '@/components/contribute/slug-preview';
import { COUNTRY_OPTIONS } from '@/components/contribute/country-options';
import { useDraftAutosave } from '@/components/contribute/use-draft-autosave';
import { useUnsavedChangesGuard } from '@/components/contribute/use-unsaved-changes-guard';

type FormValues = {
  name: string;
  arabicName: string;
  country: string;
  birthYear: string;
  description: string;
  avatarUrl: string | null;
};

type Errors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  name: '',
  arabicName: '',
  country: '',
  birthYear: '',
  description: '',
  avatarUrl: null,
};

interface ReciterFormProps {
  /** For edit mode. */
  targetId?: string;
  initialValues?: Partial<FormValues>;
  action: 'create' | 'edit';
  onSuccess?: () => void;
}

export function ReciterForm({
  targetId,
  initialValues,
  action,
  onSuccess,
}: ReciterFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const router = useRouter();

  const startValues: FormValues = { ...EMPTY, ...initialValues };
  const [values, setValues] = useState<FormValues>(startValues);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftKey = `contribute:reciter:${action}:${targetId ?? 'new'}`;
  const draft = useDraftAutosave<FormValues>(draftKey);
  const [draftRestored, setDraftRestored] = useState(false);

  // Persist on every change (hook debounces internally).
  if (values !== startValues) draft.save(values);

  const isDirty = JSON.stringify(values) !== JSON.stringify(startValues);
  useUnsavedChangesGuard(isDirty);

  const schema = z.object({
    name: z.string().min(1, t('form.nameRequired')),
    arabicName: z.string().max(200).optional().or(z.literal('')),
    country: z.string().length(2).optional().or(z.literal('')),
    birthYear: z
      .string()
      .optional()
      .refine(
        (v) =>
          !v ||
          (/^\d{4}$/.test(v) &&
            parseInt(v) >= 1800 &&
            parseInt(v) <= new Date().getFullYear()),
        t('form.birthYearInvalid'),
      ),
    description: z
      .string()
      .max(500, t('form.descriptionTooLong'))
      .optional()
      .or(z.literal('')),
    avatarUrl: z.string().url().nullable().optional(),
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
      name: values.name,
      ...(values.arabicName ? { arabicName: values.arabicName } : {}),
      ...(values.country ? { country: values.country } : {}),
      ...(values.birthYear ? { birthYear: parseInt(values.birthYear) } : {}),
      ...(values.description ? { description: values.description } : {}),
      ...(values.avatarUrl ? { avatarUrl: values.avatarUrl } : {}),
    };
    startTransition(async () => {
      try {
        await createReciterSubmission(action, data, targetId);
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

      <FormField id="name" label={t('reciter.nameLabel')} required error={errors.name}>
        <Input
          id="name"
          type="text"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          disabled={isPending}
          placeholder={t('reciter.namePlaceholder')}
          error={errors.name}
        />
        {action === 'create' && (
          <SlugPreview source={values.name} template="/reciters/{slug}" />
        )}
      </FormField>

      <FormField
        id="arabicName"
        label={t('reciter.arabicNameLabel')}
        error={errors.arabicName}
        hint={t('reciter.arabicNameHint')}
      >
        <Input
          id="arabicName"
          type="text"
          dir="rtl"
          value={values.arabicName}
          onChange={(e) => set('arabicName', e.target.value)}
          disabled={isPending}
          placeholder={t('reciter.arabicNamePlaceholder')}
          error={errors.arabicName}
        />
      </FormField>

      <FormField
        id="country"
        label={t('reciter.countryLabel')}
        error={errors.country}
        hint={t('reciter.countryHint')}
      >
        <select
          id="country"
          value={values.country}
          onChange={(e) => set('country', e.target.value)}
          disabled={isPending}
          className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
        >
          <option value="">{t('reciter.countryNone')}</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {t(`reciter.${c.labelKey}`)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        id="birthYear"
        label={t('reciter.birthYearLabel')}
        error={errors.birthYear}
      >
        <Input
          id="birthYear"
          type="number"
          value={values.birthYear}
          onChange={(e) => set('birthYear', e.target.value)}
          disabled={isPending}
          placeholder={t('reciter.birthYearPlaceholder')}
          min={1800}
          max={new Date().getFullYear()}
          error={errors.birthYear}
        />
      </FormField>

      <FormField
        id="description"
        label={t('reciter.descriptionLabel')}
        error={errors.description}
        hint={t('reciter.descriptionHint')}
      >
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          disabled={isPending}
          maxLength={500}
          rows={4}
          placeholder={t('reciter.descriptionPlaceholder')}
          className="w-full resize-y rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-60"
        />
        <p className="mt-1 text-[13px] text-[var(--text-faint)]">
          {t('form.charCount', { count: values.description.length, max: 500 })}
        </p>
      </FormField>

      <FormField id="avatarUrl" label={t('reciter.avatarLabel')} hint={t('reciter.avatarHint')}>
        <ImageUpload
          value={values.avatarUrl}
          onChange={(url) => set('avatarUrl', url)}
          disabled={isPending}
          label={t('reciter.avatarUpload')}
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
