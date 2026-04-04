import * as Sentry from '@sentry/nextjs';

// Only initialise Sentry in production — skip in development to avoid noise
// and to keep the dev feedback loop fast.
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
  });
}
