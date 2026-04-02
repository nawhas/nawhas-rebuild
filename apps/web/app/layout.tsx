import type { Metadata } from 'next';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nawhas.com';
const DESCRIPTION = 'A comprehensive digital library of nawha recitations.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Nawhas',
    template: '%s | Nawhas',
  },
  description: DESCRIPTION,
  openGraph: {
    siteName: 'Nawhas',
    title: 'Nawhas',
    description: DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nawhas',
    description: DESCRIPTION,
  },
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
