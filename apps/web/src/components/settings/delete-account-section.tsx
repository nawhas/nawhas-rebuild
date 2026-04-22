'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from '@/lib/auth-client';
import { deleteAccount } from '@/server/actions/account';

export function DeleteAccountSection(): React.JSX.Element {
  const t = useTranslations('settings');
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  function handleCancel(): void {
    setShowModal(false);
    setPassword('');
    setError(null);
  }

  return (
    <section aria-labelledby="danger-heading">
      <h2 id="danger-heading" className="text-base font-semibold text-destructive">
        {t('dangerZoneHeading')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('dangerZoneDescription')}
      </p>

      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-4 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background"
      >
        {t('deleteMyAccount')}
      </button>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h3 id="delete-modal-title" className="text-lg font-semibold text-foreground">
              {t('deleteModalTitle')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('deleteModalDescription')}
            </p>

            <form onSubmit={handleDelete} noValidate className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="delete-password"
                  className="block text-sm font-medium text-foreground"
                >
                  {t('deletePasswordLabel')}
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
                >
                  {t('deleteCancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? t('deleteSubmitting') : t('deleteSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
