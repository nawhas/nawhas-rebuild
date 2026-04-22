'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@nawhas/ui/components/button';
import { createReciterSubmission } from '@/server/actions/submission';
import { FormField, Input } from '@/components/contribute/form-field';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).optional().or(z.literal('')),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

interface ReciterFormProps {
  /** For edit mode. */
  targetId?: string;
  initialValues?: {
    name: string;
    slug?: string;
  };
  action: 'create' | 'edit';
  /** If provided, used for resubmit (update) instead of create. */
  submissionId?: string;
  onSuccess?: () => void;
}

/**
 * Submission form for reciter create/edit.
 */
export function ReciterForm({
  targetId,
  initialValues,
  action,
  onSuccess,
}: ReciterFormProps): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [slug, setSlug] = useState(initialValues?.slug ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate(): boolean {
    const result = schema.safeParse({ name, slug: slug || undefined });
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
        await createReciterSubmission(
          action,
          { name, ...(slug ? { slug } : {}) },
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
      <FormField id="name" label="Name" required error={errors.name}>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="e.g. Nadeem Sarwar"
          error={errors.name}
        />
      </FormField>

      <FormField
        id="slug"
        label="Slug"
        error={errors.slug}
        hint="URL-friendly identifier. Leave blank to auto-generate."
      >
        <Input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={isPending}
          placeholder="e.g. nadeem-sarwar"
          error={errors.slug}
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
