import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { getEnabledSocialProviders } from '@/lib/social-providers';

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
    <LoginForm
      {...(callbackUrl ? { callbackUrl } : {})}
      enabledProviders={enabledProviders}
    />
  );
}
