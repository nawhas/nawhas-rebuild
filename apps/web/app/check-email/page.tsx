import type { Metadata } from 'next';
import { CheckEmailCard } from '@/components/auth/check-email-card';
import { AuthPageShell } from '@/components/auth/auth-page-shell';

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

  return (
    <AuthPageShell>
      <CheckEmailCard {...(email ? { email } : {})} />
    </AuthPageShell>
  );
}
