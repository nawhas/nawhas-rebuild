import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nawhas',
  description: 'A comprehensive digital library of nawha recitations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
