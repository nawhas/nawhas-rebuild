import type { Metadata } from 'next';
import { Inter, Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from 'next/font/google';
import dynamic from 'next/dynamic';
import './globals.css';
import { SiteHeader } from '@/components/layout/header';
import { PageLayout } from '@/components/layout/page-layout';
import { AudioProvider } from '@/components/providers/audio-provider';
import { PlayerPanels } from '@/components/player/PlayerPanels';

// Lazy-load PlayerBar so it is excluded from the initial page bundle.
// It is hidden until the user plays audio, so deferring it reduces First Load JS.
const PlayerBar = dynamic(
  () => import('@/components/player/PlayerBar').then((m) => m.PlayerBar),
  { ssr: false },
);
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

// Load Inter for primary UI text.
// display: 'optional' avoids layout shift (CLS = 0) — the browser uses the
// fallback if the font is not cached, and swaps silently once it is ready.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'optional',
});

// Load Noto Naskh Arabic for Arabic RTL content blocks.
const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-naskh-arabic',
  display: 'optional',
});

// Load Noto Nastaliq Urdu for Urdu RTL content blocks (Nastaliq calligraphic style).
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-nastaliq-urdu',
  display: 'optional',
});

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${notoNaskhArabic.variable} ${notoNastaliqUrdu.variable}`}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AudioProvider>
              <PageLayout header={<SiteHeader />} footer={<></>}>
                {children}
              </PageLayout>
              <PlayerPanels />
              <PlayerBar />
            </AudioProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
