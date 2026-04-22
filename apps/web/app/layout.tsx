import type { Metadata } from 'next';
import {
  Inter,
  Bellefair,
  Roboto_Slab,
  Roboto_Mono,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
} from 'next/font/google';
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

// Load Inter for primary UI text.
// display: 'optional' avoids layout shift (CLS = 0) — the browser uses the
// fallback if the font is not cached, and swaps silently once it is ready.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'optional',
});

// Load Bellefair for display/serif accents (--font-serif token).
const bellefair = Bellefair({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-bellefair',
  display: 'optional',
});

// Load Roboto Slab for body/slab typography (--font-slab token).
const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-roboto-slab',
  display: 'optional',
});

// Load Roboto Mono for monospace/metadata (--font-mono token).
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-mono',
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
  setDefaultRequestLocale();
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${bellefair.variable} ${robotoSlab.variable} ${robotoMono.variable} ${notoNaskhArabic.variable} ${notoNastaliqUrdu.variable}`}
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
