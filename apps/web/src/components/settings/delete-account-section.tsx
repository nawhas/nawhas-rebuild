'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
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
      <h2 id="danger-heading" className="text-base font-semibold text-destructive">
        {t('dangerZoneHeading')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('dangerZoneDescription')}
      </p>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="mt-4 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
            {t('deleteMyAccount')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteModalTitle')}</DialogTitle>
            <DialogDescription>{t('deleteModalDescription')}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDelete} noValidate className="space-y-3">
            <div>
              <label
                htmlFor="delete-password"
                className="block text-sm font-medium text-foreground"
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
                className="mt-1"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={loading}>
                  {t('deleteCancel')}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={loading || !password}
              >
                {loading ? t('deleteSubmitting') : t('deleteSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
