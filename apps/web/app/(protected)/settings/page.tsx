import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { Container } from '@/components/layout/container';
import { ChangeEmailForm } from '@/components/settings/change-email-form';
import { ChangePasswordForm } from '@/components/settings/change-password-form';
import { NotificationsSection } from '@/components/settings/notifications-section';
import { DeleteAccountSection } from '@/components/settings/delete-account-section';
import { buildMetadata } from '@/lib/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Account Settings',
  description: 'Manage your account email, password, and preferences.',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const reqHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: reqHeaders });

  // Session guaranteed by (protected) layout.
  const user = sessionData!.user;

  return (
    <main id="main-content" className="py-10">
      <Container>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your email, password, and preferences.</p>
        </header>

        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {/* Email */}
          <div className="px-6 py-8">
            <ChangeEmailForm currentEmail={user.email} />
          </div>

          {/* Password */}
          <div className="px-6 py-8">
            <ChangePasswordForm />
          </div>

          {/* Notifications */}
          <div className="px-6 py-8">
            <NotificationsSection />
          </div>

          {/* Danger Zone */}
          <div className="px-6 py-8">
            <DeleteAccountSection />
          </div>
        </div>
      </Container>
    </main>
  );
}
