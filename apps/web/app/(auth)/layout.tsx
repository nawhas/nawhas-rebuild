import { AuthPageShell } from '@/components/auth/auth-page-shell';

export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AuthPageShell>{children}</AuthPageShell>;
}
