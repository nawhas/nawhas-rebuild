import * as Sentry from '@sentry/nextjs';

// Only initialise Sentry in production — skip in development to avoid noise
// and to keep the dev feedback loop fast.
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Lower sample rate for edge — keep costs in check
    tracesSampleRate: 0.05,
  });
}
