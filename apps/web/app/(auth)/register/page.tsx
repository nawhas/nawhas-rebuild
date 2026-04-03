import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { getEnabledSocialProviders } from '@/lib/social-providers';

export const metadata: Metadata = {
  title: 'Create account',
};

export default function RegisterPage(): React.JSX.Element {
  const enabledProviders = getEnabledSocialProviders();
  return <RegisterForm enabledProviders={enabledProviders} />;
}
