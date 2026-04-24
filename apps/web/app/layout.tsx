import type { Metadata } from 'next';
import { Inter, Fraunces, Noto_Nastaliq_Urdu } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SiteHeaderDynamic } from '@/components/layout/header';
import { PageLayout } from '@/components/layout/page-layout';
import { AudioProvider } from '@/components/providers/audio-provider';
// PlayerBarLazy is a Client Component wrapper that uses next/dynamic({ ssr: false }).
// Using the wrapper here (a Server Component) avoids the "ssr:false in Server Component"
// build error while still deferring PlayerBar from the initial bundle.
import { PlayerBarLazy } from '@/components/player/PlayerBarLazy';
import { PlayerPanels } from '@/components/player/PlayerPanels';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { setDefaultRequestLocale } from '@/i18n/request-locale';

// Inter — primary UI sans (--font-sans token).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Fraunces — display serif for headings, branding (--font-serif / --font-fraunces).
// optical-size axis lets headings render in the larger optical-size variant
// (more contrast, finer detail) while body uses the smaller (sturdier).
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
});

// Noto Nastaliq Urdu — Urdu RTL content (Nastaliq calligraphic style).
// Loaded only because the [lang="ur"] selector targets it on lyric blocks.
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-nastaliq-urdu',
  display: 'swap',
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
  setDefaultRequestLocale();
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${notoNastaliqUrdu.variable}`}
    >
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AudioProvider>
              <PageLayout header={<SiteHeaderDynamic />} footer={<></>}>
                {children}
              </PageLayout>
              <PlayerPanels />
              <PlayerBarLazy />
            </AudioProvider>
          </ThemeProvider>
          <Toaster richColors closeButton position="bottom-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
