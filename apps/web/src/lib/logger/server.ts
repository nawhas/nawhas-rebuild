/* eslint-disable no-console */
import { appendFile } from 'node:fs/promises';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogSink = 'console' | 'file';

interface LogContext {
  [key: string]: unknown;
}

interface LogRecord {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const LOGGING_ENABLED = (process.env.LOGGING_ENABLED ?? 'true').toLowerCase() === 'true';
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
const LOG_SINK = (process.env.LOG_SINK ?? 'console').toLowerCase() as LogSink;
const LOG_FILE_PATH = process.env.LOG_FILE_PATH ?? '/tmp/nawhas-web.log';

let hasWarnedInvalidLevel = false;
let hasWarnedInvalidSink = false;
let hasWarnedFileFallback = false;

function getActiveLevel(): LogLevel {
  if (LOG_LEVEL in LOG_LEVEL_ORDER) return LOG_LEVEL;
  if (!hasWarnedInvalidLevel) {
    hasWarnedInvalidLevel = true;
    console.warn(`[logger] Invalid LOG_LEVEL="${LOG_LEVEL}". Falling back to "info".`);
  }
  return 'info';
}

function getActiveSink(): LogSink {
  if (LOG_SINK === 'console' || LOG_SINK === 'file') return LOG_SINK;
  if (!hasWarnedInvalidSink) {
    hasWarnedInvalidSink = true;
    console.warn(`[logger] Invalid LOG_SINK="${LOG_SINK}". Falling back to "console".`);
  }
  return 'console';
}

function shouldLog(level: LogLevel): boolean {
  if (!LOGGING_ENABLED) return false;
  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[getActiveLevel()];
}

function normalizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const digest = (error as Error & { digest?: string }).digest;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(digest ? { digest } : {}),
      ...(error.cause ? { cause: String(error.cause) } : {}),
    };
  }
  return { value: error };
}

function serialize(record: LogRecord): string {
  return JSON.stringify(record);
}

async function writeRecord(record: LogRecord): Promise<void> {
  const sink = getActiveSink();
  const line = serialize(record);

  if (sink === 'file') {
    try {
      await appendFile(LOG_FILE_PATH, `${line}\n`, 'utf8');
      return;
    } catch (error) {
      if (!hasWarnedFileFallback) {
        hasWarnedFileFallback = true;
        console.warn(
          `[logger] Failed to write to LOG_FILE_PATH="${LOG_FILE_PATH}". Falling back to console.`,
          normalizeError(error),
        );
      }
    }
  }

  if (record.level === 'debug' || record.level === 'info') {
    console.log(line);
  } else if (record.level === 'warn') {
    console.warn(line);
  } else {
    console.error(line);
  }
}

async function log(level: LogLevel, message: string, context?: LogContext): Promise<void> {
  if (!shouldLog(level)) return;
  await writeRecord({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  });
}

export const serverLogger = {
  debug(message: string, context?: LogContext): Promise<void> {
    return log('debug', message, context);
  },
  info(message: string, context?: LogContext): Promise<void> {
    return log('info', message, context);
  },
  warn(message: string, context?: LogContext): Promise<void> {
    return log('warn', message, context);
  },
  error(message: string, error?: unknown, context?: LogContext): Promise<void> {
    return log('error', message, {
      ...(context ?? {}),
      ...(error !== undefined ? { error: normalizeError(error) } : {}),
    });
  },
  isEnabled(): boolean {
    return LOGGING_ENABLED;
  },
};

