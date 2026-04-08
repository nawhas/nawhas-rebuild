import type { Metadata } from 'next';
import { CheckEmailCard } from '@/components/auth/check-email-card';

// Dynamic rendering required for searchParams access
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Check your email',
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}): Promise<React.JSX.Element> {
  const { email } = await searchParams;
  return <CheckEmailCard {...(email ? { email } : {})} />;
}
