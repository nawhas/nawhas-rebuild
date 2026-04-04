import * as Sentry from '@sentry/nextjs';

// Only initialise Sentry in production — skip in development to avoid noise
// and to keep the dev feedback loop fast.
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,

    // @sentry/nextjs v10 auto-includes Replay in default integrations.
    // Replay adds ~50 kB gz to the initial client bundle but we do not use
    // session recording (replaysSessionSampleRate: 0). Explicitly remove it
    // to keep the First Load JS below the 200 kB budget.
    integrations: (integrations) =>
      integrations.filter((integration) => integration.name !== 'Replay'),
  });
}
