'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createAlbumSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';

type FormValues = {
  title: string;
  reciterId: string;
  slug?: string | undefined;
  year?: string | undefined;
  artworkUrl?: string | undefined;
};
type Errors = Partial<Record<keyof FormValues, string>>;

interface AlbumFormProps {
  targetId?: string;
  initialValues?: {
    title: string;
    reciterId: string;
    slug?: string;
    year?: number;
    artworkUrl?: string;
  };
  action: 'create' | 'edit';
  /** Pre-fill reciter ID when coming from a reciter's page. */
  defaultReciterId?: string;
  onSuccess?: () => void;
}

/**
 * Submission form for album create/edit.
 */
export function AlbumForm({
  targetId,
  initialValues,
  action,
  defaultReciterId,
  onSuccess,
}: AlbumFormProps): React.JSX.Element {
  const t = useTranslations('contribute');
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [reciterId, setReciterId] = useState(
    initialValues?.reciterId ?? defaultReciterId ?? '',
  );
  const [slug, setSlug] = useState(initialValues?.slug ?? '');
  const [year, setYear] = useState(initialValues?.year?.toString() ?? '');
  const [artworkUrl, setArtworkUrl] = useState(initialValues?.artworkUrl ?? '');
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

  function validate(): boolean {
    const result = schema.safeParse({
      title,
      reciterId,
      slug: slug || undefined,
      year: year || undefined,
      artworkUrl: artworkUrl || undefined,
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
        await createAlbumSubmission(
          action,
          {
            title,
            reciterId,
            ...(slug ? { slug } : {}),
            ...(year ? { year: parseInt(year) } : {}),
            ...(artworkUrl ? { artworkUrl } : {}),
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
      <FormField id="title" label={t('album.titleLabel')} required error={errors.title}>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          placeholder={t('album.titlePlaceholder')}
          error={errors.title}
        />
      </FormField>

      <FormField
        id="reciterId"
        label={t('album.reciterIdLabel')}
        required
        error={errors.reciterId}
        hint={t('album.reciterIdHint')}
      >
        <Input
          id="reciterId"
          type="text"
          value={reciterId}
          onChange={(e) => setReciterId(e.target.value)}
          disabled={isPending}
          placeholder={t('album.reciterIdPlaceholder')}
          error={errors.reciterId}
        />
      </FormField>

      <FormField id="slug" label={t('form.slugLabel')} error={errors.slug} hint={t('form.slugHintBlankAutogen')}>
        <Input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isPending}
          placeholder={t('album.slugPlaceholder')}
          error={errors.slug}
        />
      </FormField>

      <FormField id="year" label={t('album.yearLabel')} error={errors.year}>
        <Input
          id="year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={isPending}
          placeholder={t('album.yearPlaceholder')}
          min={1900}
          max={new Date().getFullYear()}
          error={errors.year}
        />
      </FormField>

      <FormField id="artworkUrl" label={t('album.artworkUrlLabel')} error={errors.artworkUrl}>
        <Input
          id="artworkUrl"
          type="url"
          value={artworkUrl}
          onChange={(e) => setArtworkUrl(e.target.value)}
          disabled={isPending}
          placeholder={t('album.artworkUrlPlaceholder')}
          error={errors.artworkUrl}
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
