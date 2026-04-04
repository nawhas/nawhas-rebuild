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
      <h2 id="danger-heading" className="text-base font-semibold text-red-700">
        {t('dangerZoneHeading')}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {t('dangerZoneDescription')}
      </p>

      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="mt-4 rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
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
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900">
              {t('deleteModalTitle')}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {t('deleteModalDescription')}
            </p>

            <form onSubmit={handleDelete} noValidate className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="delete-password"
                  className="block text-sm font-medium text-gray-700"
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
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {t('deleteCancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
