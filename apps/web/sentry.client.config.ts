import * as Sentry from '@sentry/nextjs';

// Only initialise Sentry in production — skip in development to avoid noise
// and to keep the dev feedback loop fast.
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,

    // Capture replays only for sessions where an error occurred
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
