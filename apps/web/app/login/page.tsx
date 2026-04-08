import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { getEnabledSocialProviders } from '@/lib/social-providers';

// Dynamic rendering required for searchParams access
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}): Promise<React.JSX.Element> {
  const { callbackUrl } = await searchParams;
  const enabledProviders = getEnabledSocialProviders();

  return (
    <AuthPageShell>
      <LoginForm
        {...(callbackUrl ? { callbackUrl } : {})}
        enabledProviders={enabledProviders}
      />
    </AuthPageShell>
  );
}
