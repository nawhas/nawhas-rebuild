'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@nawhas/ui/components/dialog';
import { Input } from '@nawhas/ui/components/input';
import { signOut } from '@/lib/auth-client';
import { deleteAccount } from '@/server/actions/account';

export function DeleteAccountSection(): React.JSX.Element {
  const t = useTranslations('settings');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      setPassword('');
      setError(null);
    }
  }

  async function handleDelete(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err = await deleteAccount(password);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    // Account deleted — sign out and redirect home.
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <section aria-labelledby="danger-heading">
      <h2 id="danger-heading" className="font-serif text-2xl font-medium text-[var(--text)]">
        {t('dangerZoneHeading')}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        {t('dangerZoneDescription')}
      </p>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-4 rounded-[8px] border border-[var(--color-error-500)]/40 bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--color-error-500)] transition-colors hover:bg-[var(--color-error-600)] hover:text-white hover:border-[var(--color-error-600)] focus-visible:outline-2 focus-visible:outline-[var(--color-error-500)] focus-visible:outline-offset-2"
          >
            {t('deleteMyAccount')}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteModalTitle')}</DialogTitle>
            <DialogDescription>{t('deleteModalDescription')}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDelete} noValidate className="space-y-6">
            <div>
              <label
                htmlFor="delete-password"
                className="block text-[13px] font-medium text-[var(--text-dim)] mb-2"
              >
                {t('deletePasswordLabel')}
              </label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 disabled:opacity-50"
              />
            </div>

            {error && (
              <p role="alert" className="text-[13px] text-[var(--color-error-500)] mt-2">
                {error}
              </p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="rounded-[8px] bg-[var(--input-bg)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text)] hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50"
                >
                  {t('deleteCancel')}
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={loading || !password}
                aria-busy={loading || undefined}
                className="rounded-[8px] bg-[var(--color-error-600)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-error-700)] focus-visible:outline-2 focus-visible:outline-[var(--color-error-500)] focus-visible:outline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('deleteSubmitting') : t('deleteSubmit')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
