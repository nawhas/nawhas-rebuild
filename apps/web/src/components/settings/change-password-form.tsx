'use client';

import { useState } from 'react';
import { changePassword } from '@/server/actions/account';

export function ChangePasswordForm(): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const err = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    }
  }

  return (
    <section aria-labelledby="password-heading">
      <h2 id="password-heading" className="text-base font-semibold text-gray-900">
        Password
      </h2>

      <form onSubmit={handleSubmit} noValidate className="mt-4 max-w-sm space-y-3">
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={loading}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-gray-500">Minimum 8 characters.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Password updated successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !currentPassword || !newPassword}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </section>
  );
}
