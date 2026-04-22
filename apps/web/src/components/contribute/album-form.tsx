'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createAlbumSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  reciterId: z.uuid('Must be a valid reciter ID (UUID)'),
  slug: z.string().min(1).optional().or(z.literal('')),
  year: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d{4}$/.test(v) && parseInt(v) >= 1900 && parseInt(v) <= new Date().getFullYear()),
      'Must be a 4-digit year',
    ),
  artworkUrl: z.url('Must be a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;
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
          placeholder="e.g. Shajar-e-Tooba"
          error={errors.title}
        />
      </FormField>

      <FormField
        id="reciterId"
        label="Reciter ID"
        required
        error={errors.reciterId}
        hint="The UUID of the reciter this album belongs to."
      >
        <Input
          id="reciterId"
          type="text"
          value={reciterId}
          onChange={(e) => setReciterId(e.target.value)}
          disabled={isPending}
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
          error={errors.reciterId}
        />
      </FormField>

      <FormField id="slug" label="Slug" error={errors.slug} hint="Leave blank to auto-generate.">
        <Input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isPending}
          placeholder="e.g. shajar-e-tooba"
          error={errors.slug}
        />
      </FormField>

      <FormField id="year" label="Year" error={errors.year}>
        <Input
          id="year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={isPending}
          placeholder="e.g. 2010"
          min={1900}
          max={new Date().getFullYear()}
          error={errors.year}
        />
      </FormField>

      <FormField id="artworkUrl" label="Artwork URL" error={errors.artworkUrl}>
        <Input
          id="artworkUrl"
          type="url"
          value={artworkUrl}
          onChange={(e) => setArtworkUrl(e.target.value)}
          disabled={isPending}
          placeholder="https://..."
          error={errors.artworkUrl}
        />
      </FormField>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">{serverError}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Submitting…' : 'Submit for review'}
      </Button>
    </form>
  );
}
