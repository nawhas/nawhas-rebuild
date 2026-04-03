import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}): Promise<React.JSX.Element> {
  const { callbackUrl } = await searchParams;
  return <LoginForm {...(callbackUrl ? { callbackUrl } : {})} />;
}
