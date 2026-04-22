'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@nawhas/ui/components/button';
import { signIn } from '@/lib/auth-client';
import type { EnabledSocialProvider } from '@/lib/social-providers';

interface SocialButtonsProps {
  providers: EnabledSocialProvider[];
  callbackUrl?: string | undefined;
}

function GoogleIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon(): React.JSX.Element {
  return (
    <svg width="17" height="20" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 33.5 0 68.7 1.3 98.4 27.4 26.6 23.8 51.3 32.9 80.4 32.9 27.5 0 57.2-10.3 81.7-27.4 6.5-4.5 47.8-38.2 105-38.2 4.5 0 8.4.6 12.3 1.3zm-188-117.8c0 36.5-13.5 70.7-37.4 96.1-27.4 30.3-71.9 56.3-116.4 56.3-1.9 0-3.2 0-5.1-.6-.6-2.6-.6-5.8-.6-8.4 0-34.6 15.5-68.7 38.9-93.5 11.6-12.9 29-24.5 51.9-35.5 22.9-10.3 44.2-16.8 64.8-16.8 1.9 0 3.8 0 5.8.6.6 2.5.6 5.2.6 7.8 0-5.2-.6 0 0 0z" />
    </svg>
  );
}

function FacebookIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function MicrosoftIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<EnabledSocialProvider, React.JSX.Element> = {
  google: <GoogleIcon />,
  apple: <AppleIcon />,
  facebook: <FacebookIcon />,
  microsoft: <MicrosoftIcon />,
};

const PROVIDER_LABEL_KEYS: Record<EnabledSocialProvider, string> = {
  google: 'continueWithGoogle',
  apple: 'signInWithApple',
  facebook: 'continueWithFacebook',
  microsoft: 'continueWithMicrosoft',
};

const PROVIDER_VARIANT: Record<EnabledSocialProvider, 'outline'> = {
  google: 'outline',
  apple: 'outline',
  facebook: 'outline',
  microsoft: 'outline',
};

const PROVIDER_CLASS: Record<EnabledSocialProvider, string> = {
  google: 'w-full gap-3',
  apple: 'w-full gap-3 border-black bg-black text-white hover:bg-black/90 hover:text-white',
  facebook: 'w-full gap-3',
  microsoft: 'w-full gap-3',
};

export function SocialButtons({ providers, callbackUrl }: SocialButtonsProps): React.JSX.Element | null {
  const t = useTranslations('auth.social');
  const [loadingProvider, setLoadingProvider] = useState<EnabledSocialProvider | null>(null);

  if (providers.length === 0) return null;

  async function handleSocialSignIn(provider: EnabledSocialProvider): Promise<void> {
    setLoadingProvider(provider);
    await signIn.social({
      provider,
      callbackURL: callbackUrl ?? '/',
    });
    // Better Auth redirects on success; only reaches here on error
    setLoadingProvider(null);
  }

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-3 text-muted-foreground">{t('orContinueWith')}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {providers.map((provider) => {
          const labelKey = PROVIDER_LABEL_KEYS[provider];
          const label = t(labelKey as Parameters<typeof t>[0]);
          const isLoading = loadingProvider === provider;
          return (
            <Button
              key={provider}
              type="button"
              variant={PROVIDER_VARIANT[provider]}
              onClick={() => handleSocialSignIn(provider)}
              disabled={loadingProvider !== null}
              aria-busy={isLoading ? true : undefined}
              className={PROVIDER_CLASS[provider]}
              aria-label={label}
            >
              {PROVIDER_ICONS[provider]}
              {isLoading ? t('redirecting') : label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
