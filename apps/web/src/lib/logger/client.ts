/* eslint-disable no-console */
type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

const CLIENT_LOGGING_ENABLED = (process.env.NEXT_PUBLIC_LOGGING_ENABLED ?? 'true').toLowerCase() === 'true';

function write(level: ClientLogLevel, message: string, context?: Record<string, unknown>): void {
  if (!CLIENT_LOGGING_ENABLED) return;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };

  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

export const clientLogger = {
  debug(message: string, context?: Record<string, unknown>): void {
    write('debug', message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    write('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    write('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    write('error', message, context);
  },
};

